import { requireAuth } from "@/lib/auth";
import { getDb, json } from "@/lib/db";
import { loadApp } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id } = await params;
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);

  const db = await getDb();
  const { results } = await db
    .prepare(`SELECT * FROM submissions WHERE app_id = ? ORDER BY created_at DESC LIMIT 200`)
    .bind(id)
    .all<{ id: string; form_block: string; page: string | null; payload: string; created_at: string }>();

  return json({
    submissions: (results ?? []).map((row) => ({
      ...row,
      values: (() => {
        try {
          return JSON.parse(row.payload);
        } catch {
          return {};
        }
      })(),
    })),
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id } = await params;
  const url = new URL(request.url);
  const submissionId = url.searchParams.get("submission");
  const db = await getDb();
  if (submissionId) {
    await db.prepare(`DELETE FROM submissions WHERE id = ? AND app_id = ?`).bind(submissionId, id).run();
  } else {
    await db.prepare(`DELETE FROM submissions WHERE app_id = ?`).bind(id).run();
  }
  return json({ ok: true });
}
