import { NextResponse } from "next/server";
import { relay } from "@/lib/api/commerce";

/**
 * Places an order. The response carries the gateway URL to send the shopper
 * to, or the bank details for a transfer, and the order's guest access token.
 */
export async function POST(request: Request) {
  const site = request.headers.get("sec-fetch-site");

  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.json({ message: "Cross-site requests are not allowed." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  return relay("POST", "/v1/orders", { body, status: 201 });
}
