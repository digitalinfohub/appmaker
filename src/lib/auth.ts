import { cookies } from "next/headers";
import { getDb, type Env } from "./db";
import { getEnv } from "./db";

const COOKIE = "am_session";
const SESSION_DAYS = 30;
const ITERATIONS = 150_000;

const encoder = new TextEncoder();
const bs = (value: Uint8Array | ArrayBuffer): BufferSource => value as unknown as BufferSource;

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(passcode: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", bs(encoder.encode(passcode)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: bs(salt), iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return toB64(new Uint8Array(bits));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", bs(fromB64(secret)), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, bs(encoder.encode(payload)));
  return toB64(new Uint8Array(sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type StudioRow = {
  id: number;
  passcode_hash: string;
  passcode_salt: string;
  secret: string;
  created_at: string;
};

export async function getStudio(): Promise<StudioRow | null> {
  const db = await getDb();
  return db.prepare(`SELECT * FROM studio WHERE id = 1`).first<StudioRow>();
}

export class SetupRequired extends Error {}

async function currentSecret(): Promise<string | null> {
  const row = await getStudio();
  return row?.secret ?? null;
}

export async function createStudio(passcode: string): Promise<void> {
  if (passcode.trim().length < 6) throw new Error("Use at least 6 characters");
  const db = await getDb();
  const existing = await db.prepare(`SELECT id FROM studio WHERE id = 1`).first();
  if (existing) throw new Error("Studio is already set up");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const hash = await pbkdf2(passcode, salt);
  await db
    .prepare(
      `INSERT INTO studio (id, passcode_hash, passcode_salt, secret, created_at) VALUES (1, ?, ?, ?, ?)`,
    )
    .bind(hash, toB64(salt), toB64(secret), new Date().toISOString())
    .run();
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  const row = await getStudio();
  if (!row) return false;
  const hash = await pbkdf2(passcode, fromB64(row.passcode_salt));
  return timingSafeEqual(hash, row.passcode_hash);
}

export async function startSession(): Promise<void> {
  const secret = await currentSecret();
  if (!secret) return;
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `v1.${exp}`;
  const sig = await sign(secret, payload);
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

async function verifyToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, exp, sig] = parts;
  if (version !== "v1") return false;
  const expiry = Number(exp);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  const expected = await sign(secret, `v1.${exp}`);
  return timingSafeEqual(sig, expected);
}

export async function isAuthed(): Promise<boolean> {
  const secret = await currentSecret();
  if (!secret) return false;
  const store = await cookies();
  return verifyToken(store.get(COOKIE)?.value, secret);
}

/** Returns a 401 Response when the request is not authenticated. */
export async function requireAuth(request?: Request): Promise<Response | null> {
  const authed = await isAuthed();
  if (!authed) {
    return new Response(JSON.stringify({ error: "Not signed in" }), {
      status: 401,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
  if (request && !isSameOrigin(request)) {
    return new Response(JSON.stringify({ error: "Cross-origin request blocked" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin fetches from the app may omit Origin for GETs
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function studioStatus(env?: Env) {
  void env;
  const row = await getStudio();
  return {
    configured: Boolean(row),
    authed: row ? await isAuthed() : false,
  };
}
