import { requireAuth } from "@/lib/auth";
import { getDb, getFiles, json, nowIso } from "@/lib/db";
import { deletePrefix, loadApp, readJson, uniqueSlug } from "@/lib/api";
import { sanitizeConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id } = await params;
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);
  const db = await getDb();
  const subs = await db.prepare(`SELECT COUNT(*) AS n FROM push_subs WHERE app_id = ?`).bind(id).first<{ n: number }>();
  const submissions = await db
    .prepare(`SELECT COUNT(*) AS n FROM submissions WHERE app_id = ?`)
    .bind(id)
    .first<{ n: number }>();
  return json({ app: found.app, stats: { subscribers: subs?.n ?? 0, submissions: submissions?.n ?? 0 } });
}

export async function PATCH(request: Request, { params }: Params) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id } = await params;
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);

  const body = await readJson<{ name?: string; slug?: string; config?: unknown }>(request);
  const db = await getDb();
  let slug = found.row.slug;
  let name = found.row.name;

  if (typeof body.name === "string" && body.name.trim()) {
    name = body.name.trim().slice(0, 60);
  }

  if (typeof body.slug === "string" && body.slug.trim()) {
    const requested = body.slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$/.test(requested)) {
      return json({ error: "Use lowercase letters, numbers and dashes only" }, 400);
    }
    if (requested !== slug) {
      if (found.app.status === "published") {
        return json({ error: "Unpublish this app before changing its address" }, 409);
      }
      slug = await uniqueSlug(requested, id);
      if (slug !== requested) return json({ error: "That address is already taken" }, 409);
    }
  }

  let config = found.app.config;
  if (body.config) {
    config = sanitizeConfig(body.config, name);
    name = config.name || name;
  } else if (name !== found.row.name) {
    config = sanitizeConfig({ ...config, name }, name);
  }

  await db
    .prepare(`UPDATE apps SET name = ?, slug = ?, config = ?, updated_at = ? WHERE id = ?`)
    .bind(name, slug, JSON.stringify(config), nowIso(), id)
    .run();

  return json({ ok: true, slug, name, updatedAt: nowIso() });
}

export async function DELETE(request: Request, { params }: Params) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id } = await params;
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);

  const db = await getDb();
  const files = await getFiles();
  await deletePrefix(files, `sites/${found.row.slug}/`);

  const { results: assets } = await db
    .prepare(`SELECT r2_key FROM assets WHERE app_id = ?`)
    .bind(id)
    .all<{ r2_key: string }>();
  if (assets?.length) {
    await files.delete(assets.map((a) => a.r2_key));
  }

  await db.batch([
    db.prepare(`DELETE FROM apps WHERE id = ?`).bind(id),
    db.prepare(`DELETE FROM assets WHERE app_id = ?`).bind(id),
    db.prepare(`DELETE FROM push_subs WHERE app_id = ?`).bind(id),
    db.prepare(`DELETE FROM notifications WHERE app_id = ?`).bind(id),
    db.prepare(`DELETE FROM submissions WHERE app_id = ?`).bind(id),
    db.prepare(`DELETE FROM publishes WHERE app_id = ?`).bind(id),
  ]);

  return json({ ok: true });
}
