import type { AppConfig, AssetRef, Block, Page, Theme } from "./types";
import { iconSvg, socialSvg } from "./icons";

export type RenderContext = {
  assetUrl: (ref: AssetRef | null | undefined) => string | null;
  publicUrl: string;
  apiBase: string;
  appId: string;
  slug: string;
  pushKey?: string | null;
  qrSvg?: string;
  preview?: boolean;
};

/* ------------------------------------------------------------------ utils */

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
  if (/^(rgb|hsl)a?\(\s*[0-9.,%\s/deg-]+\)$/i.test(v)) return v;
  return fallback;
}

export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith("#")) return v;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(v)) return v;
  if (v.startsWith("/")) return v;
  return null;
}

function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function richText(value: unknown): string {
  const raw = esc(value);
  return raw
    .split(/\n{2,}/)
    .map((para) => {
      const body = para
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
        .replace(/\n/g, "<br>");
      return `<p>${body}</p>`;
    })
    .join("");
}

function attrLink(url: string): string {
  return isExternal(url) ? ` target="_blank" rel="noopener"` : "";
}

/* -------------------------------------------------------------------- css */

const FONTS: Record<Theme["font"], string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", "Quicksand", "Nunito", system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  display: '"Didot", "Bodoni MT", "Playfair Display", "Palatino Linotype", Georgia, serif',
};

