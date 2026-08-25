import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user }, { status: 200 });
}
