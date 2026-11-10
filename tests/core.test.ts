import { describe, expect, test } from "bun:test";
import { encryptPayload, generateVapidKeys, vapidHeaders, pushTestUtils } from "../src/lib/push";
import { makeZip } from "../src/lib/zip";
import { sanitizeConfig } from "../src/lib/config";
import { buildSite } from "../src/lib/siteFiles";
import { baseConfig } from "../src/lib/defaults";
import { renderBlock } from "../src/lib/render";
import { createBlock } from "../src/lib/blocks";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const bs = (value: Uint8Array): BufferSource => value as unknown as BufferSource;

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bits: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", bs(ikm), "HKDF", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: bs(salt), info: bs(info) }, key, bits),
  );
}

/** Independent implementation of RFC 8188 decryption, used to prove interop. */
async function decryptPush(
  body: Uint8Array,
  uaPrivateKey: CryptoKey,
  uaPublicRaw: Uint8Array,
  authSecret: Uint8Array,
) {
  const salt = body.slice(0, 16);
  const recordSize = new DataView(body.buffer, body.byteOffset + 16, 4).getUint32(0);
  const idLength = body[20];
  const serverPublic = body.slice(21, 21 + idLength);
  const ciphertext = body.slice(21 + idLength);

  expect(recordSize).toBe(4096);
  expect(idLength).toBe(65);
  expect(serverPublic[0]).toBe(4);

  const serverKey = await crypto.subtle.importKey(
    "raw",
    bs(serverPublic),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: serverKey }, uaPrivateKey, 256),
  );

  const info = pushTestUtils.concat(encoder.encode("WebPush: info\0"), uaPublicRaw, serverPublic);
  const ikm = await hkdf(authSecret, shared, info, 256);
  const cek = await hkdf(salt, ikm, encoder.encode("Content-Encoding: aes128gcm\0"), 128);
  const nonce = await hkdf(salt, ikm, encoder.encode("Content-Encoding: nonce\0"), 96);

  const aesKey = await crypto.subtle.importKey("raw", bs(cek), { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: bs(nonce) }, aesKey, bs(ciphertext)),
  );

  expect(plain[plain.length - 1]).toBe(2); // final-record delimiter
  return plain.slice(0, plain.length - 1);
}

describe("web push (RFC 8291)", () => {
  test("payload round-trips through an independent RFC 8188 decryptor", async () => {
    const uaKeys = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ])) as CryptoKeyPair;
    const uaPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", uaKeys.publicKey));
    const authSecret = crypto.getRandomValues(new Uint8Array(16));

    const subscription = {
      endpoint: "https://push.example.com/abc",
      keys: {
        p256dh: pushTestUtils.b64urlEncode(uaPublicRaw),
        auth: pushTestUtils.b64urlEncode(authSecret),
      },
    };

    const plaintext = encoder.encode(JSON.stringify({ title: "Fresh bakes", body: "Out of the oven" }));
    const body = await encryptPayload(subscription, plaintext);

    const decrypted = await decryptPush(body, uaKeys.privateKey, uaPublicRaw, authSecret);
    expect(decoder.decode(decrypted)).toBe(decoder.decode(plaintext));
  });

  test("VAPID authentication header is a valid, signed ES256 JWT", async () => {
    const keys = await generateVapidKeys();
    const endpoint = "https://fcm.googleapis.com/fcm/send/abc123";
    const headers = await vapidHeaders(endpoint, keys);

    expect(headers.Authorization.startsWith("vapid t=")).toBe(true);
    const jwt = headers.Authorization.split("t=")[1].split(",")[0].trim();
    const [rawHeader, rawPayload, signature] = jwt.split(".");
    expect(JSON.parse(decoder.decode(pushTestUtils.b64urlDecode(rawHeader)))).toEqual({ typ: "JWT", alg: "ES256" });

    const payload = JSON.parse(decoder.decode(pushTestUtils.b64urlDecode(rawPayload)));
    expect(payload.aud).toBe("https://fcm.googleapis.com");
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(payload.sub.startsWith("mailto:")).toBe(true);

    const publicKey = await crypto.subtle.importKey(
      "raw",
      bs(pushTestUtils.b64urlDecode(keys.publicKey)),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      bs(pushTestUtils.b64urlDecode(signature)),
      bs(encoder.encode(`${rawHeader}.${rawPayload}`)),
    );
    expect(valid).toBe(true);
  });
});