export function appCss(config: AppConfig): string {
  const t = config.theme;
  const vars = [
    `--am-primary:${safeColor(t.primary, "#6d5efc")}`,
    `--am-accent:${safeColor(t.accent, "#22d3ee")}`,
    `--am-bg:${safeColor(t.background, "#0b0d12")}`,
    `--am-surface:${safeColor(t.surface, "#151925")}`,
    `--am-text:${safeColor(t.text, "#f2f4fa")}`,
    `--am-muted:${safeColor(t.muted, "#9aa3b8")}`,
    `--am-radius:${Math.max(0, Math.min(40, Number(t.radius) || 18))}px`,
    `--am-font:${FONTS[t.font] ?? FONTS.sans}`,
    `--am-line:color-mix(in srgb, ${safeColor(t.text, "#fff")} 12%, transparent)`,
    `--am-splash:${safeColor(config.branding.splashColor, safeColor(t.background, "#0b0d12"))}`,
  ].join(";");

  return `
.am-app{${vars};color:var(--am-text);font-family:var(--am-font);background:var(--am-bg);min-height:100%;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;position:relative;isolation:isolate}
.am-app *,.am-app *::before,.am-app *::after{box-sizing:border-box}
.am-app :where(h1,h2,h3,h4,p,figure,blockquote){margin:0}
.am-app a{color:inherit;-webkit-tap-highlight-color:transparent}
.am-app img{max-width:100%;display:block}
.am-app button{font-family:inherit}
.am-wall{position:fixed;inset:0;z-index:-1;background-size:cover;background-position:center;opacity:${
    Math.max(0, Math.min(100, Number(t.wallpaperOpacity) || 0)) / 100
  };pointer-events:none}
.am-main{max-width:720px;margin:0 auto;padding-bottom:calc(104px + env(safe-area-inset-bottom))}
.am-page{display:none;padding:6px 16px 20px}
.am-page.is-active{display:block;animation:am-in .28s ease both}
@keyframes am-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.am-page.is-active{animation:none}.am-app *{transition:none!important}}
.am-bar{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--am-bg) 82%,transparent);
  -webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border-bottom:1px solid var(--am-line)}
.am-bar__in{max-width:720px;margin:0 auto;display:flex;align-items:center;gap:10px;
  padding:calc(10px + env(safe-area-inset-top)) 16px 10px}
.am-bar__logo{width:30px;height:30px;border-radius:9px;overflow:hidden;background:var(--am-primary);flex:none;
  display:grid;place-items:center;color:#fff;font-weight:800;font-size:13px}
.am-bar__logo img{width:100%;height:100%;object-fit:cover}
.am-bar__name{font-weight:680;font-size:15px;letter-spacing:-.01em;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.am-bar__btn{width:34px;height:34px;border-radius:11px;border:1px solid var(--am-line);background:color-mix(in srgb,var(--am-text) 6%,transparent);
  color:var(--am-text);display:grid;place-items:center;cursor:pointer;flex:none;padding:0}
.am-bar__btn:active{transform:scale(.95)}
.am-bar__btn.is-on{color:var(--am-primary);border-color:color-mix(in srgb,var(--am-primary) 45%,transparent);background:color-mix(in srgb,var(--am-primary) 14%,transparent)}
.blk{padding:9px 0}
.am-hero{position:relative;border-radius:var(--am-radius);overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;
  padding:24px 20px;min-height:190px;background:linear-gradient(150deg,color-mix(in srgb,var(--am-primary) 68%,var(--am-surface)),var(--am-surface))}
.am-hero--sm{min-height:150px}.am-hero--md{min-height:230px}.am-hero--lg{min-height:330px}
.am-hero__img{position:absolute;inset:0;background-size:cover;background-position:center}
.am-hero__scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.72))}
.am-hero__body{position:relative;z-index:1;display:flex;flex-direction:column;gap:9px}
.am-hero--center .am-hero__body{align-items:center;text-align:center}
.am-hero__eyebrow{font-size:11px;font-weight:750;letter-spacing:.16em;text-transform:uppercase;color:#fff;opacity:.85}
.am-hero__title{font-size:clamp(25px,7.4vw,36px);line-height:1.06;letter-spacing:-.028em;font-weight:760;color:#fff;text-wrap:balance}
.am-hero__sub{font-size:14.5px;line-height:1.5;color:rgba(255,255,255,.84);max-width:44ch}
.am-hero__actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.am-hero--center .am-hero__actions{justify-content:center}
.am-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;border-radius:13px;
  font-weight:660;font-size:14px;text-decoration:none;border:1px solid transparent;cursor:pointer;transition:transform .14s ease,filter .2s ease;
  background:transparent;color:var(--am-text);line-height:1}
.am-btn:active{transform:scale(.975)}
.am-btn--primary{background:var(--am-primary);color:#fff;box-shadow:0 14px 26px -16px color-mix(in srgb,var(--am-primary) 90%,transparent)}
.am-hero .am-btn--primary{background:#fff;color:#111}
.am-btn--secondary{background:color-mix(in srgb,var(--am-text) 9%,transparent);border-color:var(--am-line);color:var(--am-text)}
.am-hero .am-btn--secondary{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.28);color:#fff}
.am-btn--ghost{color:var(--am-primary);border-color:color-mix(in srgb,var(--am-primary) 30%,transparent)}
.am-btn--block{width:100%}
.am-btn__ico{display:inline-flex;opacity:.9}
.am-card{background:var(--am-surface);border:1px solid var(--am-line);border-radius:var(--am-radius);padding:18px}
.am-sec-title{font-size:19px;font-weight:720;letter-spacing:-.02em}
.am-sec-sub{font-size:13.5px;color:var(--am-muted);line-height:1.55;margin-top:6px}
.am-prose{color:var(--am-text);font-size:14.5px;line-height:1.62}
.am-prose p+p{margin-top:10px}
.am-prose--sm{font-size:13.5px}.am-prose--lg{font-size:16px}
.am-prose strong{font-weight:700}
.am-img{border-radius:var(--am-radius);overflow:hidden;background:var(--am-surface);border:1px solid var(--am-line)}
.am-img__el{width:100%;height:100%;object-fit:cover;display:block}
.am-img--wide{aspect-ratio:16/9}.am-img--square{aspect-ratio:1}.am-img--tall{aspect-ratio:4/5}
.am-img__cap{font-size:12px;color:var(--am-muted);padding:9px 12px}
.am-gallery{display:grid;gap:6px}
.am-gallery__item{position:relative;aspect-ratio:1;overflow:hidden;background:var(--am-surface);cursor:zoom-in;border:0;padding:0}
.am-gallery__item img{width:100%;height:100%;object-fit:cover;transition:transform .4s ease}
.am-gallery__item:active img{transform:scale(1.03)}
.am-gallery__empty{display:grid;place-items:center;aspect-ratio:1;color:var(--am-muted);border:1px dashed var(--am-line);border-radius:14px;font-size:12px}
.am-features{display:grid;gap:8px}
.am-feature{background:var(--am-surface);border:1px solid var(--am-line);border-radius:var(--am-radius);padding:14px;
  display:flex;flex-direction:column;gap:8px;text-decoration:none;color:inherit}
.am-feature__ico{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;color:var(--am-primary);
  background:color-mix(in srgb,var(--am-primary) 14%,transparent)}
.am-feature__title{font-weight:660;font-size:14.5px;letter-spacing:-.01em}
.am-feature__text{font-size:12.8px;line-height:1.5;color:var(--am-muted)}
.am-rows{display:flex;flex-direction:column;border-radius:var(--am-radius);overflow:hidden;border:1px solid var(--am-line);background:var(--am-surface)}
.am-row{display:flex;align-items:center;gap:11px;padding:12px 14px;text-decoration:none;color:inherit;border-bottom:1px solid var(--am-line)}
.am-row:last-child{border-bottom:0}
.am-row__ico{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;flex:none;
  color:var(--am-primary);background:color-mix(in srgb,var(--am-primary) 12%,transparent)}
.am-row__body{flex:1;min-width:0}
.am-row__t{font-size:14px;font-weight:620;letter-spacing:-.01em}
.am-row__s{font-size:12px;color:var(--am-muted);margin-top:2px;line-height:1.4}
.am-row__meta{font-size:13px;font-weight:650;color:var(--am-primary);white-space:nowrap}
.am-form{display:flex;flex-direction:column;gap:11px}
.am-field{display:flex;flex-direction:column;gap:5px}
.am-label{font-size:12px;font-weight:620;color:var(--am-muted);letter-spacing:.01em}
.am-input,.am-textarea{width:100%;padding:11px 13px;border-radius:12px;border:1px solid var(--am-line);
  background:color-mix(in srgb,var(--am-bg) 55%,var(--am-surface));color:var(--am-text);font-size:14px;font-family:inherit;outline:none}
.am-input:focus,.am-textarea:focus{border-color:color-mix(in srgb,var(--am-primary) 60%,transparent);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--am-primary) 18%,transparent)}
.am-textarea{min-height:96px;resize:vertical}
.am-form__note{font-size:12px;color:var(--am-muted)}
.am-form__ok{font-size:13.5px;color:var(--am-primary);font-weight:600}
.am-video{position:relative;aspect-ratio:16/9;border-radius:var(--am-radius);overflow:hidden;background:#000}
.am-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.am-quote{background:var(--am-surface);border:1px solid var(--am-line);border-radius:var(--am-radius);padding:16px;display:flex;flex-direction:column;gap:11px}
.am-quote__text{font-size:14px;line-height:1.6}
.am-quote__who{display:flex;align-items:center;gap:9px}
.am-quote__av{width:30px;height:30px;border-radius:50%;object-fit:cover;background:color-mix(in srgb,var(--am-primary) 20%,transparent);
  display:grid;place-items:center;font-size:11px;font-weight:700;color:var(--am-primary);flex:none}
.am-quote__n{font-size:12.5px;font-weight:640}
.am-quote__r{font-size:11.5px;color:var(--am-muted)}
.am-stats{display:grid;grid-auto-flow:column;gap:6px;background:var(--am-surface);border:1px solid var(--am-line);
  border-radius:var(--am-radius);padding:14px 8px}
.am-stat{text-align:center;padding:0 6px}
.am-stat__v{font-size:19px;font-weight:730;letter-spacing:-.02em;color:var(--am-primary)}
.am-stat__l{font-size:11px;color:var(--am-muted);margin-top:2px}
.am-faq{border:1px solid var(--am-line);border-radius:var(--am-radius);background:var(--am-surface);overflow:hidden}
.am-faq details{border-bottom:1px solid var(--am-line)}
.am-faq details:last-child{border-bottom:0}
.am-faq summary{list-style:none;cursor:pointer;padding:13px 15px;font-size:13.8px;font-weight:620;display:flex;justify-content:space-between;gap:10px}
.am-faq summary::-webkit-details-marker{display:none}
.am-faq summary::after{content:"+";color:var(--am-muted);font-weight:500}
.am-faq details[open] summary::after{content:"−"}
.am-faq__a{padding:0 15px 14px;font-size:13px;line-height:1.6;color:var(--am-muted)}
.am-cta{border-radius:var(--am-radius);padding:20px;display:flex;flex-direction:column;gap:11px;align-items:flex-start;
  background:linear-gradient(150deg,color-mix(in srgb,var(--am-primary) 32%,var(--am-surface)),var(--am-surface));border:1px solid var(--am-line)}
.am-cta--solid{background:var(--am-primary);border-color:transparent;color:#fff}
.am-cta--solid .am-cta__t,.am-cta--solid .am-cta__x{color:#fff}
.am-cta--solid .am-btn--primary{background:#fff;color:#111}
.am-cta__t{font-size:17px;font-weight:700;letter-spacing:-.02em}
.am-cta__x{font-size:13px;line-height:1.55;color:color-mix(in srgb,var(--am-text) 78%,transparent)}
.am-socials{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.am-social{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--am-line);
  background:var(--am-surface);color:var(--am-text);text-decoration:none}
.am-social:active{transform:scale(.95)}
.am-spacer--sm{height:8px}.am-spacer--md{height:20px}.am-spacer--lg{height:36px}
.am-divider{height:1px;background:var(--am-line);margin:6px 0}
.am-tabs{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;justify-content:center;
  padding:6px 10px calc(6px + env(safe-area-inset-bottom));border-top:1px solid var(--am-line);
  background:color-mix(in srgb,var(--am-bg) 88%,transparent);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px)}
.am-tabs__in{display:flex;width:100%;max-width:520px}
.am-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 2px;text-decoration:none;
  color:var(--am-muted);font-size:10px;font-weight:640;letter-spacing:.01em;border-radius:11px}
.am-tab svg{opacity:.85}
.am-tab.is-active{color:var(--am-primary)}
.am-tab.is-active svg{opacity:1}
.am-banner{display:flex;align-items:center;gap:11px;padding:12px;border-radius:var(--am-radius);
  background:color-mix(in srgb,var(--am-primary) 13%,var(--am-surface));border:1px solid color-mix(in srgb,var(--am-primary) 30%,transparent)}
.am-banner__t{font-size:13px;font-weight:640;flex:1}
.am-banner__x{font-size:12px;color:var(--am-muted)}
.am-launch{position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:var(--am-splash);
  transition:opacity .4s ease,visibility .4s}
.am-launch.is-hidden{opacity:0;visibility:hidden;pointer-events:none}
.am-launch__logo{width:86px;height:86px;border-radius:24px;display:grid;place-items:center;overflow:hidden;
  background:color-mix(in srgb,var(--am-primary) 22%,transparent);color:#fff;font-size:30px;font-weight:800}
.am-launch__logo img{width:100%;height:100%;object-fit:cover}
.am-launch__bar{position:absolute;bottom:56px;width:120px;height:3px;border-radius:2px;overflow:hidden;
  background:color-mix(in srgb,var(--am-text) 14%,transparent)}
.am-launch__bar i{display:block;height:100%;width:40%;background:var(--am-primary);border-radius:2px;
  animation:am-load 1.1s ease-in-out infinite}
@keyframes am-load{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
.am-sheet{position:fixed;left:0;right:0;bottom:0;z-index:60;background:var(--am-surface);border-radius:22px 22px 0 0;
  padding:18px 18px calc(20px + env(safe-area-inset-bottom));transform:translateY(102%);transition:transform .3s cubic-bezier(.3,.9,.2,1);
  box-shadow:0 -20px 50px -20px rgba(0,0,0,.6);max-height:82vh;overflow:auto}
.am-sheet.is-open{transform:none}
.am-sheet__title{font-size:16px;font-weight:700;margin-bottom:6px}
.am-sheet__body{font-size:13.5px;line-height:1.6;color:var(--am-muted);display:flex;flex-direction:column;gap:10px}
.am-sheet__scrim{position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .3s}
.am-sheet__scrim.is-open{opacity:1;pointer-events:auto}
.am-toast{position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom));transform:translate(-50%,20px);
  background:color-mix(in srgb,var(--am-text) 92%,transparent);color:var(--am-bg);padding:10px 15px;border-radius:12px;
  font-size:12.5px;font-weight:600;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;z-index:80;max-width:86vw;text-align:center}
.am-toast.is-on{opacity:1;transform:translate(-50%,0)}
.am-lightbox{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.94);display:none;place-items:center;padding:20px}
.am-lightbox.is-open{display:grid}
.am-lightbox img{max-width:100%;max-height:100%;border-radius:12px}
.am-empty{font-size:12.5px;color:var(--am-muted);border:1px dashed var(--am-line);border-radius:14px;padding:16px;text-align:center}
.am-gate{display:none}
.am-gate__wrap{max-width:1040px;margin:0 auto;display:grid;grid-template-columns:1.05fr .95fr;gap:52px;align-items:center}
.am-gate__eyebrow{font-size:11px;font-weight:750;letter-spacing:.18em;text-transform:uppercase;color:var(--am-accent)}
.am-gate__title{font-size:clamp(30px,3.4vw,44px);line-height:1.05;letter-spacing:-.035em;font-weight:760;margin:10px 0 12px}
.am-gate__text{font-size:15px;line-height:1.6;color:var(--am-muted);max-width:44ch}
.am-gate__qr{background:#fff;padding:12px;border-radius:16px;width:max-content;margin:22px 0 10px;box-shadow:0 18px 40px -22px rgba(0,0,0,.8)}
.am-gate__qr svg{display:block;width:148px;height:148px}
.am-gate__hint{font-size:12px;color:var(--am-muted);max-width:34ch;line-height:1.5}
.am-gate__alt{margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.am-gate__link{font-size:12.5px;font-weight:640;color:var(--am-text);text-decoration:none;
  border-bottom:1px solid var(--am-line);padding-bottom:2px}
.am-phone{width:306px;height:632px;border-radius:46px;padding:9px;background:#0d1016;border:1px solid #262b36;
  box-shadow:0 40px 90px -40px rgba(0,0,0,.9),inset 0 0 0 1px rgba(255,255,255,.04);position:relative;margin:0 auto}
.am-phone::after{content:"";position:absolute;top:16px;left:50%;transform:translateX(-50%);width:76px;height:19px;
  border-radius:12px;background:#0d1016;z-index:2}
.am-phone iframe{width:100%;height:100%;border:0;border-radius:38px;background:var(--am-bg);display:block}
@media (min-width:900px){
  body.is-gated{overflow:hidden}
  body.is-gated .am-shell{display:none}
  body.is-gated .am-gate{display:grid;position:fixed;inset:0;z-index:70;background:
    radial-gradient(1100px 700px at 18% -10%,color-mix(in srgb,var(--am-primary) 22%,transparent),transparent 60%),
    radial-gradient(800px 600px at 100% 100%,color-mix(in srgb,var(--am-accent) 16%,transparent),transparent 55%),var(--am-bg);
    padding:48px;overflow:auto}
}
@media (max-width:899px){
  .am-gate{display:none!important}
  .am-phone{display:none}
}
`.trim();
}

