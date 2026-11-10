import { getVapid } from "./db";
import { sendPush } from "./push";

export type SendSummary = { sent: number; failed: number; removed: number; error?: string };

type SubRow = {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function sendToSubscribers(
  db: D1Database,
  appId: string,
  payload: { title: string; body: string; url?: string | null; icon?: string | null; id?: string },
): Promise<SendSummary> {
  const vapid = await getVapid(db);
  const { results } = await db
    .prepare(`SELECT id, endpoint, p256dh, auth FROM push_subs WHERE app_id = ?`)
    .bind(appId)
    .all<SubRow>();

  const subscribers = results ?? [];
  if (!subscribers.length) return { sent: 0, failed: 0, removed: 0 };

  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;
  const dead: string[] = [];

  const batches: SubRow[][] = [];
  for (let i = 0; i < subscribers.length; i += 20) batches.push(subscribers.slice(i, i + 20));

  for (const batch of batches) {
    const results = await Promise.all(
      batch.map(async (sub) => {
        const result = await sendPush({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, vapid);
        return { sub, result };
      }),
    );
    for (const { sub, result } of results) {
      if (result.ok) sent++;
      else {
        failed++;
        lastError = result.error;
        if (result.expired) dead.push(sub.endpoint);
      }
    }
  }

  if (dead.length) {
    await db.batch(dead.map((endpoint) => db.prepare(`DELETE FROM push_subs WHERE endpoint = ?`).bind(endpoint)));
  }

  return { sent, failed, removed: dead.length, error: lastError };
}

/** Sends any scheduled notifications whose time has arrived. Safe to call often. */
export async function flushDueNotifications(db: D1Database, limit = 8): Promise<number> {
  const now = new Date().toISOString();
  const { results } = await db
    .prepare(`SELECT * FROM notifications WHERE status = 'scheduled' AND send_at <= ? ORDER BY send_at ASC LIMIT ?`)
    .bind(now, limit)
    .all<{
      id: string;
      app_id: string;
      title: string;
      body: string;
      url: string | null;
      icon: string | null;
    }>();

  let delivered = 0;
  for (const row of results ?? []) {
    const claim = await db
      .prepare(`UPDATE notifications SET status = 'sending' WHERE id = ? AND status = 'scheduled'`)
      .bind(row.id)
      .run();
    if (!claim.meta.changes) continue;

    const summary = await sendToSubscribers(db, row.app_id, {
      title: row.title,
      body: row.body,
      url: row.url,
      icon: row.icon,
      id: row.id,
    });
    const status = summary.sent > 0 || summary.failed === 0 ? "sent" : "failed";
    await db
      .prepare(
        `UPDATE notifications SET status = ?, sent_at = ?, recipients = ?, failures = ?, error = ? WHERE id = ?`,
      )
      .bind(status, new Date().toISOString(), summary.sent, summary.failed, summary.error ?? null, row.id)
      .run();
    delivered += summary.sent;
  }
  return delivered;
}

/**
 * Cheap, throttled flush used on public app requests so scheduled pushes go out
 * even when the studio dashboard is closed.
 */
export async function opportunisticFlush(db: D1Database, appId: string): Promise<void> {
  const key = `flush:${appId}`;
  const row = await db.prepare(`SELECT value FROM meta WHERE key = ?`).bind(key).first<{ value: string }>();
  if (row) {
    const last = Number(row.value);
    if (Number.isFinite(last) && Date.now() - last < 45_000) return;
  }
  await db
    .prepare(`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .bind(key, String(Date.now()))
    .run();
  try {
    await flushDueNotifications(db, 4);
  } catch {
    /* never block serving an app on push delivery */
  }
}
