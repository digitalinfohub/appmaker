import { requireAuth } from "@/lib/auth";
import { getDb, json, nowIso } from "@/lib/db";
import { loadApp, uniqueSlug } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id } = await params;
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);

  const db = await getDb();
  const newId = crypto.randomUUID();
  const name = `${found.app.name} copy`.slice(0, 60);
  const slug = await uniqueSlug(`${found.app.slug}-copy`);
  const now = nowIso();
  const config = { ...found.app.config, name, shortName: name.slice(0, 14) };

  await db
    .prepare(
      `INSERT INTO apps (id, slug, name, config, status, version, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'draft', 1, NULL, ?, ?)`,
    )
    .bind(newId, slug, name, JSON.stringify(config), now, now)
    .run();

  return json({ app: { id: newId, slug, name } }, 201);
}
