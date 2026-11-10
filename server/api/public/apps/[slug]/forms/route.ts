import { getDb, getFiles, json } from "@/lib/db";
import { loadApp } from "@/lib/api";

export const dynamic = "force-dynamic";

const MAX_SUBMISSION = 12_000;

/**
 * Public form endpoint used by published apps (and by the studio preview).
 * Values are stored verbatim in D1 and surfaced in the app's Inbox.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let body: any;
  try {
    const text = await request.text();
    if (text.length > MAX_SUBMISSION) return json({ error: "Message too long" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const values = body?.values;
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return json({ error: "Invalid form values" }, 400);
  }
  const clean: Record<string, string> = {};
  let total = 0;
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "string") continue;
    const trimmed = value.slice(0, 4000);
    clean[String(key).slice(0, 60)] = trimmed;
    total += trimmed.length;
    if (total > MAX_SUBMISSION) return json({ error: "Message too long" }, 413);
  }
  if (!Object.keys(clean).length) return json({ error: "The form was empty" }, 400);

  const db = await getDb();
  const app = await db
    .prepare(`SELECT id, slug FROM apps WHERE slug = ?`)
    .bind(slug)
    .first<{ id: string; slug: string }>();
  if (!app) return json({ error: "App not found" }, 404);

  const page = typeof body.page === "string" ? body.page.slice(0, 60) : null;
  const formBlock = typeof body.block === "string" ? body.block.slice(0, 60) : "form";
  await db
    .prepare(
      `INSERT INTO submissions (id, app_id, form_block, page, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), app.id, formBlock, page, JSON.stringify(clean), new Date().toISOString())
    .run();

  return json({ ok: true });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await loadApp(slug);
  void found;
  return json({ ok: true });
}
