/**
 * Web Push for Cloudflare Workers.
 * Encryption follows RFC 8291 (aes128gcm) and signing follows RFC 8292 (VAPID).
 * Uses WebCrypto only — no Node APIs, no dependencies.
 */

export type PushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type VapidKeys = {
  publicKey: string;
  privateJwk: JsonWebKey;
  subject: string;
};

const encoder = new TextEncoder();

// Newer TypeScript lib types distinguish ArrayBuffer from SharedArrayBuffer in
// BufferSource, so normalise typed arrays at the WebCrypto boundary.
const bs = (value: Uint8Array | ArrayBuffer): BufferSource => value as unknown as BufferSource;

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, false);
  return out;
}

export async function generateVapidKeys(): Promise<VapidKeys> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const publicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { publicKey: b64urlEncode(publicRaw), privateJwk, subject: "mailto:studio@appmaker.local" };
}

async function importSigningKey(keys: VapidKeys): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", keys.privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

export async function vapidHeaders(
  endpoint: string,
  keys: VapidKeys,
  now = Date.now(),
): Promise<Record<string, string>> {
  const url = new URL(endpoint);
  const header = b64urlEncode(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64urlEncode(
    encoder.encode(
      JSON.stringify({
        aud: url.origin,
        exp: Math.floor(now / 1000) + 12 * 60 * 60,
        sub: keys.subject || "mailto:studio@appmaker.local",
      }),
    ),
  );
  const signingInput = encoder.encode(`${header}.${payload}`);
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, await importSigningKey(keys), bs(signingInput)),
  );
  const jwt = `${header}.${payload}.${b64urlEncode(signature)}`;
  return {
    Authorization: `vapid t=${jwt}, k=${keys.publicKey}`,
    "Crypto-Key": `p256ecdsa=${keys.publicKey}`,
  };
}

/** RFC 8291 payload encryption (aes128gcm content coding). */
export async function encryptPayload(
  subscription: PushSubscription,
  plaintext: Uint8Array,
  options: { salt?: Uint8Array; serverKeys?: CryptoKeyPair } = {},
): Promise<Uint8Array> {
  const uaPublic = b64urlDecode(subscription.keys.p256dh);
  const authSecret = b64urlDecode(subscription.keys.auth);

  const serverKeys =
    options.serverKeys ??
    ((await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ])) as CryptoKeyPair);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));

  const uaKey = await crypto.subtle.importKey("raw", bs(uaPublic), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, serverKeys.privateKey, 256),
  );

  // RFC 8291 §3.2: IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public)
  const ikmInfo = concat(encoder.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikmRaw = await crypto.subtle.importKey("raw", bs(sharedSecret), "HKDF", false, ["deriveBits"]);
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: bs(authSecret), info: bs(ikmInfo) },
      ikmRaw,
      256,
    ),
  );

  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const ikmKey = await crypto.subtle.importKey("raw", bs(ikm), "HKDF", false, ["deriveBits"]);
  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: bs(salt),
        info: bs(encoder.encode("Content-Encoding: aes128gcm\0")),
      },
      ikmKey,
      128,
    ),
  );
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: bs(salt), info: bs(encoder.encode("Content-Encoding: nonce\0")) },
      ikmKey,
      96,
    ),
  );

  // Single (and final) record: payload || 0x02 padding delimiter.
  const record = concat(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", bs(cek), { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: bs(nonce) }, aesKey, bs(record)),
  );

  const header = concat(salt, u32(4096), new Uint8Array([asPublic.length]), asPublic);
  return concat(header, ciphertext);
}

export type SendResult =
  | { ok: true; status: number }
  | { ok: false; status: number; expired: boolean; error: string };

export async function sendPush(
  subscription: PushSubscription,
  payload: unknown,
  keys: VapidKeys,
  ttl = 86400,
): Promise<SendResult> {
  const body = await encryptPayload(subscription, encoder.encode(JSON.stringify(payload)));
  const auth = await vapidHeaders(subscription.endpoint, keys);
  let response: Response;
  try {
    response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        ...auth,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(ttl),
        Urgency: "normal",
      },
      body: body as unknown as BodyInit,
    });
  } catch (error) {
    return { ok: false, status: 0, expired: false, error: (error as Error).message || "network error" };
  }
  if (response.ok) return { ok: true, status: response.status };
  const expired = response.status === 404 || response.status === 410;
  let detail = "";
  try {
    detail = (await response.text()).slice(0, 300);
  } catch {
    /* ignore */
  }
  return { ok: false, status: response.status, expired, error: `HTTP ${response.status}${detail ? `: ${detail}` : ""}` };
}

export const pushTestUtils = { b64urlDecode, b64urlEncode, concat, u32 };
