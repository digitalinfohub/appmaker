import { getCloudflareContext } from "@opennextjs/cloudflare";
import { generateVapidKeys, type VapidKeys } from "./push";

export type Env = {
  DB: D1Database;
  FILES: R2Bucket;
  OWNER_PASSCODE?: string;
};

export async function getEnv(): Promise<Env> {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx?.env as unknown as Env | undefined;
  if (!env?.DB) throw new Error("Database binding DB is not available");
  return env;
}

export async function getDb(): Promise<D1Database> {
  const env = await getEnv();
  await ensureSchema(env.DB);
  return env.DB;
}

export async function getFiles(): Promise<R2Bucket> {
  const env = await getEnv();
  return env.FILES;
}

let schemaPromise: Promise<void> | null = null;

export async function ensureSchema(db: D1Database): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = runMigrations(db).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function runMigrations(db: D1Database): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS studio (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      passcode_hash TEXT NOT NULL,
      passcode_salt TEXT NOT NULL,
      secret TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      config TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      app_id TEXT,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      r2_key TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS push_subs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_push_subs_app ON push_subs (app_id)`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      url TEXT,
      icon TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      send_at TEXT NOT NULL,
      sent_at TEXT,
      recipients INTEGER NOT NULL DEFAULT 0,
      failures INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_app ON notifications (app_id, send_at)`,
    `CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      form_block TEXT NOT NULL,
      page TEXT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_submissions_app ON submissions (app_id, created_at)`,
    `CREATE TABLE IF NOT EXISTS publishes (
      app_id TEXT PRIMARY KEY,
      files INTEGER NOT NULL DEFAULT 0,
      bytes INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS installs (
      app_id TEXT NOT NULL,
      day TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (app_id, day)
    )`,
  ];
  await db.batch(statements.map((sql) => db.prepare(sql)));

  // Keep the settings row available for single-row reads.
  await db.prepare(`INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '1')`).run();
}

export async function getMeta(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare(`SELECT value FROM meta WHERE key = ?`).bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

export async function setMeta(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .bind(key, value)
    .run();
}

let vapidCache: VapidKeys | null = null;

export async function getVapid(db: D1Database): Promise<VapidKeys> {
  if (vapidCache) return vapidCache;
  const stored = await getMeta(db, "vapid");
  if (stored) {
    try {
      vapidCache = JSON.parse(stored) as VapidKeys;
      return vapidCache;
    } catch {
      /* regenerate below */
    }
  }
  const keys = await generateVapidKeys();
  await setMeta(db, "vapid", JSON.stringify(keys));
  vapidCache = keys;
  return keys;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export function bad(message: string, status = 400): Response {
  return json({ error: message }, status);
}
