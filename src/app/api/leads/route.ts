import { NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api/client";
import { getClientIp, getToken } from "@/lib/api/auth";
import type { Envelope } from "@/lib/api/types";

type SubmittedQuote = { reference: string };

/**
 * Lead capture from the room visualizer: quote requests and sample orders.
 *
 * Both become a quote in the CRM (§13, §35) — with a lead, an opportunity, and
 * the visitor's own visualisation attached — through the same endpoint as the
 * quote form, so sales see one queue. The multipart body is passed through
 * untouched; the visitor's token and IP are attached here, server-side, so
 * signed-in visitors are linked to their account and throttling sees the real
 * client rather than this server.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();

    const { data } = await api.post<Envelope<SubmittedQuote>>("/v1/quotes", {
      body: form,
      token: await getToken(),
      clientIp: await getClientIp(),
    });

    return NextResponse.json({ reference: data.reference }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.userMessage, errors: error.validationErrors },
        { status: error.status },
      );
    }

    console.error("[leads]", error);
    return NextResponse.json(
      { message: "We could not send that just now. Please try again, or message us on WhatsApp." },
      { status: 502 },
    );
  }
}