describe("zip export", () => {
  test("produces a readable archive with correct names, data and CRCs", () => {
    const files = [
      { name: "index.html", data: encoder.encode("<h1>Hello</h1>") },
      { name: "icons/icon-192.png", data: new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]) },
      { name: "media/photo.jpg", data: encoder.encode("binary-ish") },
    ];
    const zip = makeZip(files);

    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    const eocd = zip.length - 22;
    expect(view.getUint32(eocd, true)).toBe(0x06054b50);
    const count = view.getUint16(eocd + 10, true);
    expect(count).toBe(files.length);
    const centralOffset = view.getUint32(eocd + 16, true);

    let cursor = centralOffset;
    const seen: string[] = [];
    for (let i = 0; i < count; i++) {
      expect(view.getUint32(cursor, true)).toBe(0x02014b50);
      const crc = view.getUint32(cursor + 16, true);
      const size = view.getUint32(cursor + 20, true);
      const nameLength = view.getUint16(cursor + 28, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const name = decoder.decode(zip.slice(cursor + 46, cursor + 46 + nameLength));
      seen.push(name);

      expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtra = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtra;
      const data = zip.slice(dataStart, dataStart + size);
      const original = files.find((f) => f.name === name)!;
      expect(Array.from(data)).toEqual(Array.from(original.data));
      expect(crc).toBe(require("../src/lib/zip").crc32(original.data));

      cursor += 46 + nameLength + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
    }
    expect(seen).toEqual(files.map((f) => f.name));
  });
});

describe("config sanitising", () => {
  test("strips unknown blocks, clamps pages, normalises colours and slugs", () => {
    const config = sanitizeConfig(
      {
        name: "x".repeat(120),
        theme: { primary: "javascript:alert(1)", radius: 500, font: "nonsense" },
        branding: { icon: { id: "abc", name: "icon.png", type: "text/html" } },
        pages: Array.from({ length: 20 }, (_, i) => ({
          id: `p${i}`,
          name: "Menu",
          blocks: [
            { type: "hero", props: { title: "Hi", evil: "drop me" } },
            { type: "not-a-block", props: {} },
            { type: "text", props: { heading: "About" } },
          ],
        })),
      },
      "Fallback",
    );

    expect(config.name.length).toBeLessThanOrEqual(60);
    expect(config.theme.radius).toBe(40);
    expect(config.theme.font).toBe("sans");
    expect(config.theme.primary).toBe("#6d5efc");
    expect(config.branding.icon).toBeNull();
    expect(config.pages.length).toBe(12);
    expect(config.pages[0].blocks.length).toBe(2);
    expect(config.pages[0].blocks[0].props.evil).toBeUndefined();
    const slugs = config.pages.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(config.homePageId).toBe(config.pages[0].id);
  });

  test("never lets a page lose its home reference", () => {
    const config = sanitizeConfig({ pages: [{ name: "Only" }], homePageId: "ghost" }, "App");
    expect(config.homePageId).toBe(config.pages[0].id);
  });
});

describe("bundle generation", () => {
  const config = baseConfig("Harbour Coffee", "Coffee by the sea");

  test("emits a complete PWA file set", () => {
    const build = buildSite({
      config,
      appId: "app-1",
      slug: "harbour-coffee",
      publicUrl: "https://example.com/a/harbour-coffee/",
      apiBase: "https://example.com/api/public/apps/harbour-coffee",
      pushKey: "test-key",
      qrSvg: "<svg></svg>",
    });

    const paths = build.files.map((f) => f.path);
    expect(paths).toContain("index.html");
    expect(paths).toContain("manifest.webmanifest");
    expect(paths).toContain("sw.js");
    expect(paths).toContain("offline.html");

    const manifest = JSON.parse(build.files.find((f) => f.path === "manifest.webmanifest")!.body);
    expect(manifest.name).toBe("Harbour Coffee");
    expect(manifest.start_url).toBe("./");
    expect(manifest.scope).toBe("./");
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBe(config.theme.background);
    expect(manifest.icons.length).toBeGreaterThan(0);

    const sw = build.files.find((f) => f.path === "sw.js")!.body;
    expect(sw).toContain("addEventListener(\"push\"");
    expect(sw).toContain("showNotification");
    expect(sw).toContain('"./"');
    expect(sw).toContain("addEventListener(\"fetch\"");

    const html = build.files.find((f) => f.path === "index.html")!.body;
    expect(html).toContain("./manifest.webmanifest");
    expect(html).toContain("am-gate");
    expect(html).toContain("is-gated");
    expect(html).toContain("Harbour Coffee");
  });

  test("escapes user content and blocks javascript: links", () => {
    const block = createBlock("hero");
    block.props.title = '<script>alert("x")</script>';
    block.props.primaryLabel = "Go";
    block.props.primaryLink = "javascript:alert(1)";
    const html = renderBlock(block, config, {
      assetUrl: () => null,
      publicUrl: "",
      apiBase: "",
      appId: "a",
      slug: "s",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("javascript:");
  });

  test("keeps legacy single-page apps working", () => {
    const legacy = sanitizeConfig({ name: "Old", pages: [{ name: "Home", blocks: [{ type: "text", props: { heading: "Hi" } }] }] }, "Old");
    expect(legacy.pages.length).toBe(1);
    expect(legacy.pages[0].slug).toBe("home");
  });
});
