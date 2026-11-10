import { isAuthed } from "@/lib/auth";
import { getDb, getVapid } from "@/lib/db";
import { loadApp, siteOrigin } from "@/lib/api";
import { buildSite } from "@/lib/siteFiles";
import { qrSvg } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return new Response(
      `<!doctype html><html><body style="margin:0;display:grid;place-items:center;height:100vh;background:#0b0d12;color:#9aa3b8;font-family:system-ui"><p>Sign in to preview this app.</p></body></html>`,
      { status: 401, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
  const { id } = await params;
  const found = await loadApp(id);
  if (!found) {
    return new Response("<h1>App not found</h1>", { status: 404, headers: { "content-type": "text/html" } });
  }

  const origin = siteOrigin(request);
  const db = await getDb();
  const vapid = await getVapid(db);
  const publicUrl = `${origin}/a/${found.row.slug}/`;

  const build = buildSite({
    config: found.app.config,
    appId: found.app.id,
    slug: found.row.slug,
    publicUrl,
    apiBase: `${origin}/api/public/apps/${found.row.slug}`,
    pushKey: vapid.publicKey,
    qrSvg: qrSvg(publicUrl, 148),
    preview: true,
  });

  const index = build.files.find((f) => f.path === "index.html");
  return new Response(index?.body ?? "<h1>Nothing to preview</h1>", {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
