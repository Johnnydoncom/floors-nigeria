import { relay } from "@/lib/api/commerce";

/**
 * Prices the browser's cart against live catalogue data and the checkout
 * settings (delivery, installation, VAT, payment methods).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  return relay("POST", "/v1/checkout/summary", { body });
}
