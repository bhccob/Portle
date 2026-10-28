import { NextResponse } from "next/server";
import { assertRateLimit, RateLimitError } from "@/server/rate-limit";
import { exportUserData } from "@/server/services/account";
import { getSession } from "@/server/session";

/** GDPR data export for the signed-in member only. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    assertRateLimit(`export:${session.user.id}`, 5, 3600_000);
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    throw e;
  }
  const data = await exportUserData(session.user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="porfael-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
