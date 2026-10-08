import { NextResponse, type NextRequest } from "next/server";
import { api, ApiError } from "@/lib/api/client";
import { getToken } from "@/lib/api/auth";

/**
 * Products and their visualizer texture status, for the admin texture tool.
 * Staff-only: Laravel checks the `media.update` permission on the token.
 */
export async function GET(request: NextRequest) {
  const token = await getToken();

  if (!token) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const params = request.nextUrl.searchParams;

  try {
    const payload = await api.get("/v1/admin/visualizer-textures", {
      token,
      query: {
        q: params.get("q")?.slice(0, 100) || undefined,
        status: params.get("status") || undefined,
        page: params.get("page") || undefined,
      },
    });

    return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.userMessage }, { status: error.status });
    }

    console.error("[admin:textures]", error);
    return NextResponse.json(
      { message: "The catalogue is unavailable right now." },
      { status: 502 },
    );
  }
}
