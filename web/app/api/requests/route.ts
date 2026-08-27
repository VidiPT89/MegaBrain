import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listRecentRequests } from "@/lib/requestLog";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  return NextResponse.json({ requests: await listRecentRequests(userId) });
}
