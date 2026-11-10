import { studioStatus } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await studioStatus(), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ configured: false, authed: false, error: (error as Error).message }, { status: 500 });
  }
}
