import type { AppConfig, AssetCopy, AssetRef, Block, SiteBuild, SiteFile } from "./types";
import {
  renderIndexHtml,
  renderManifest,
  renderOfflineHtml,
  renderServiceWorker,
  safeColor,
  type RenderContext,
} from "./render";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "image/avif": "avif",
};

export function extForMime(mime: string): string {
  return EXT[mime.toLowerCase()] ?? "bin";
}

function collectRefs(value: unknown, out: Map<string, AssetRef>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, out);
    return;
  }
  const maybe = value as AssetRef;
  if (typeof maybe.id === "string" && typeof maybe.name === "string" && typeof maybe.type === "string") {
    out.set(maybe.id, maybe);
    return;
  }
  for (const item of Object.values(value as Record<string, unknown>)) collectRefs(item, out);
}

export function collectAssets(config: AppConfig): AssetRef[] {
  const out = new Map<string, AssetRef>();
  collectRefs(
    {
      wallpaper: config.theme.wallpaper,
      branding: config.branding,
      pages: config.pages.map((p) => p.blocks as Block[]),
    },
    out,
  );
  return Array.from(out.values());
}

function placeholderIcon(config: AppConfig): string {
  const bg = safeColor(config.branding.iconBackground, safeColor(config.theme.primary, "#6d5efc"));
  const accent = safeColor(config.theme.accent, "#22d3ee");
  const letter = (config.shortName || config.name || "A").trim().slice(0, 1).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${accent}"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <text x="50%" y="50%" dy="0.36em" text-anchor="middle" fill="#ffffff"
    font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-size="268" font-weight="700">${letter.replace(
      /[<>&"]/g,
      "",
    )}</text>
</svg>`;
}

export type BuildInput = {
  config: AppConfig;
  appId: string;
  slug: string;
  publicUrl: string;
  apiBase: string;
  pushKey?: string | null;
  qrSvg?: string;
  preview?: boolean;
};

/**
 * Builds the complete, self-contained PWA bundle for an app.
 * Text files come back inline; binary assets come back as copy specs
 * (assetId -> bundle path) that the publisher copies out of R2.
 */
export function buildSite(input: BuildInput): SiteBuild {
  const { config, appId, slug, publicUrl, apiBase, qrSvg, pushKey, preview } = input;
  const iconSet = config.branding.iconSet ?? null;
  const icon = config.branding.icon;
  const hasIcon = Boolean(iconSet || icon);

  const mediaPaths = new Map<string, string>();
  const copies: AssetCopy[] = [];

  const addCopy = (ref: AssetRef, path: string) => {
    if (copies.some((c) => c.path === path)) return;
    copies.push({ assetId: ref.id, path, contentType: ref.type || "image/png" });
  };

  if (iconSet) {
    addCopy(iconSet.i512, "icons/icon-512.png");
    addCopy(iconSet.i192, "icons/icon-192.png");
    addCopy(iconSet.apple, "icons/apple-touch-icon.png");
    addCopy(iconSet.maskable, "icons/icon-maskable-512.png");
    mediaPaths.set(iconSet.i512.id, "icons/icon-512.png");
    mediaPaths.set(iconSet.i192.id, "icons/icon-192.png");
    mediaPaths.set(iconSet.apple.id, "icons/apple-touch-icon.png");
    mediaPaths.set(iconSet.maskable.id, "icons/icon-maskable-512.png");
  }
  if (icon) {
    if (!iconSet) {
      addCopy(icon, `icons/icon-src.${extForMime(icon.type)}`);
      mediaPaths.set(icon.id, `icons/icon-src.${extForMime(icon.type)}`);
    } else {
      mediaPaths.set(icon.id, "icons/icon-512.png");
    }
  }
  if (config.branding.favicon) {
    addCopy(config.branding.favicon, `favicon.${extForMime(config.branding.favicon.type)}`);
  } else if (iconSet) {
    copies.push({ assetId: iconSet.i192.id, path: "favicon.png", contentType: "image/png" });
  } else if (icon) {
    copies.push({ assetId: icon.id, path: `favicon.${extForMime(icon.type)}`, contentType: icon.type });
  }

  for (const ref of collectAssets(config)) {
    if (mediaPaths.has(ref.id)) continue;
    const path = `media/${ref.id}.${extForMime(ref.type)}`;
    mediaPaths.set(ref.id, path);
    addCopy(ref, path);
  }

  const ctx: RenderContext = {
    assetUrl: (ref) => {
      if (!ref || !ref.id) return null;
      if (preview) return `/api/media/${ref.id}`;
      return mediaPaths.get(ref.id) ?? null;
    },
    publicUrl,
    apiBase,
    appId,
    slug,
    pushKey: pushKey ?? null,
    qrSvg,
    preview,
  };

  const manifestObj = JSON.parse(renderManifest(config, ctx)) as { icons: any[] };
  if (!hasIcon) {
    manifestObj.icons = [
      { src: "./icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "./icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ];
  } else if (!iconSet) {
    const src = `./icons/icon-src.${extForMime((icon as AssetRef).type)}`;
    manifestObj.icons = [{ src, sizes: "any", type: (icon as AssetRef).type, purpose: "any" }];
  }
  const manifest = JSON.stringify(manifestObj, null, 2);

  let index = renderIndexHtml(config, ctx);
  if (preview) {
    const iconUrl = ctx.assetUrl(icon);
    index = index
      .replace('href="./favicon.png"', `href="${iconUrl || "data:,"}"`)
      .replace('href="./icons/apple-touch-icon.png"', `href="${iconUrl || "data:,"}"`)
      .replace('href="./manifest.webmanifest"', `href="data:application/manifest+json,${encodeURIComponent(manifest)}"`);
  } else {
    const faviconPath = config.branding.favicon
      ? `./favicon.${extForMime(config.branding.favicon.type)}`
      : hasIcon
        ? "./favicon.png"
        : "./icons/icon.svg";
    const applePath = iconSet
      ? "./icons/apple-touch-icon.png"
      : hasIcon
        ? `./icons/icon-src.${extForMime((icon as AssetRef).type)}`
        : "./icons/icon.svg";
    index = index
      .replace('href="./favicon.png"', `href="${faviconPath}"`)
      .replace('href="./icons/apple-touch-icon.png"', `href="${applePath}"`);
  }

  const offline = renderOfflineHtml(config, ctx);

  const precache = [
    "./",
    "./manifest.webmanifest",
    "./offline.html",
    ...(iconSet
      ? ["./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"]
      : hasIcon
        ? [`./icons/icon-src.${extForMime((icon as AssetRef).type)}`]
        : []),
    ...Array.from(mediaPaths.entries())
      .filter(([, path]) => path.startsWith("media/"))
      .map(([, path]) => `./${path}`)
      .slice(0, 44),
  ];

  const sw = renderServiceWorker(config, ctx, precache);

  const files: SiteFile[] = [
    { path: "index.html", contentType: "text/html; charset=utf-8", body: index, bytes: index.length },
    {
      path: "manifest.webmanifest",
      contentType: "application/manifest+json; charset=utf-8",
      body: manifest,
      bytes: manifest.length,
    },
    { path: "sw.js", contentType: "text/javascript; charset=utf-8", body: sw, bytes: sw.length },
    { path: "offline.html", contentType: "text/html; charset=utf-8", body: offline, bytes: offline.length },
  ];

  if (!hasIcon) {
    const svg = placeholderIcon(config);
    files.push({ path: "icons/icon.svg", contentType: "image/svg+xml", body: svg, bytes: svg.length });
  }

  return { files, copies, precache };
}

export const MIME_BY_EXT: Record<string, string> = {
  html: "text/html; charset=utf-8",
  webmanifest: "application/manifest+json; charset=utf-8",
  json: "application/json; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
  ico: "image/x-icon",
  txt: "text/plain; charset=utf-8",
};

export function contentTypeForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}
