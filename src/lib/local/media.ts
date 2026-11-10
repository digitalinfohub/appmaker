import { idbAll, idbGet, idbPut, type StoredAsset } from "./idb";

/**
 * Uploaded images live as Blobs in IndexedDB. The studio shows them through
 * object URLs, which work offline and need no server.
 */
const urls = new Map<string, string>();

export function mediaUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  return urls.get(id) ?? null;
}

export function rememberAsset(asset: StoredAsset): void {
  if (!asset.blob) return;
  const existing = urls.get(asset.id);
  if (existing) URL.revokeObjectURL(existing);
  urls.set(asset.id, URL.createObjectURL(asset.blob));
}

export async function hydrateMedia(): Promise<void> {
  try {
    const assets = await idbAll<StoredAsset>("assets");
    for (const asset of assets) if (!urls.has(asset.id)) rememberAsset(asset);
  } catch {
    /* storage unavailable — the studio shows placeholders */
  }
}

export async function saveAsset(asset: StoredAsset): Promise<void> {
  await idbPut("assets", asset);
  rememberAsset(asset);
}

export async function assetBlob(id: string): Promise<Blob | null> {
  const asset = await idbGet<StoredAsset>("assets", id);
  return asset?.blob ?? null;
}

export async function assetInfo(id: string): Promise<StoredAsset | null> {
  return idbGet<StoredAsset>("assets", id);
}