/* ----------------------------------------------------------------- blocks */

function ctaButtons(block: Block, ctx: RenderContext, hero = false): string {
  const out: string[] = [];
  const primary = safeUrl(block.props.primaryLink);
  const secondary = safeUrl(block.props.secondaryLink);
  if (block.props.primaryLabel && primary) {
    out.push(
      `<a class="am-btn am-btn--primary" href="${esc(primary)}"${attrLink(primary)}>${esc(block.props.primaryLabel)}</a>`,
    );
  }
  if (block.props.secondaryLabel && secondary) {
    out.push(
      `<a class="am-btn am-btn--secondary" href="${esc(secondary)}"${attrLink(secondary)}>${esc(block.props.secondaryLabel)}</a>`,
    );
  }
  return out.length ? `<div class="am-hero__actions">${out.join("")}</div>` : "";
}

export function renderBlock(block: Block, config: AppConfig, ctx: RenderContext): string {
  const p = block.props ?? {};
  const img = (ref: any) => ctx.assetUrl(ref);
  const wrap = (inner: string, extra = "") =>
    `<div class="blk blk--${esc(block.type)}${extra}" data-block="${esc(block.id)}" data-type="${esc(block.type)}">${inner}</div>`;

  switch (block.type) {
    case "hero": {
      const image = img(p.image);
      const height = ["sm", "md", "lg"].includes(p.height) ? p.height : "md";
      const align = p.align === "left" ? "" : " am-hero--center";
      return wrap(
        `<section class="am-hero am-hero--${height}${align}" style="border-radius:${Number(p.rounded) || 26}px">
          ${image ? `<div class="am-hero__img" style="background-image:url('${esc(image)}')"></div>` : ""}
          ${image ? `<div class="am-hero__scrim" style="opacity:${Math.max(0, Math.min(0.9, (Number(p.overlay) || 0) / 100 + 0.15))}"></div>` : ""}
          <div class="am-hero__body">
            ${p.eyebrow ? `<div class="am-hero__eyebrow">${esc(p.eyebrow)}</div>` : ""}
            ${p.title ? `<h1 class="am-hero__title">${esc(p.title)}</h1>` : ""}
            ${p.subtitle ? `<p class="am-hero__sub">${esc(p.subtitle)}</p>` : ""}
            ${ctaButtons(block, ctx, true)}
          </div>
        </section>`,
      );
    }
    case "text": {
      const align = p.align === "center" ? "center" : "left";
      return wrap(
        `<div class="am-prose am-prose--${["sm", "md", "lg"].includes(p.size) ? p.size : "md"}" style="text-align:${align}">
          ${p.heading ? `<h2 class="am-sec-title" style="margin-bottom:8px">${esc(p.heading)}</h2>` : ""}
          ${p.body ? richText(p.body) : ""}
        </div>`,
      );
    }
    case "image": {
      const src = img(p.image);
      const ratio = ["wide", "square", "tall"].includes(p.ratio) ? p.ratio : "";
      if (!src) return wrap(`<div class="am-empty">Add an image to this block</div>`);
      return wrap(
        `<figure class="am-img ${ratio ? `am-img--${ratio}` : ""}" style="border-radius:${Number(p.radius) || 20}px">
          <img class="am-img__el" src="${esc(src)}" alt="${esc(p.caption || "")}" loading="lazy" ${
            p.fit === "contain" ? 'style="object-fit:contain;background:var(--am-surface)"' : ""
          }>
        </figure>
        ${p.caption ? `<div class="am-prose" style="margin-top:6px"><p style="font-size:12px;color:var(--am-muted)">${esc(p.caption)}</p></div>` : ""}`,
      );
    }
    case "gallery": {
      const rows: any[] = Array.isArray(p.images) ? p.images : [];
      const cols = Math.max(2, Math.min(4, Number(p.columns) || 3));
      const cells = rows
        .map((row) => {
          const src = img(row.image);
          if (!src) return "";
          return `<button class="am-gallery__item" type="button" data-full="${esc(src)}" aria-label="${esc(row.caption || "Open photo")}">
            <img src="${esc(src)}" alt="${esc(row.caption || "")}" loading="lazy">
          </button>`;
        })
        .join("");
      return wrap(
        `${p.title ? `<h2 class="am-sec-title" style="margin-bottom:10px">${esc(p.title)}</h2>` : ""}
        <div class="am-gallery" style="grid-template-columns:repeat(${cols},1fr);border-radius:${Number(p.radius) || 14}px;overflow:hidden">
          ${cells || `<div class="am-gallery__empty" style="grid-column:1/-1">Add photos to the gallery</div>`}
        </div>`,
      );
    }
    case "buttons": {
      const rows: any[] = Array.isArray(p.items) ? p.items : [];
      const stack = p.stack !== false;
      const html = rows
        .map((row) => {
          const url = safeUrl(row.link);
          if (!url) return "";
          const style = ["primary", "secondary", "ghost"].includes(row.style) ? row.style : "primary";
          return `<a class="am-btn am-btn--${style}${stack ? " am-btn--block" : ""}" href="${esc(url)}"${attrLink(url)}>
            ${row.icon ? `<span class="am-btn__ico">${iconSvg(String(row.icon), 17)}</span>` : ""}${esc(row.label || "Button")}
          </a>`;
        })
        .join("");
      return wrap(
        `${p.title ? `<h2 class="am-sec-title" style="margin-bottom:10px">${esc(p.title)}</h2>` : ""}
        <div style="display:flex;flex-direction:${stack ? "column" : "row"};flex-wrap:wrap;gap:8px">${html}</div>`,
      );
    }
    case "features": {
      const rows: any[] = Array.isArray(p.items) ? p.items : [];
      const cols = Math.max(1, Math.min(3, Number(p.columns) || 2));
      const cards = rows
        .map((row) => {
          const url = safeUrl(row.link);
          const inner = `${row.icon ? `<div class="am-feature__ico">${iconSvg(String(row.icon), 18)}</div>` : ""}
            <div class="am-feature__title">${esc(row.title || "")}</div>
            ${row.text ? `<div class="am-feature__text">${esc(row.text)}</div>` : ""}`;
          return url
            ? `<a class="am-feature" href="${esc(url)}"${attrLink(url)}>${inner}</a>`
            : `<div class="am-feature">${inner}</div>`;
        })
        .join("");
      return wrap(
        `${p.title ? `<h2 class="am-sec-title">${esc(p.title)}</h2>` : ""}
        ${p.subtitle ? `<p class="am-sec-sub" style="margin-bottom:10px">${esc(p.subtitle)}</p>` : '<div style="height:10px"></div>'}
        <div class="am-features" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${cards}</div>`,
      );
    }
    case "list": {
      const rows: any[] = Array.isArray(p.items) ? p.items : [];
      const html = rows
        .map((row) => {
          const url = safeUrl(row.link);
          const inner = `${row.icon ? `<div class="am-row__ico">${iconSvg(String(row.icon), 16)}</div>` : ""}
            <div class="am-row__body"><div class="am-row__t">${esc(row.title || "")}</div>
            ${row.subtitle ? `<div class="am-row__s">${esc(row.subtitle)}</div>` : ""}</div>
            ${row.meta ? `<div class="am-row__meta">${esc(row.meta)}</div>` : ""}`;
          return url
            ? `<a class="am-row" href="${esc(url)}"${attrLink(url)}>${inner}</a>`
            : `<div class="am-row">${inner}</div>`;
        })
        .join("");
      return wrap(
        `${p.title ? `<h2 class="am-sec-title" style="margin-bottom:${
          p.note ? "4px" : "10px"
        }">${esc(p.title)}</h2>` : ""}
        ${p.note ? `<p class="am-sec-sub" style="margin-bottom:10px">${esc(p.note)}</p>` : ""}
        ${html ? `<div class="am-rows">${html}</div>` : `<div class="am-empty">Add rows to this list</div>`}`,
      );
    }
    case "form": {
      const rows: any[] = Array.isArray(p.fields) ? p.fields : [];
      const fields = rows
        .map((row, i) => {
          const key = String(row.key || `field_${i + 1}`);
          const type = ["text", "email", "tel", "textarea"].includes(row.type) ? row.type : "text";
          const id = `${block.id}_${key}`;
          return `<div class="am-field">
            <label class="am-label" for="${esc(id)}">${esc(row.label || key)}${row.required ? " *" : ""}</label>
            ${
              type === "textarea"
                ? `<textarea class="am-textarea" id="${esc(id)}" name="${esc(key)}" ${
                    row.required ? "required" : ""
                  } placeholder="${esc(row.label || "")}"></textarea>`
                : `<input class="am-input" id="${esc(id)}" name="${esc(key)}" type="${esc(type)}" ${
                    row.required ? "required" : ""
                  } placeholder="${esc(row.label || "")}">`
            }
          </div>`;
        })
        .join("");
      return wrap(
        `<div class="am-card">
          ${p.title ? `<h2 class="am-sec-title">${esc(p.title)}</h2>` : ""}
          ${p.subtitle ? `<p class="am-sec-sub" style="margin-bottom:12px">${esc(p.subtitle)}</p>` : '<div style="height:12px"></div>'}
          <form class="am-form" data-form="${esc(block.id)}">
            ${fields}
            <button class="am-btn am-btn--primary am-btn--block" type="submit">${esc(p.submitLabel || "Send")}</button>
            <p class="am-form__note">Sent securely to ${esc(config.name)}.</p>
          </form>
        </div>`,
      );
    }
    case "video": {
      const url = String(p.url || "");
      const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
      const vimeo = url.match(/vimeo\.com\/(\d+)/i);
      let src = "";
      if (yt) src = `https://www.youtube.com/embed/${yt[1]}`;
      else if (vimeo) src = `https://player.vimeo.com/video/${vimeo[1]}`;
      return wrap(
        `${p.title ? `<h2 class="am-sec-title" style="margin-bottom:10px">${esc(p.title)}</h2>` : ""}
        ${
          src
            ? `<div class="am-video"><iframe src="${esc(src)}" title="${esc(p.title || "Video")}" loading="lazy" allowfullscreen
                 allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"></iframe></div>`
            : `<div class="am-empty">Paste a YouTube or Vimeo link to embed a video</div>`
        }
        ${p.caption ? `<p class="am-sec-sub" style="margin-top:6px">${esc(p.caption)}</p>` : ""}`,
      );
    }
    case "testimonials": {
      const rows: any[] = Array.isArray(p.items) ? p.items : [];
      const cards = rows
        .map((row) => {
          const av = img(row.avatar);
          const initials = String(row.name || "?")
            .trim()
            .slice(0, 1)
            .toUpperCase();
          return `<div class="am-quote">
            <div class="am-quote__text">“${esc(row.quote || "")}”</div>
            <div class="am-quote__who">
              ${
                av
                  ? `<img class="am-quote__av" src="${esc(av)}" alt="${esc(row.name || "")}" loading="lazy">`
                  : `<div class="am-quote__av">${esc(initials)}</div>`
              }
              <div><div class="am-quote__n">${esc(row.name || "")}</div>${
                row.role ? `<div class="am-quote__r">${esc(row.role)}</div>` : ""
              }</div>
            </div>
          </div>`;
        })
        .join("");
      return wrap(
        `${p.title ? `<h2 class="am-sec-title" style="margin-bottom:10px">${esc(p.title)}</h2>` : ""}
        <div style="display:flex;flex-direction:column;gap:8px">${cards}</div>`,
      );
    }
    case "stats": {
      const rows: any[] = Array.isArray(p.items) ? p.items : [];
      const cells = rows
        .map((row) => `<div class="am-stat"><div class="am-stat__v">${esc(row.value || "")}</div><div class="am-stat__l">${esc(row.label || "")}</div></div>`)
        .join("");
      return wrap(`<div class="am-stats">${cells}</div>`);
    }
    case "faq": {
      const rows: any[] = Array.isArray(p.items) ? p.items : [];
      const items = rows
        .map((row) => `<details><summary>${esc(row.q || "Question")}</summary><div class="am-faq__a">${esc(row.a || "")}</div></details>`)
        .join("");
      return wrap(
        `${p.title ? `<h2 class="am-sec-title" style="margin-bottom:10px">${esc(p.title)}</h2>` : ""}
        <div class="am-faq">${items}</div>`,
      );
    }
    case "cta": {
      const url = safeUrl(p.link);
      return wrap(
        `<div class="am-cta${p.style === "solid" ? " am-cta--solid" : ""}">
          ${p.title ? `<div class="am-cta__t">${esc(p.title)}</div>` : ""}
          ${p.text ? `<div class="am-cta__x">${esc(p.text)}</div>` : ""}
          ${
            url && p.label
              ? `<a class="am-btn am-btn--primary" href="${esc(url)}"${attrLink(url)}>${esc(p.label)}</a>`
              : ""
          }
        </div>`,
      );
    }
    case "socials": {
      const rows: any[] = Array.isArray(p.items) ? p.items : [];
      const links = rows
        .map((row) => {
          const url = safeUrl(row.url);
          if (!url) return "";
          return `<a class="am-social" href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(row.platform || "social")}">${socialSvg(
            String(row.platform || "website"),
            19,
          )}</a>`;
        })
        .join("");
      return wrap(
        `${p.title ? `<h2 class="am-sec-title" style="text-align:center;margin-bottom:10px">${esc(p.title)}</h2>` : ""}
        <div class="am-socials">${links}</div>`,
      );
    }
    case "spacer": {
      const size = ["sm", "md", "lg"].includes(p.size) ? p.size : "md";
      return wrap(
        `<div class="am-spacer--${size}"></div>${p.divider ? '<div class="am-divider"></div>' : ""}`,
        " blk--bare",
      );
    }
    default:
      return "";
  }
}

export function renderPage(page: Page, config: AppConfig, ctx: RenderContext, active: boolean): string {
  return `<section class="am-page${active ? " is-active" : ""}" id="p-${esc(page.slug)}" data-slug="${esc(page.slug)}" data-title="${esc(
    page.name,
  )}">
    ${page.blocks.map((b) => renderBlock(b, config, ctx)).join("\n")}
  </section>`;
}

export function navPages(config: AppConfig): Page[] {
  const pages = config.pages.filter((p) => p.showInNav);
  return pages.length ? pages.slice(0, 5) : config.pages.slice(0, 1);
}

export function renderShell(config: AppConfig, ctx: RenderContext): string {
  const nav = navPages(config);
  const icon = ctx.assetUrl(config.branding.icon);
  const initials = (config.name || "A").trim().slice(0, 1).toUpperCase();
  const showTabs = config.pages.length > 1;

  return `<div class="am-shell">
    <header class="am-bar">
      <div class="am-bar__in">
        <div class="am-bar__logo">${icon ? `<img src="${esc(icon)}" alt="">` : esc(initials)}</div>
        <div class="am-bar__name">${esc(config.name)}</div>
        ${
          config.pwa.pushEnabled && ctx.pushKey
            ? `<button class="am-bar__btn" id="am-bell" type="button" aria-label="Enable notifications">${iconSvg("bell", 18)}</button>`
            : ""
        }
        ${
          config.pwa.installPrompt
            ? `<button class="am-bar__btn" id="am-install" type="button" aria-label="Install app" hidden>${iconSvg(
                "bookmark",
                18,
              )}</button>`
            : ""
        }
      </div>
    </header>
    <main class="am-main" id="am-main">
      ${config.pages
        .map((page, i) => renderPage(page, config, ctx, page.id === config.homePageId || (i === 0 && !config.pages.some((p) => p.id === config.homePageId))))
        .join("\n")}
    </main>
    ${
      showTabs
        ? `<nav class="am-tabs"><div class="am-tabs__in">${nav
            .map(
              (page) =>
                `<a class="am-tab" href="#/${esc(page.slug)}" data-tab="${esc(page.slug)}">${iconSvg(page.icon || "grid", 20)}<span>${esc(
                  page.name,
                )}</span></a>`,
            )
            .join("")}</div></nav>`
        : ""
    }
  </div>
  <div class="am-sheet__scrim" id="am-scrim"></div>
  <section class="am-sheet" id="am-sheet" aria-live="polite">
    <div class="am-sheet__title" id="am-sheet-title"></div>
    <div class="am-sheet__body" id="am-sheet-body"></div>
  </section>
  <div class="am-toast" id="am-toast"></div>
  <div class="am-lightbox" id="am-lightbox"><img alt=""></div>`;
}

/* ------------------------------------------------------------------- gate */

function renderGate(config: AppConfig, ctx: RenderContext): string {
  if (!config.pwa.desktopMode || config.pwa.desktopMode === "app-first") {
    return `<div class="am-gate"></div>`;
  }
  const icon = ctx.assetUrl(config.branding.icon);
  const initials = (config.name || "A").trim().slice(0, 1).toUpperCase();
  return `<div class="am-gate" id="am-gate">
    <div class="am-gate__wrap">
      <div>
        <div class="am-gate__eyebrow">${esc(config.name)}</div>
        <h2 class="am-gate__title">Get ${esc(config.name)} on your phone</h2>
        <p class="am-gate__text">${esc(config.description || "Scan the code with your camera to open the app, then add it to your home screen. It installs like a real app and works offline.")}</p>
        <div class="am-gate__qr">${ctx.qrSvg || ""}</div>
        <p class="am-gate__hint">Open your phone camera, point it at the code and tap the link.</p>
        <div class="am-gate__alt">
          <button class="am-btn am-btn--primary" type="button" id="am-open-here">Open here instead</button>
          <a class="am-gate__link" href="${esc(ctx.publicUrl)}" id="am-copy-link">Copy link</a>
        </div>
      </div>
      <div>
        <div class="am-phone">
          <iframe src="${esc(ctx.publicUrl)}?embed=1" title="${esc(config.name)} preview" loading="lazy"></iframe>
        </div>
        <p class="am-gate__hint" style="text-align:center;margin:14px auto 0">
          ${icon ? "" : `<span class="am-launch__logo" style="display:none">${esc(initials)}</span>`}Live preview · installs on iOS &amp; Android
        </p>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------- html */

