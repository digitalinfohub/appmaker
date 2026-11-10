import { getDb, getFiles, json } from "./db";
import type { AppConfig, AppRecord } from "./types";
import { sanitizeConfig } from "./config";
import { slugify } from "./defaults";

export async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const db = await getDb();
  const cleaned = slugify(base).slice(0, 40) || "app";
  let candidate = cleaned;
  let n = 2;
  for (let i = 0; i < 40; i++) {
    const row = await db.prepare(`SELECT id FROM apps WHERE slug = ?`).bind(candidate).first<{ id: string }>();
    if (!row || row.id === ignoreId) return candidate;
    candidate = `${cleaned}-${n++}`;
  }
  return `${cleaned}-${Date.now().toString(36)}`;
}

export async function readJson<T = any>(request: Request): Promise<T> {
  try {
    const text = await request.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export function siteOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto || url.protocol.replace(":", "")}://${host}`;
}

export type DbApp = {
  id: string;
  slug: string;
  name: string;
  config: string;
  status: string;
  version: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToApp(row: DbApp): AppRecord {
  let config: AppConfig;
  try {
    config = sanitizeConfig(JSON.parse(row.config), row.name);
  } catch {
    config = sanitizeConfig({}, row.name);
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    config,
    status: row.status === "published" ? "published" : "draft",
    version: row.version,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadApp(id: string): Promise<{ row: DbApp; app: AppRecord } | null> {
  const db = await getDb();
  const row = await db.prepare(`SELECT * FROM apps WHERE id = ?`).bind(id).first<DbApp>();
  if (!row) return null;
  return { row, app: rowToApp(row) };
}

export async function requireApp(id: string): Promise<{ row: DbApp; app: AppRecord } | Response> {
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);
  return found;
}

export async function deletePrefix(files: R2Bucket, prefix: string): Promise<void> {
  let cursor: string | undefined;
  for (let i = 0; i < 20; i++) {
    const listed = await files.list({ prefix, cursor, limit: 500 });
    if (listed.objects.length) {
      await files.delete(listed.objects.map((o) => o.key));
    }
    if (listed.truncated) cursor = listed.cursor;
    else break;
  }
}

export async function copyAssetToBundle(
  files: R2Bucket,
  assetId: string,
  path: string,
  contentType: string,
): Promise<number | null> {
  const db = await getDb();
  const row = await db
    .prepare(`SELECT r2_key, content_type FROM assets WHERE id = ?`)
    .bind(assetId)
    .first<{ r2_key: string; content_type: string }>();
  if (!row) return null;
  const object = await files.get(row.r2_key);
  if (!object) return null;
  const bytes = await object.arrayBuffer();
  await files.put(path, bytes, {
    httpMetadata: { contentType: row.content_type || contentType, cacheControl: "public, max-age=31536000, immutable" },
  });
  return bytes.byteLength;
}
