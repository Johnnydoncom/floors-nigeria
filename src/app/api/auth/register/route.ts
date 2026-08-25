import { NextResponse } from "next/server";
import { register, type RegistrationDetails } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegistrationDetails;
    const { user } = await register(body);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.userMessage, errors: error.validationErrors },
        { status: error.status },
      );
    }

    console.error("[auth/register]", error);
    return NextResponse.json(
      { message: "Registration is unavailable right now." },
      { status: 502 },
    );
  }
}
