import { getDb, json } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  await params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.slice(0, 1000) : "";
  if (!endpoint) return json({ error: "Missing endpoint" }, 400);
  const db = await getDb();
  await db.prepare(`DELETE FROM push_subs WHERE endpoint = ?`).bind(endpoint).run();
  return json({ ok: true });
}
