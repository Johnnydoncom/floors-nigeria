import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { api, ApiError, CacheTags } from "@/lib/api/client";
import { getToken } from "@/lib/api/auth";

type Params = { params: Promise<{ product: string }> };

const SLUG = /^[a-z0-9-]{1,160}$/i;

/**
 * Save or remove a product's visualizer texture.
 *
 * The prepared image is passed through to Laravel as it is. On success the
 * catalogue cache is refreshed, so the visualizer — which reads cached catalogue
 * data — lays the new texture straight away rather than in a few hours.
 */
export async function POST(request: NextRequest, { params }: Params) {
  return forward(request, params, "post");
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return forward(request, params, "delete");
}

async function forward(request: NextRequest, params: Params["params"], method: "post" | "delete") {
  const token = await getToken();

  if (!token) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const { product } = await params;

  if (!SLUG.test(product)) {
    return NextResponse.json({ message: "Unknown product." }, { status: 404 });
  }

  const path = `/v1/admin/products/${product}/visualizer-texture`;

  try {
    const payload =
      method === "post"
        ? await api.post(path, { token, body: await request.formData() })
        : await api.delete(path, {
            token,
            query: { variant_id: request.nextUrl.searchParams.get("variant_id") || undefined },
          });

    revalidateTag(CacheTags.catalog, "max");
    revalidateTag(CacheTags.product(product), "max");

    return NextResponse.json(payload, { status: method === "post" ? 201 : 200 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.userMessage, errors: error.validationErrors },
        { status: error.status },
      );
    }

    console.error("[admin:textures:save]", error);
    return NextResponse.json({ message: "Saving is unavailable right now." }, { status: 502 });
  }
}
