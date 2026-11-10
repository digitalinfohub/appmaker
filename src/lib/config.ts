import { BLOCK_MAP, newId, sanitizeProps } from "./blocks";
import { DEFAULT_THEME, pageSlug, slugify } from "./defaults";
import { isAssetRef } from "./blocks";
import type { AppConfig, AssetRef, Block, Branding, Page, PwaSettings, Theme } from "./types";
import { safeColor } from "./render";

function asset(value: unknown): AssetRef | null {
  if (!isAssetRef(value)) return null;
  if (value.id.length > 64) return null;
  const type = String(value.type || "image/png").slice(0, 64);
  if (!/^image\/[a-z0-9.+-]+$/i.test(type)) return null;
  return { id: value.id, name: String(value.name || "image").slice(0, 120), type };
}

function iconSet(value: unknown): Branding["iconSet"] {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const i512 = asset(v.i512);
  const i192 = asset(v.i192);
  const apple = asset(v.apple);
  const maskable = asset(v.maskable);
  if (!i512 || !i192 || !apple || !maskable) return null;
  return { i512, i192, apple, maskable };
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function sanitizeTheme(input: any): Theme {
  const t = input && typeof input === "object" ? input : {};
  return {
    primary: safeColor(t.primary, DEFAULT_THEME.primary),
    accent: safeColor(t.accent, DEFAULT_THEME.accent),
    background: safeColor(t.background, DEFAULT_THEME.background),
    surface: safeColor(t.surface, DEFAULT_THEME.surface),
    text: safeColor(t.text, DEFAULT_THEME.text),
    muted: safeColor(t.muted, DEFAULT_THEME.muted),
    font: enumValue(t.font, ["sans", "serif", "rounded", "mono", "display"] as const, "sans"),
    radius: clamp(Number(t.radius) || DEFAULT_THEME.radius, 0, 40),
    dark: t.dark !== false,
    wallpaper: asset(t.wallpaper),
    wallpaperOpacity: clamp(Number(t.wallpaperOpacity) || 0, 0, 100),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sanitizePwa(input: any): PwaSettings {
  const p = input && typeof input === "object" ? input : {};
  return {
    display: enumValue(p.display, ["standalone", "fullscreen", "minimal-ui", "browser"] as const, "standalone"),
    orientation: enumValue(p.orientation, ["any", "portrait", "landscape"] as const, "portrait"),
    themeColor: safeColor(p.themeColor, DEFAULT_THEME.background),
    offline: p.offline !== false,
    installPrompt: p.installPrompt !== false,
    pushEnabled: p.pushEnabled !== false,
    pushPrompt: enumValue(p.pushPrompt, ["auto", "button", "off"] as const, "button"),
    contactEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.contactEmail ?? "").trim())
      ? String(p.contactEmail).trim().slice(0, 120)
      : "",
    desktopMode: enumValue(p.desktopMode, ["qr-first", "app-first"] as const, "qr-first"),
    categories: Array.isArray(p.categories)
      ? p.categories.map((c: unknown) => String(c).slice(0, 32)).filter(Boolean).slice(0, 5)
      : [],
    shortcuts: Array.isArray(p.shortcuts)
      ? p.shortcuts
          .map((s: any) => ({ name: String(s?.name ?? "").slice(0, 40), page: String(s?.page ?? "").slice(0, 40) }))
          .filter((s: any) => s.name && s.page)
          .slice(0, 4)
      : [],
  };
}

export function sanitizeBlock(input: any): Block | null {
  if (!input || typeof input !== "object") return null;
  const type = String(input.type || "");
  const def = BLOCK_MAP[type];
  if (!def) return null;
  const id = typeof input.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(input.id) ? input.id : newId("blk");
  return { id, type: def.type, props: sanitizeProps(def, input.props ?? {}) };
}

export function sanitizeConfig(input: any, fallbackName: string): AppConfig {
  const raw = input && typeof input === "object" ? input : {};
  const name = String(raw.name || fallbackName || "Untitled app").slice(0, 60);
  const pagesIn: any[] = Array.isArray(raw.pages) ? raw.pages.slice(0, 12) : [];
  const seen = new Set<string>();
  const pages: Page[] = [];

  for (const p of pagesIn) {
    const pageName = String(p?.name || "Page").slice(0, 40);
    let slug = slugify(String(p?.slug || pageName)).slice(0, 32) || "page";
    let n = 2;
    while (seen.has(slug)) slug = `${slugify(pageName).slice(0, 28)}-${n++}`;
    seen.add(slug);
    const blocks = (Array.isArray(p?.blocks) ? p.blocks : [])
      .map(sanitizeBlock)
      .filter((b: Block | null): b is Block => Boolean(b))
      .slice(0, 200);
    pages.push({
      id: typeof p?.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(p.id) ? p.id : newId("pg"),
      name: pageName,
      slug,
      icon: String(p?.icon || "grid").slice(0, 24),
      blocks,
      showInNav: p?.showInNav !== false,
    });
  }

  if (!pages.length) {
    const page: Page = { id: newId("pg"), name: "Home", slug: "home", icon: "home", blocks: [], showInNav: true };
    pages.push(page);
  }

  const homeId = pages.some((p) => p.id === raw.homePageId) ? String(raw.homePageId) : pages[0].id;
  const branding = raw.branding && typeof raw.branding === "object" ? raw.branding : {};

  return {
    version: 1,
    name,
    shortName: String(raw.shortName || name).slice(0, 14),
    description: String(raw.description || "").slice(0, 220),
    theme: sanitizeTheme(raw.theme),
    branding: {
      icon: asset(branding.icon),
      favicon: asset(branding.favicon),
      iconBackground: safeColor(branding.iconBackground, DEFAULT_THEME.primary),
      splashColor: safeColor(branding.splashColor, DEFAULT_THEME.background),
      splashLogo: asset(branding.splashLogo),
      iconSet: iconSet(branding.iconSet),
    },
    pwa: sanitizePwa(raw.pwa),
    pages,
    homePageId: homeId,
  };
}

export function uniquePageSlug(config: AppConfig, name: string, exceptId?: string): string {
  const others = config.pages.filter((p) => p.id !== exceptId);
  return pageSlug(name, others);
}

export function countBlocks(config: AppConfig): number {
  return config.pages.reduce((n, p) => n + p.blocks.length, 0);
}
