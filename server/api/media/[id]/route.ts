import { getDb, getFiles } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const row = await db
    .prepare(`SELECT r2_key, content_type FROM assets WHERE id = ?`)
    .bind(id)
    .first<{ r2_key: string; content_type: string }>();
  if (!row) return new Response("Not found", { status: 404 });

  const files = await getFiles();
  const object = await files.get(row.r2_key);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body as unknown as ReadableStream, {
    headers: {
      "content-type": row.content_type || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      etag: object.httpEtag,
      "x-content-type-options": "nosniff",
    },
  });
}
