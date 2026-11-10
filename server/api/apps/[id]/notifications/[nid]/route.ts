import { requireAuth } from "@/lib/auth";
import { getDb, json } from "@/lib/db";
import { loadApp } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; nid: string }> },
) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id, nid } = await params;
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);

  const db = await getDb();
  const row = await db
    .prepare(`SELECT status, app_id FROM notifications WHERE id = ?`)
    .bind(nid)
    .first<{ status: string; app_id: string }>();
  if (!row || row.app_id !== id) return json({ error: "Notification not found" }, 404);

  if (row.status === "scheduled") {
    await db.prepare(`UPDATE notifications SET status = 'cancelled' WHERE id = ?`).bind(nid).run();
  } else {
    await db.prepare(`DELETE FROM notifications WHERE id = ?`).bind(nid).run();
  }
  return json({ ok: true });
}
