import { NextResponse } from "next/server";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

/**
 * Exchanges credentials for a Sanctum token server-side and stores it in an
 * HTTP-only cookie, so the token never reaches browser JavaScript (§27).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email: string; password: string };
    const { user } = await login(body);

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.userMessage, errors: error.validationErrors },
        { status: error.status },
      );
    }

    console.error("[auth/login]", error);
    return NextResponse.json({ message: "Sign-in is unavailable right now." }, { status: 502 });
  }
}
