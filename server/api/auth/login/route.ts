import { getStudio, startSession, verifyPasscode } from "@/lib/auth";
import { readJson } from "@/lib/api";
import { json } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson<{ passcode?: string }>(request);
  const passcode = String(body.passcode ?? "");
  const studio = await getStudio();
  if (!studio) return json({ error: "Studio is not set up yet" }, 409);
  if (!passcode) return json({ error: "Enter your passcode" }, 400);
  const ok = await verifyPasscode(passcode);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 350));
    return json({ error: "That passcode is not right" }, 401);
  }
  await startSession();
  return json({ ok: true });
}
