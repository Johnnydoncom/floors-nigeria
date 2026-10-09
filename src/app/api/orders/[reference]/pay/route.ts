import { NextResponse } from "next/server";
import { isOrderReference, relay } from "@/lib/api/commerce";

type Params = { params: Promise<{ reference: string }> };

/** A new payment attempt for an unpaid order; returns the gateway URL. */
export async function POST(request: Request, { params }: Params) {
  const { reference } = await params;
  const site = request.headers.get("sec-fetch-site");

  if (!isOrderReference(reference)) {
    return NextResponse.json({ message: "Order not found." }, { status: 404 });
  }

  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.json({ message: "Cross-site requests are not allowed." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { token?: string; gateway?: string };

  return relay("POST", `/v1/orders/${reference}/pay`, {
    body: { token: body.token, gateway: body.gateway },
  });
}
