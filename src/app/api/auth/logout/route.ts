import { type NextRequest, NextResponse } from "next/server";
import { laravelLogout } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("laravel_session");
    const xsrfCookie = cookieStore.get("XSRF-TOKEN");

    if (!sessionCookie) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const setCookieHeaders = await laravelLogout(
      sessionCookie.value,
      xsrfCookie?.value
    );

    const response = NextResponse.json({ ok: true }, { status: 200 });
    for (const cookie of setCookieHeaders) {
      response.headers.append("Set-Cookie", cookie);
    }
    return response;
  } catch (err) {
    console.error("[auth/logout]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