export function renderIndexHtml(config: AppConfig, ctx: RenderContext): string {
  const icon = ctx.assetUrl(config.branding.icon);
  const favicon = ctx.assetUrl(config.branding.favicon) || icon;
  const splashLogo = ctx.assetUrl(config.branding.splashLogo) || icon;
  const wallpaper = ctx.assetUrl(config.theme.wallpaper);
  const themeColor = safeColor(config.pwa.themeColor, safeColor(config.theme.background, "#0b0d12"));
  const initials = (config.name || "A").trim().slice(0, 1).toUpperCase();
  const embed = ctx.preview ? "true" : "false";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(config.name)}</title>
<meta name="description" content="${esc(config.description)}">
<meta name="theme-color" content="${esc(themeColor)}">
<meta name="color-scheme" content="${config.theme.dark ? "dark" : "light"}">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" href="./favicon.png" type="image/png">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="${config.theme.dark ? "black-translucent" : "default"}">
<meta name="apple-mobile-web-app-title" content="${esc(config.shortName || config.name)}">
<meta name="application-name" content="${esc(config.name)}">
<meta name="format-detection" content="telephone=no">
<meta property="og:title" content="${esc(config.name)}">
<meta property="og:description" content="${esc(config.description)}">
<meta property="og:type" content="website">
<meta property="og:image" content="./icons/icon-512.png">
<style>
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;min-height:100%}
body{background:${safeColor(config.theme.background, "#0b0d12")};color:${safeColor(config.theme.text, "#f2f4fa")};
  font-family:${FONTS[config.theme.font] ?? FONTS.sans};overscroll-behavior-y:none;-webkit-text-size-adjust:100%}
