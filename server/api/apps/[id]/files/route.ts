import { requireAuth } from "@/lib/auth";
import { getDb, getFiles, json } from "@/lib/db";
import { loadApp } from "@/lib/api";
import { contentTypeForPath } from "@/lib/siteFiles";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id } = await params;
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);

  const url = new URL(request.url);
  const requestedPath = url.searchParams.get("path");
  const files = await getFiles();
  const prefix = `sites/${found.row.slug}/`;

  if (requestedPath) {
    if (requestedPath.includes("..") || requestedPath.startsWith("/")) return json({ error: "Invalid path" }, 400);
    const object = await files.get(`${prefix}${requestedPath}`);
    if (!object) return json({ error: "File not found" }, 404);
    return new Response(object.body as unknown as ReadableStream, {
      headers: {
        "content-type": contentTypeForPath(requestedPath),
        "content-disposition": `inline; filename="${requestedPath.split("/").pop()}"`,
        "cache-control": "no-store",
      },
    });
  }

  const { objects } = await files.list({ prefix, limit: 1000 });
  const entries = objects
    .map((object) => ({
      path: object.key.slice(prefix.length),
      size: object.size,
      updatedAt: object.uploaded?.toISOString() ?? null,
      contentType: contentTypeForPath(object.key),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const db = await getDb();
  const publishRow = await db
    .prepare(`SELECT files, bytes, published_at FROM publishes WHERE app_id = ?`)
    .bind(id)
    .first<{ files: number; bytes: number; published_at: string }>();

  return json({
    published: found.app.status === "published",
    slug: found.row.slug,
    files: entries,
    totalBytes: entries.reduce((n, f) => n + f.size, 0),
    lastPublish: publishRow ?? null,
  });
}
