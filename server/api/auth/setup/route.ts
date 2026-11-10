import { createStudio, getStudio, startSession } from "@/lib/auth";
import { readJson } from "@/lib/api";
import { json } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson<{ passcode?: string }>(request);
  const passcode = String(body.passcode ?? "");
  const existing = await getStudio();
  if (existing) return json({ error: "Studio is already set up" }, 409);
  try {
    await createStudio(passcode);
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
  await startSession();
  return json({ ok: true });
}
