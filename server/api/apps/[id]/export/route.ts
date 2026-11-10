import { requireAuth } from "@/lib/auth";
import { getDb, getFiles, json } from "@/lib/db";
import { loadApp, siteOrigin } from "@/lib/api";
import { buildSite } from "@/lib/siteFiles";
import { getVapid } from "@/lib/db";
import { qrSvg } from "@/lib/qr";
import { makeZip, type ZipEntry } from "@/lib/zip";

export const dynamic = "force-dynamic";

async function assetBytes(db: D1Database, files: R2Bucket, assetId: string): Promise<Uint8Array | null> {
  const row = await db.prepare(`SELECT r2_key FROM assets WHERE id = ?`).bind(assetId).first<{ r2_key: string }>();
  if (!row) return null;
  const object = await files.get(row.r2_key);
  if (!object) return null;
  return new Uint8Array(await object.arrayBuffer());
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id } = await params;
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);

  const db = await getDb();
  const files = await getFiles();
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [];

  if (found.app.status === "published") {
    const prefix = `sites/${found.row.slug}/`;
    const { objects } = await files.list({ prefix, limit: 1000 });
    for (const object of objects) {
      const file = await files.get(object.key);
      if (!file) continue;
      entries.push({
        name: object.key.slice(prefix.length),
        data: new Uint8Array(await file.arrayBuffer()),
      });
    }
  } else {
    const origin = siteOrigin(request);
    const publicUrl = `${origin}/a/${found.row.slug}/`;
    const vapid = await getVapid(db);
    const build = buildSite({
      config: found.app.config,
      appId: found.app.id,
      slug: found.row.slug,
      publicUrl,
      apiBase: `${origin}/api/public/apps/${found.row.slug}`,
      pushKey: vapid.publicKey,
      qrSvg: qrSvg(publicUrl, 148),
    });
    for (const file of build.files) {
      entries.push({ name: file.path, data: encoder.encode(file.body) });
    }
    const added = new Set<string>();
    for (const copy of build.copies) {
      if (added.has(copy.path)) continue;
      added.add(copy.path);
      const bytes = await assetBytes(db, files, copy.assetId);
      if (bytes) entries.push({ name: copy.path, data: bytes });
    }
  }

  if (!entries.length) return json({ error: "Nothing to export yet" }, 409);

  const zip = makeZip(entries);
  return new Response(zip as unknown as BodyInit, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${found.row.slug}.zip"`,
      "content-length": String(zip.byteLength),
      "cache-control": "no-store",
    },
  });
}
