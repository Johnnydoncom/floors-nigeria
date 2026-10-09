import { NextResponse, type NextRequest } from "next/server";
import { isOrderReference, relay } from "@/lib/api/commerce";

type Params = { params: Promise<{ reference: string }> };

/** An order, for its guest token holder or the signed-in customer who owns it. */
export async function GET(request: NextRequest, { params }: Params) {
  const { reference } = await params;

  if (!isOrderReference(reference)) {
    return NextResponse.json({ message: "Order not found." }, { status: 404 });
  }

  return relay("GET", `/v1/orders/${reference}`, {
    query: { token: request.nextUrl.searchParams.get("token") ?? undefined },
  });
}
