import { requireAuth } from "@/lib/auth";
import { getDb, getFiles, json } from "@/lib/db";
import { loadApp, siteOrigin } from "@/lib/api";
import { publishApp, unpublishApp } from "@/lib/publish";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id } = await params;
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);

  const db = await getDb();
  const files = await getFiles();
  const origin = siteOrigin(request);

  try {
    const result = await publishApp({ app: found.app, db, files, origin });
    return json(result);
  } catch (error) {
    return json({ error: `Publish failed: ${(error as Error).message}` }, 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const deny = await requireAuth(request);
  if (deny) return deny;
  const { id } = await params;
  const found = await loadApp(id);
  if (!found) return json({ error: "App not found" }, 404);
  const db = await getDb();
  const files = await getFiles();
  await unpublishApp(found.app, db, files);
  return json({ ok: true });
}
