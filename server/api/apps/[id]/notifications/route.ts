import { requireAuth } from "@/lib/auth";
import { getDb, json, nowIso } from "@/lib/db";
import { loadApp } from "@/lib/api";
import { flushDueNotifications } from "@/lib/notify";
import type { NotificationRow } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id } = await params;
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);

  const db = await getDb();
  const { results } = await db
    .prepare(`SELECT * FROM notifications WHERE app_id = ? ORDER BY send_at DESC LIMIT 100`)
    .bind(id)
    .all<NotificationRow>();
  const subs = await db.prepare(`SELECT COUNT(*) AS n FROM push_subs WHERE app_id = ?`).bind(id).first<{ n: number }>();
  const sent = await db
    .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE app_id = ? AND status = 'sent'`)
    .bind(id)
    .first<{ n: number }>();

  return json({
    notifications: results ?? [],
    stats: { subscribers: subs?.n ?? 0, sent: sent?.n ?? 0 },
  });
}

export async function POST(request: Request, { params }: Params) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id } = await params;
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    url?: string;
    icon?: string;
    sendAt?: string;
    mode?: "now" | "schedule";
  };

  const title = String(body.title ?? "").trim().slice(0, 90);
  const message = String(body.body ?? "").trim().slice(0, 320);
  if (!title) return json({ error: "Add a notification title" }, 400);
  if (!message) return json({ error: "Add a message" }, 400);

  let sendAt = nowIso();
  if (body.mode === "schedule") {
    const when = body.sendAt ? new Date(body.sendAt) : null;
    if (!when || Number.isNaN(when.getTime())) return json({ error: "Pick a valid date and time" }, 400);
    if (when.getTime() < Date.now() - 60_000) return json({ error: "Choose a time in the future" }, 400);
    sendAt = when.toISOString();
  }

  const db = await getDb();
  const notifId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO notifications (id, app_id, title, body, url, icon, status, send_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`,
    )
    .bind(
      notifId,
      id,
      title,
      message,
      body.url ? String(body.url).slice(0, 300) : null,
      body.icon ? String(body.icon).slice(0, 300) : null,
      sendAt,
      nowIso(),
    )
    .run();

  if (body.mode !== "schedule") {
    await flushDueNotifications(db, 5);
  }

  const row = await db.prepare(`SELECT * FROM notifications WHERE id = ?`).bind(notifId).first<NotificationRow>();
  return json({ notification: row }, 201);
}
