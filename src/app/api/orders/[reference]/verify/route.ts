import { NextResponse } from "next/server";
import { isOrderReference, relay } from "@/lib/api/commerce";

type Params = { params: Promise<{ reference: string }> };

/**
 * After the gateway sends the shopper back: Laravel asks the gateway what
 * happened before the order page shows an outcome.
 */
export async function POST(request: Request, { params }: Params) {
  const { reference } = await params;

  if (!isOrderReference(reference)) {
    return NextResponse.json({ message: "Order not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { token?: string };

  return relay("POST", `/v1/orders/${reference}/verify`, { body: { token: body.token } });
}
