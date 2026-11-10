"use client";

import { buildSite } from "../siteFiles";
import { makeZip } from "../zip";
import type { AppConfig } from "../types";
import { assetBlob, mediaUrl } from "./media";

/**
 * Builds the exact files a published app is made of, straight from the
 * in-browser database. Used for GitHub publishing, .zip export and preview.
 */
export type BuiltBundle = {
  files: { path: string; data: Uint8Array }[];
  warnings: string[];
  publicUrl: string;
};

export async function buildBundle(
  config: AppConfig,
  opts: { appId: string; slug: string; publicUrl: string; preview?: boolean },
): Promise<BuiltBundle> {
  const build = buildSite({
    config,
    appId: opts.appId,
    slug: opts.slug,
    publicUrl: opts.publicUrl,
    apiBase: "",
    pushKey: null,
    preview: opts.preview,
  });

  const encoder = new TextEncoder();
  const files: { path: string; data: Uint8Array }[] = build.files.map((file) => ({
    path: file.path,
    data: encoder.encode(file.body),
  }));
  const warnings: string[] = [];

  for (const copy of build.copies) {
    const blob = await assetBlob(copy.assetId);
    if (!blob) {
      warnings.push(`${copy.path} was missing from local storage`);
      continue;
    }
    files.push({ path: copy.path, data: new Uint8Array(await blob.arrayBuffer()) });
  }

  return { files, warnings, publicUrl: opts.publicUrl };
}

export function downloadBytes(filename: string, bytes: Uint8Array, type = "application/octet-stream"): void {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const url = URL.createObjectURL(new Blob([copy], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadZip(
  config: AppConfig,
  opts: { appId: string; slug: string; publicUrl: string },
): Promise<{ files: number; bytes: number; warnings: string[] }> {
  const bundle = await buildBundle(config, opts);
  const zip = makeZip(bundle.files.map((file) => ({ name: file.path, data: file.data })));
  downloadBytes(`${opts.slug || "app"}.zip`, zip, "application/zip");
  return {
    files: bundle.files.length,
    bytes: bundle.files.reduce((n, file) => n + file.data.length, 0),
    warnings: bundle.warnings,
  };
}

/** A self-contained preview: every stored image is swapped for a blob URL. */
export async function buildPreviewHtml(
  config: AppConfig,
  opts: { appId: string; slug: string },
): Promise<string> {
  const build = buildSite({
    config,
    appId: opts.appId,
    slug: opts.slug,
    publicUrl: "",
    apiBase: "",
    pushKey: null,
    preview: true,
  });
  const index = build.files.find((file) => file.path === "index.html");
  if (!index) throw new Error("Could not build a preview for this app");

  let html = index.body;
  const seen = new Set<string>();
  for (const match of html.matchAll(/\/api\/media\/([A-Za-z0-9_-]+)/g)) seen.add(match[1]!);
  for (const id of seen) {
    const url = mediaUrl(id);
    if (url) html = html.split(`/api/media/${id}`).join(url);
  }
  return html;
}
