import { NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api/client";
import { getClientIp, getGuestSessionToken, getToken } from "@/lib/api/auth";
import { absoluteUrl } from "@/lib/structured-data";
import type { Envelope } from "@/lib/api/types";

type SavedVisualization = { share_token: string; result_url: string | null };

/**
 * Saves a rendered visualization.
 *
 * The browser produces the image, so this hands the multipart body straight to
 * Laravel — keeping the API base URL and the visitor's token server-side — and
 * returns the shareable page URL rather than the raw API payload.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();

    const guestSession = await getGuestSessionToken();

    const { data } = await api.post<Envelope<SavedVisualization>>("/v1/visualizations", {
      body: form,
      token: await getToken(),
      clientIp: await getClientIp(),
      // A guest's designs are tied to their browser session, so they can be
      // found again from the account once the visitor signs up (§14).
      headers: guestSession ? { "X-Session-Token": guestSession } : undefined,
    });

    return NextResponse.json(
      {
        share_token: data.share_token,
        share_url: absoluteUrl(`/visualizer/s/${data.share_token}`),
        result_url: data.result_url,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.userMessage, errors: error.validationErrors },
        { status: error.status },
      );
    }

    console.error("[visualizations]", error);
    return NextResponse.json({ message: "Saving is unavailable right now." }, { status: 502 });
  }
}
