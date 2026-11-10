import { requireAuth } from "@/lib/auth";
import { getDb, json, nowIso } from "@/lib/db";
import { readJson, uniqueSlug, type DbApp } from "@/lib/api";
import { starterConfig } from "@/lib/defaults";
import { countBlocks, sanitizeConfig } from "@/lib/config";
import { rowToApp } from "@/lib/api";

export const dynamic = "force-dynamic";

type ListRow = DbApp & { subs: number; submissions: number; scheduled: number };

export async function GET(request: Request) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT a.*,
        (SELECT COUNT(*) FROM push_subs p WHERE p.app_id = a.id) AS subs,
        (SELECT COUNT(*) FROM submissions s WHERE s.app_id = a.id) AS submissions,
        (SELECT COUNT(*) FROM notifications n WHERE n.app_id = a.id AND n.status = 'scheduled') AS scheduled
      FROM apps a ORDER BY a.updated_at DESC`,
    )
    .all<ListRow>();

  const apps = (results ?? []).map((row) => {
    const app = rowToApp(row);
    const icon = app.config.branding.iconSet?.i192 ?? app.config.branding.icon;
    return {
      id: app.id,
      slug: app.slug,
      name: app.name,
      status: app.status,
      version: app.version,
      publishedAt: app.publishedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      pages: app.config.pages.length,
      blocks: countBlocks(app.config),
      icon: icon ? `/api/media/${icon.id}` : null,
      primary: app.config.theme.primary,
      subscribers: row.subs ?? 0,
      submissions: row.submissions ?? 0,
      scheduled: row.scheduled ?? 0,
      description: app.config.description,
    };
  });

  const totals = apps.reduce(
    (acc, app) => ({
      apps: acc.apps + 1,
      published: acc.published + (app.status === "published" ? 1 : 0),
      subscribers: acc.subscribers + app.subscribers,
      submissions: acc.submissions + app.submissions,
      scheduled: acc.scheduled + app.scheduled,
    }),
    { apps: 0, published: 0, subscribers: 0, submissions: 0, scheduled: 0 },
  );

  return json({ apps, totals });
}

export async function POST(request: Request) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const body = await readJson<{ name?: string; template?: string; description?: string }>(request);
  const name = String(body.name ?? "").trim().slice(0, 60);
  if (!name) return json({ error: "Give your app a name" }, 400);

  const db = await getDb();
  const id = crypto.randomUUID();
  const slug = await uniqueSlug(name);
  const config = sanitizeConfig(starterConfig(String(body.template ?? "blank"), name), name);
  if (body.description) config.description = String(body.description).slice(0, 220);
  if (config.shortName === "Untitled app") config.shortName = name.slice(0, 12);
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO apps (id, slug, name, config, status, version, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'draft', 1, NULL, ?, ?)`,
    )
    .bind(id, slug, name, JSON.stringify(config), now, now)
    .run();

  return json({ app: { id, slug, name, status: "draft" } }, 201);
}
