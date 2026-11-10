import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, getFiles } from "@/lib/db";
import { opportunisticFlush } from "@/lib/notify";
import { contentTypeForPath } from "@/lib/siteFiles";
import { esc, safeColor } from "@/lib/render";
import { sanitizeConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

function notFoundPage(title: string, message: string, accent = "#6d5efc", bg = "#0b0d12"): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>html,body{height:100%;margin:0}body{display:grid;place-items:center;background:${safeColor(bg, "#0b0d12")};
color:#f2f4fa;font-family:ui-sans-serif,system-ui,sans-serif;text-align:center;padding:24px}
.b{width:46px;height:46px;border-radius:14px;background:${safeColor(accent, "#6d5efc")};margin:0 auto 18px}
h1{font-size:20px;margin:0 0 8px}p{color:#9aa3b8;font-size:14px;line-height:1.6;margin:0}</style></head>
<body><div><div class="b"></div><h1>${esc(title)}</h1><p>${esc(message)}</p></div></body></html>`;
  return new Response(html, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; path?: string[] }> },
) {
  const { slug, path } = await params;
  if (!/^[a-z0-9-]{1,48}$/.test(slug)) return notFoundPage("Not found", "That app address doesn't exist.");

  const db = await getDb();
  const app = await db
    .prepare(`SELECT id, config, status, slug FROM apps WHERE slug = ?`)
    .bind(slug)
    .first<{ id: string; config: string; status: string; slug: string }>();

  if (!app) return notFoundPage("Not found", "That app address doesn't exist.");
  if (app.status !== "published") {
    return notFoundPage("Not published yet", "This app is still being built. Check back soon.");
  }

  const url = new URL(request.url);
  if (!url.pathname.endsWith("/")) {
    return Response.redirect(`${url.origin}${url.pathname}/${url.search}`, 308);
  }

  let filePath = (path ?? []).join("/");
  if (!filePath || filePath.endsWith("/")) filePath += "index.html";
  if (filePath.includes("..") || filePath.startsWith("/") || !/^[A-Za-z0-9._/-]{1,160}$/.test(filePath)) {
    return notFoundPage("Not found", "That file doesn't exist.");
  }

  const files = await getFiles();
  const object = await files.get(`sites/${app.slug}/${filePath}`);
  if (!object) {
    if (filePath === "index.html") {
      try {
        const config = sanitizeConfig(JSON.parse(app.config), app.slug);
        return notFoundPage("Not published yet", "This app has not been published.", config.theme.primary, config.theme.background);
      } catch {
        /* fall through */
      }
    }
    return notFoundPage("Not found", "That file doesn't exist.");
  }

  try {
    const context = await getCloudflareContext({ async: true });
    const pending = opportunisticFlush(db, app.id);
    (context.ctx as unknown as { waitUntil?: (p: Promise<unknown>) => void })?.waitUntil?.(pending);
  } catch {
    /* flushing is best-effort */
  }

  const isEntry = filePath === "index.html" || filePath === "sw.js" || filePath === "manifest.webmanifest";
  const headers = new Headers({
    "content-type": object.httpMetadata?.contentType || contentTypeForPath(filePath),
    "cache-control": isEntry ? "no-cache, must-revalidate" : "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    etag: object.httpEtag,
  });
  if (filePath === "sw.js") {
    headers.set("service-worker-allowed", `/a/${app.slug}/`);
    headers.set("content-type", "text/javascript; charset=utf-8");
  }
  return new Response(object.body as unknown as ReadableStream, { headers });
}
