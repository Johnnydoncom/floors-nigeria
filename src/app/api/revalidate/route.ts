import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CacheTags } from "@/lib/api/client";

/**
 * On-demand revalidation hook for the Laravel admin (§18, §19).
 *
 * Laravel calls this after a catalogue change so the storefront picks it up
 * immediately instead of waiting for the cache profile to expire.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Unauthorised." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    tags?: string[];
    slug?: string;
  } | null;

  const tags = body?.tags?.length
    ? body.tags
    : [CacheTags.catalog, ...(body?.slug ? [CacheTags.product(body.slug)] : [])];

  // "max" gives stale-while-revalidate: visitors keep seeing the cached page
  // while the next request regenerates it.
  tags.forEach((tag) => revalidateTag(tag, "max"));

  return NextResponse.json({ revalidated: tags });
}
