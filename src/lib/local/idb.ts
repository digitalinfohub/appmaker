/**
 * Local-first persistence for the static studio.
 * Everything (apps, uploaded images, settings, notification drafts) lives in
 * IndexedDB, so the builder works on GitHub Pages with no server.
 */

export type StoredApp = {
  id: string;
  slug: string;
  name: string;
  config: string;
  status: "draft" | "published";
  version: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  publishedFiles?: string[];
  publishedUrl?: string;
};

export type StoredAsset = {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  createdAt: string;
};

export type StoredNotification = {
  id: string;
  app_id: string;
  title: string;
  body: string;
  url: string | null;
  icon: string | null;
  status: "scheduled" | "sending" | "sent" | "failed" | "cancelled";
  send_at: string;
  sent_at: string | null;
  recipients: number;
  failures: number;
  error: string | null;
  created_at: string;
};

export type PublishRecord = {
  app_id: string;
  files: number;
  bytes: number;
  published_at: string;
  url: string;
};

const DB_NAME = "app-maker";
// Bump this whenever stores are added: the upgrade handler below creates any
// store that is missing, so a database left behind by an older build repairs
// itself instead of failing with "object store was not found".
const DB_VERSION = 2;
let cached: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (cached) return cached;
  cached = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser does not support local storage (IndexedDB)"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("apps")) {
        const apps = db.createObjectStore("apps", { keyPath: "id" });
        apps.createIndex("slug", "slug", { unique: true });
      }
      if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets", { keyPath: "id" });
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
      if (!db.objectStoreNames.contains("notifications")) {
        const notifications = db.createObjectStore("notifications", { keyPath: "id" });
        notifications.createIndex("app_id", "app_id");
      }
      if (!db.objectStoreNames.contains("publishes")) db.createObjectStore("publishes", { keyPath: "app_id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local database"));
  });
  return cached;
}

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function store(name: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export async function idbPut<T>(name: string, value: T): Promise<void> {
  await done((await store(name, "readwrite")).put(value as unknown as object));
}

export async function idbGet<T>(name: string, key: IDBValidKey): Promise<T | null> {
  const value = await done((await store(name, "readonly")).get(key));
  return (value as T | undefined) ?? null;
}

export async function idbAll<T>(name: string): Promise<T[]> {
  const values = await done((await store(name, "readonly")).getAll());
  return (values as T[]) ?? [];
}

export async function idbDelete(name: string, key: IDBValidKey): Promise<void> {
  await done((await store(name, "readwrite")).delete(key));
}

export async function idbClear(name: string): Promise<void> {
  await done((await store(name, "readwrite")).clear());
}

export async function idbByIndex<T>(name: string, index: string, value: IDBValidKey): Promise<T[]> {
  const objectStore = await store(name, "readonly");
  const values = await done(objectStore.index(index).getAll(value));
  return (values as T[]) ?? [];
}

/* ------------------------------------------------------------- settings */

export async function getSetting<T>(key: string, fallback: T | null = null): Promise<T | null> {
  const row = await idbGet<{ key: string; value: T }>("settings", key);
  return row ? row.value : fallback;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await idbPut("settings", { key, value });
}