${appCss(config)}
</style>
</head>
<body class="am-app">
<div class="am-wall"${wallpaper ? ` style="background-image:url('${esc(wallpaper)}')"` : ' style="display:none"'}></div>
<div class="am-launch" id="am-launch">
  <div class="am-launch__logo">${splashLogo ? `<img src="${esc(splashLogo)}" alt="">` : esc(initials)}</div>
  <div class="am-launch__bar"><i></i></div>
</div>
${renderGate(config, ctx)}
${renderShell(config, ctx)}
<script>
window.__AM__=${JSON.stringify({
    slug: ctx.slug,
    appId: ctx.appId,
    api: ctx.apiBase,
    push: config.pwa.pushEnabled ? ctx.pushKey || "" : "",
    contactEmail: config.pwa.contactEmail || "",
    installPrompt: config.pwa.installPrompt,
    offline: config.pwa.offline,
    embed: false,
    sw: !ctx.preview,
  }).replace(/</g, "\\u003c")};
(function(){
  var CFG=window.__AM__||{};
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var isEmbed=/[?&]embed=1/.test(location.search);
  var standalone=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;

  function toast(msg){
    var el=$("#am-toast"); if(!el) return;
    el.textContent=msg; el.classList.add("is-on");
    clearTimeout(el.__t); el.__t=setTimeout(function(){el.classList.remove("is-on")},2600);
  }
  function sheet(title,html){
    var s=$("#am-sheet"),sc=$("#am-scrim");
    if(!s) return;
    $("#am-sheet-title").textContent=title||"";
    $("#am-sheet-body").innerHTML=html||"";
    s.classList.add("is-open"); sc.classList.add("is-open");
  }
  function closeSheet(){
    var s=$("#am-sheet"),sc=$("#am-scrim");
    if(s){s.classList.remove("is-open")} if(sc){sc.classList.remove("is-open")}
  }
  if($("#am-scrim")) $("#am-scrim").addEventListener("click",closeSheet);

  /* ---- routing ---- */
  var pages=$$(".am-page");
  function activate(slug){
    var found=false;
    pages.forEach(function(p){
      var on=p.getAttribute("data-slug")===slug;
      p.classList.toggle("is-active",on);
      if(on){found=true;document.title=p.getAttribute("data-title")+" · "+${JSON.stringify(config.name)};}
    });
    if(!found){ pages.forEach(function(p,i){p.classList.toggle("is-active",i===0)}); }
    $$(".am-tab").forEach(function(t){t.classList.toggle("is-active",t.getAttribute("data-tab")===slug)});
    window.scrollTo({top:0,behavior:"instant"});
  }
  function route(){
    var m=location.hash.match(/^#\\/(.+)$/);
    activate(m?decodeURIComponent(m[1]):"");
  }
  window.addEventListener("hashchange",route);

  /* ---- desktop gate ---- */
  var gate=$("#am-gate");
  var coarse=window.matchMedia("(pointer: coarse)").matches;
  var wantsApp=standalone||isEmbed||/[?&]full=1/.test(location.search)||sessionStorage.getItem("am-open-here")==="1";
  if(gate){
    if(coarse||wantsApp) gate.style.display="none";
    else document.body.classList.add("is-gated");
  }
  var openHere=$("#am-open-here");
  if(openHere) openHere.addEventListener("click",function(){
    sessionStorage.setItem("am-open-here","1");
    document.body.classList.remove("is-gated");
    var t=document.querySelector("#am-toast");
    if(t){t.textContent="Open the app on your phone by scanning the code.";t.classList.add("is-on");
      setTimeout(function(){t.classList.remove("is-on")},3000);}
  });
  var copy=$("#am-copy-link");
  if(copy) copy.addEventListener("click",function(e){
    e.preventDefault();
    var url=${JSON.stringify(ctx.publicUrl)};
    (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){toast("Link copied")})
      .catch(function(){sheet("Copy this link","<p>"+url+"</p>")});
  });

  /* ---- launch screen ---- */
  function hideLaunch(){
    var l=$("#am-launch"); if(!l) return; l.classList.add("is-hidden");
    setTimeout(function(){if(l&&l.parentNode)l.parentNode.removeChild(l)},700);
  }
  window.addEventListener("load",function(){setTimeout(hideLaunch,220)});
  setTimeout(hideLaunch,1800);

  /* ---- install ---- */
  var deferredPrompt=null;
  var installBtn=$("#am-install");
  window.addEventListener("beforeinstallprompt",function(e){
    e.preventDefault(); deferredPrompt=e;
    if(installBtn) installBtn.hidden=false;
  });
  window.addEventListener("appinstalled",function(){toast("Installed — enjoy!"); if(installBtn) installBtn.hidden=true;});
  function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream}
  function showIosInstall(){
    sheet("Add to Home Screen",
      "<p>Open this page in Safari, tap the Share button, then choose <strong>Add to Home Screen</strong>.</p>"+
      "<p style='opacity:.75'>Tip: on Android, use Chrome's menu → Install app.</p>");
  }
  function doInstall(){
    if(deferredPrompt){ deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function(r){ if(r.outcome==="accepted") toast("Installing…"); deferredPrompt=null; });
      return;
    }
    if(standalone){ toast("Already installed"); return; }
    showIosInstall();
  }
  if(installBtn) installBtn.addEventListener("click",doInstall);

  /* ---- notifications ---- */
  function b64ToBytes(b64){
    var pad="=".repeat((4-b64.length%4)%4);
    var s=(b64+pad).replace(/-/g,"+").replace(/_/g,"/");
    var raw=atob(s), out=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i);
    return out;
  }
  var bell=$("#am-bell");
  function markBell(){ if(bell) bell.classList.add("is-on"); }
  if(bell) bell.addEventListener("click",function(){
    if(!("Notification" in window)||!("serviceWorker" in navigator)||!CFG.push){
      sheet("Notifications","<p>This browser doesn't support push notifications. Add the app to your home screen and try again on your phone.</p>");
      return;
    }
    if(Notification.permission==="granted"){ subscribe(true); return; }
    if(Notification.permission==="denied"){
      sheet("Notifications are blocked","<p>Open your browser settings for this site and allow notifications, then try again.</p>");
      return;
    }
    if(isIos()&&!standalone){
      sheet("Install first","<p>On iPhone and iPad, notifications work after you add the app to your home screen.</p>");
      return;
    }
    subscribe(false);
  });
  function subscribe(silent){
    navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.getSubscription().then(function(existing){
        return existing || reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(CFG.push)});
      });
    }).then(function(sub){
      return fetch(CFG.api+"/push/subscribe",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({slug:CFG.slug,subscription:sub.toJSON()})
      }).then(function(r){ if(!r.ok) throw new Error("subscribe failed"); return r; }).then(function(){return sub;});
    }).then(function(){
      markBell();
      if(!silent) toast("Notifications on");
    }).catch(function(){
      if(!silent) toast("Could not enable notifications");
    });
  }
  if(CFG.push && "serviceWorker" in navigator){
    navigator.serviceWorker.ready.then(function(reg){
      reg.pushManager.getSubscription().then(function(sub){ if(sub) markBell(); });
    }).catch(function(){});
  }

  /* ---- register service worker ---- */
  if("serviceWorker" in navigator && ${config.pwa.offline ? "true" : "false"} && CFG.sw && !isEmbed){
    window.addEventListener("load",function(){
      navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(function(){});
    });
  }

  /* ---- forms ---- */
  $$("form[data-form]").forEach(function(form){
    form.addEventListener("submit",function(e){
      e.preventDefault();
      var values={}, fd=new FormData(form);
      fd.forEach(function(v,k){ values[k]=String(v).slice(0,4000); });
      var btn=form.querySelector("button[type=submit]");
      var label=btn?btn.textContent:"";
      if(btn){btn.disabled=true;btn.textContent="Sending…"}
      if(!CFG.api){
        if(!CFG.contactEmail){
          if(btn){btn.disabled=false;btn.textContent=label;}
          toast("This app has no contact email set yet");
          return;
        }
        var lines=[];
        Object.keys(values).forEach(function(k){ lines.push(k+": "+values[k]); });
        location.href="mailto:"+encodeURIComponent(CFG.contactEmail)+
          "?subject="+encodeURIComponent("${config.name} — new message")+
          "&body="+encodeURIComponent(lines.join("\n"));
        if(btn){btn.disabled=false;btn.textContent=label;}
        return;
      }
      fetch(CFG.api+"/forms",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({slug:CFG.slug,block:form.getAttribute("data-form"),page:location.hash||"",values:values})
      }).then(function(r){ if(!r.ok) throw new Error("failed"); return r; })
        .then(function(){
          form.reset();
          if(btn){btn.textContent="Sent ✓"}
          toast("Message sent — thank you!");
          setTimeout(function(){ if(btn){btn.disabled=false;btn.textContent=label;} },2600);
        })
        .catch(function(){
          if(btn){btn.disabled=false;btn.textContent=label;}
          toast("Could not send — please try again");
        });
    });
  });

  /* ---- gallery lightbox ---- */
  var lb=$("#am-lightbox");
  document.addEventListener("click",function(e){
    var t=e.target.closest?e.target.closest("[data-full]"):null;
    if(!t) return;
    var img=lb.querySelector("img");
    img.src=t.getAttribute("data-full"); lb.classList.add("is-open");
  });
  if(lb) lb.addEventListener("click",function(){lb.classList.remove("is-open");lb.querySelector("img").src=""});

  /* ---- push deep links ---- */
  if("serviceWorker" in navigator){
    navigator.serviceWorker.addEventListener("message",function(e){
      if(e.data&&e.data.type==="am-navigate"&&e.data.url){
        var u=String(e.data.url);
        var h=u.indexOf("#");
        if(h>=0){ location.hash=u.slice(h+1); }
        else if(u&&u!==location.href){ location.href=u; }
      }
    });
  }

  /* ---- bookmark shortcut / first run ---- */
  if(!sessionStorage.getItem("am-seen")&&${config.pwa.installPrompt ? "true" : "false"}&&!standalone&&!isEmbed&&!coarse){
    sessionStorage.setItem("am-seen","1");
  }
  route();
})();
</script>
</body>
</html>`;
}

export function renderManifest(config: AppConfig, ctx: RenderContext): string {
  const icon = ctx.assetUrl(config.branding.icon);
  const icons = [
    { src: "./icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "./icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "./icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];
  if (icon) {
    // uploaded icon is copied into the bundle as icon-src
    icons.push({ src: "./icons/icon-src.png", sizes: "1024x1024", type: "image/png", purpose: "any" });
  }
  const shortcuts = (config.pwa.shortcuts || [])
    .filter((s) => s.name && config.pages.some((p) => p.slug === s.page))
    .slice(0, 4)
    .map((s) => ({
      name: s.name,
      url: `./#/${s.page}`,
      icons: [{ src: "./icons/icon-192.png", sizes: "192x192" }],
    }));
  const manifest = {
    name: config.name,
    short_name: config.shortName || config.name.slice(0, 12),
    description: config.description,
    start_url: "./",
    scope: "./",
    id: "./",
    display: config.pwa.display,
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: config.pwa.orientation,
    background_color: safeColor(config.theme.background, "#0b0d12"),
    theme_color: safeColor(config.pwa.themeColor, safeColor(config.theme.background, "#0b0d12")),
    lang: "en",
    dir: "ltr",
    categories: (config.pwa.categories || []).slice(0, 5),
    prefer_related_applications: false,
    icons,
    ...(shortcuts.length ? { shortcuts } : {}),
  };
  return JSON.stringify(manifest, null, 2);
}

