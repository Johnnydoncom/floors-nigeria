import { type NextRequest, NextResponse } from "next/server";
import { laravelLogin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ok, setCookieHeaders } = await laravelLogin(body);

    if (!ok) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    // Mirror Laravel's session cookies to the browser
    const response = NextResponse.json({ ok: true }, { status: 200 });
    for (const cookie of setCookieHeaders) {
      response.headers.append("Set-Cookie", cookie);
    }
    return response;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
