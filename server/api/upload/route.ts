import { requireAuth } from "@/lib/auth";
import { getDb, getFiles, json, nowIso } from "@/lib/db";
import { extForMime } from "@/lib/siteFiles";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const deny = await requireAuth(request);
  if (deny) return deny;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Upload failed — the file is too large or the request was interrupted" }, 400);
  }

  const file = form.get("file");
  const appId = String(form.get("appId") ?? "");
  const width = Number(form.get("width") ?? 0);
  const height = Number(form.get("height") ?? 0);

  if (!(file instanceof File)) return json({ error: "No file received" }, 400);
  if (file.size === 0) return json({ error: "That file is empty" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Images must be under 10MB" }, 413);
  const type = (file.type || "").toLowerCase();
  if (!/^image\/(png|jpeg|jpg|webp|gif|svg\+xml|avif)$/.test(type)) {
    return json({ error: "Use a PNG, JPG, WEBP, GIF, AVIF or SVG image" }, 415);
  }

  const id = crypto.randomUUID();
  const key = `assets/${id}.${extForMime(type)}`;
  const files = await getFiles();
  await files.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" },
  });

  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO assets (id, app_id, filename, content_type, size, r2_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, appId || null, String(file.name || "image").slice(0, 160), type, file.size, key, nowIso())
    .run();

  return json({
    asset: {
      id,
      name: String(file.name || "image").slice(0, 120),
      type,
      width: Number.isFinite(width) && width > 0 ? width : undefined,
      height: Number.isFinite(height) && height > 0 ? height : undefined,
      url: `/api/media/${id}`,
      size: file.size,
    },
  });
}
