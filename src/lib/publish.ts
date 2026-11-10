import { buildSite } from "./siteFiles";
import { qrSvg } from "./qr";
import { getVapid } from "./db";
import { copyAssetToBundle, deletePrefix } from "./api";
import type { AppRecord } from "./types";

export type PublishResult = {
  files: number;
  bytes: number;
  url: string;
  publicUrl: string;
  warnings: string[];
  version: number;
};

export async function publishApp(options: {
  app: AppRecord;
  db: D1Database;
  files: R2Bucket;
  origin: string;
}): Promise<PublishResult> {
  const { app, db, files, origin } = options;
  const publicUrl = `${origin}/a/${app.slug}/`;
  const vapid = await getVapid(db);

  const build = buildSite({
    config: app.config,
    appId: app.id,
    slug: app.slug,
    publicUrl,
    apiBase: `${origin}/api/public/apps/${app.slug}`,
    pushKey: vapid.publicKey,
    qrSvg: qrSvg(publicUrl, 148),
  });

  await deletePrefix(files, `sites/${app.slug}/`);

  let bytes = 0;
  let count = 0;
  const warnings: string[] = [];
  const encoder = new TextEncoder();

  for (const file of build.files) {
    const body = encoder.encode(file.body);
    const isEntry = file.path === "index.html" || file.path === "sw.js" || file.path === "manifest.webmanifest";
    await files.put(`sites/${app.slug}/${file.path}`, body, {
      httpMetadata: {
        contentType: file.contentType,
        cacheControl: isEntry ? "no-cache, must-revalidate" : "public, max-age=31536000, immutable",
      },
    });
    bytes += body.byteLength;
    count++;
  }

  const seen = new Set<string>();
  for (const copy of build.copies) {
    if (seen.has(copy.path)) continue;
    seen.add(copy.path);
    const written = await copyAssetToBundle(files, copy.assetId, `sites/${app.slug}/${copy.path}`, copy.contentType);
    if (written == null) {
      warnings.push(`Missing image for ${copy.path}`);
      continue;
    }
    bytes += written;
    count++;
  }

  const now = new Date().toISOString();
  const version = app.version + 1;
  await db.batch([
    db
      .prepare(`UPDATE apps SET status = 'published', published_at = ?, updated_at = ?, version = ? WHERE id = ?`)
      .bind(now, now, version, app.id),
    db
      .prepare(
        `INSERT INTO publishes (app_id, files, bytes, published_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(app_id) DO UPDATE SET files = excluded.files, bytes = excluded.bytes, published_at = excluded.published_at`,
      )
      .bind(app.id, count, bytes, now),
  ]);

  return { files: count, bytes, url: `/a/${app.slug}/`, publicUrl, warnings, version };
}

export async function unpublishApp(app: AppRecord, db: D1Database, files: R2Bucket): Promise<void> {
  await deletePrefix(files, `sites/${app.slug}/`);
  await db.prepare(`UPDATE apps SET status = 'draft', updated_at = ? WHERE id = ?`).bind(new Date().toISOString(), app.id).run();
}
