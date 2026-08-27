import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStats } from "@/lib/stats";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  return NextResponse.json(await getStats(userId));
}