export function renderOfflineHtml(config: AppConfig, ctx: RenderContext): string {
  const icon = ctx.assetUrl(config.branding.icon);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(config.name)} — offline</title>
<style>
html,body{height:100%;margin:0}
body{display:grid;place-items:center;background:${safeColor(config.theme.background, "#0b0d12")};
 color:${safeColor(config.theme.text, "#f2f4fa")};font-family:${FONTS[config.theme.font] ?? FONTS.sans};text-align:center;padding:24px}
.logo{width:78px;height:78px;border-radius:22px;margin:0 auto 18px;display:grid;place-items:center;overflow:hidden;
 background:${safeColor(config.theme.primary, "#6d5efc")};font-size:28px;font-weight:800;color:#fff}
.logo img{width:100%;height:100%;object-fit:cover}
h1{font-size:20px;margin:0 0 8px}
p{color:${safeColor(config.theme.muted, "#9aa3b8")};font-size:14px;line-height:1.6;margin:0 0 18px}
a{display:inline-block;padding:11px 18px;border-radius:12px;background:${safeColor(config.theme.primary, "#6d5efc")};
 color:#fff;text-decoration:none;font-weight:600;font-size:14px}
</style></head>
<body><div>
<div class="logo">${icon ? `<img src="${esc(icon)}" alt="">` : esc((config.name || "A").slice(0, 1).toUpperCase())}</div>
<h1>You're offline</h1>
<p>${esc(config.name)} needs a connection for this part.<br>Your cached pages still work.</p>
<a href="./">Try again</a>
</div></body></html>`;
}

export function renderServiceWorker(config: AppConfig, ctx: RenderContext, precache: string[]): string {
  const cacheName = `am-${ctx.slug}-v1`;
  return `/* ${config.name} — generated by App Maker */
const CACHE = ${JSON.stringify(cacheName)};
const ASSETS = ${JSON.stringify(precache, null, 2)};
const OFFLINE_URL = "./offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("am-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match(req).then((hit) => hit || caches.match("./") || caches.match(OFFLINE_URL))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        fetch(req).then((res) => { if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())); }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(OFFLINE_URL));
    })
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(
    self.registration.showNotification(data.title || ${JSON.stringify(config.name)}, {
      body: data.body || "",
      icon: data.icon || "./icons/icon-192.png",
      badge: "./icons/icon-192.png",
      image: data.image || undefined,
      tag: data.tag || "am-message",
      renotify: true,
      data: { url: data.url || "./", id: data.id || "" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) { client.postMessage({ type: "am-navigate", url: target }); return client.focus(); }
      }
      return self.clients.openWindow(target);
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
`;
}
