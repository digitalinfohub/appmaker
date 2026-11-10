import { requireAuth } from "@/lib/auth";
import { getDb, json } from "@/lib/db";
import { flushDueNotifications } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  await params;
  const db = await getDb();
  const delivered = await flushDueNotifications(db, 10);
  return json({ delivered });
}
