import { NextResponse, type NextRequest } from "next/server";
import { api, ApiError } from "@/lib/api/client";
import { getClientIp, getToken } from "@/lib/api/auth";
import type { Envelope, ProductCard } from "@/lib/api/types";

/**
 * Saved-product state for the product page's Save button.
 *
 * The product page is prerendered and shared by every visitor, so whether
 * *this* visitor has saved it is asked for separately, from the browser. The
 * token stays in its HTTP-only cookie; this handler attaches it server-side.
 */

const unauthenticated = () =>
  NextResponse.json({ authenticated: false, saved: false }, { status: 401 });

function failure(error: unknown, context: string) {
  if (error instanceof ApiError) {
    if (error.status === 401) return unauthenticated();
    return NextResponse.json({ message: error.userMessage }, { status: error.status });
  }

  console.error(`[favorites:${context}]`, error);
  return NextResponse.json({ message: "Saving is unavailable right now." }, { status: 502 });
}

function productId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(request: NextRequest) {
  const token = await getToken();
  const id = productId(request.nextUrl.searchParams.get("product"));

  if (!token) return NextResponse.json({ authenticated: false, saved: false });
  if (!id) return NextResponse.json({ message: "A product id is required." }, { status: 400 });

  try {
    const { data } = await api.get<Envelope<ProductCard[]>>("/v1/me/favorites", { token });
    return NextResponse.json(
      { authenticated: true, saved: data.some((product) => product.id === id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return NextResponse.json({ authenticated: false, saved: false });
    }
    return failure(error, "status");
  }
}

export async function POST(request: NextRequest) {
  const token = await getToken();
  if (!token) return unauthenticated();

  const body = (await request.json().catch(() => ({}))) as {
    product_id?: unknown;
    product_variant_id?: unknown;
  };
  const id = productId(body.product_id);
  if (!id) return NextResponse.json({ message: "A product id is required." }, { status: 400 });

  try {
    await api.post("/v1/me/favorites", {
      token,
      clientIp: await getClientIp(),
      body: { product_id: id, product_variant_id: productId(body.product_variant_id) },
    });
    return NextResponse.json({ authenticated: true, saved: true }, { status: 201 });
  } catch (error) {
    return failure(error, "save");
  }
}

export async function DELETE(request: NextRequest) {
  const token = await getToken();
  if (!token) return unauthenticated();

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json({ message: "A product slug is required." }, { status: 400 });
  }

  try {
    await api.delete(`/v1/me/favorites/${slug}`, { token, clientIp: await getClientIp() });
    return NextResponse.json({ authenticated: true, saved: false });
  } catch (error) {
    return failure(error, "remove");
  }
}
