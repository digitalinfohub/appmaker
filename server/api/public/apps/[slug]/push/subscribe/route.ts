import { getDb, getVapid, json } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const app = await db
    .prepare(`SELECT id, config FROM apps WHERE slug = ?`)
    .bind(slug)
    .first<{ id: string; config: string }>();
  if (!app) return json({ error: "App not found" }, 404);
  const vapid = await getVapid(db);
  return json({ publicKey: vapid.publicKey });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const subscription = body?.subscription;
  const endpoint = typeof subscription?.endpoint === "string" ? subscription.endpoint : "";
  const p256dh = typeof subscription?.keys?.p256dh === "string" ? subscription.keys.p256dh : "";
  const auth = typeof subscription?.keys?.auth === "string" ? subscription.keys.auth : "";
  if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) {
    return json({ error: "Invalid push subscription" }, 400);
  }

  const db = await getDb();
  const app = await db.prepare(`SELECT id FROM apps WHERE slug = ?`).bind(slug).first<{ id: string }>();
  if (!app) return json({ error: "App not found" }, 404);

  const ua = (request.headers.get("user-agent") ?? "").slice(0, 180);
  await db
    .prepare(
      `INSERT INTO push_subs (app_id, endpoint, p256dh, auth, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET app_id = excluded.app_id, p256dh = excluded.p256dh,
         auth = excluded.auth, user_agent = excluded.user_agent`,
    )
    .bind(app.id, endpoint.slice(0, 1000), p256dh.slice(0, 300), auth.slice(0, 100), ua, new Date().toISOString())
    .run();

  return json({ ok: true });
}
