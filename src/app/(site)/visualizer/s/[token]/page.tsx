import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle, Ruler, Sparkles } from "lucide-react";
import { getVisualization } from "@/lib/api/visualizations";
import { naira, whatsAppLink } from "@/lib/format";
import { orderEnquiry, WHATSAPP_NUMBER } from "@/lib/site-contact";
import { Button } from "@/components/ui/button";

type PageProps = { params: Promise<{ token: string }> };

/**
 * A shared visualization is a private link between a customer and whoever is
 * paying for the floor. It is readable by anyone holding the token, and
 * deliberately kept out of search results.
 */
export const metadata: Metadata = {
  title: "Shared room visualisation",
  robots: { index: false, follow: false },
};

export default async function SharedVisualizationPage({ params }: PageProps) {
  const { token } = await params;
  const visualization = await getVisualization(token);

  // A dead link gets its own explanation rather than the site's 404 page: the
  // visitor followed a link someone sent them, and "this link no longer works"
  // is more use to them than "page not found".
  if (!visualization?.result_url) {
    return <ExpiredLink />;
  }

  const product = visualization.product;
  const variantName = visualization.variant?.name ?? null;

  return (
    <div className="container-fluid grid gap-10 py-10 pt-header lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
          Shared visualisation
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
          {product ? `${product.name} in this room` : "A room, visualised"}
        </h1>

        <div className="relative mt-6 aspect-[4/3] overflow-hidden bg-muted shadow-luxe">
          <Image
            src={visualization.result_url}
            alt={
              product
                ? `${product.name} visualised in a room`
                : "A room with a new floor visualised"
            }
            fill
            sizes="(min-width: 1024px) 66vw, 100vw"
            priority
            className="object-contain"
          />
        </div>

        <p className="mt-4 max-w-2xl text-xs text-muted-foreground">
          This preview is a decision-support tool, not an exact match. Lighting, camera and screen
          differences mean the installed floor will look different — always confirm with a physical
          sample before ordering.
        </p>
      </div>

      <aside className="space-y-4">
        {product ? (
          <>
            <div className="border border-border p-5">
              <p className="font-display text-lg leading-tight">{product.name}</p>
              {variantName && <p className="text-sm text-muted-foreground">{variantName}</p>}
              {product.price_from !== null && (
                <p className="mt-3 font-mono text-xl">{naira(product.price_from)}</p>
              )}

              <div className="mt-4 grid gap-2">
                <Button asChild className="h-11 w-full rounded-none">
                  <Link href={`/products/${product.slug}`}>View this product</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 w-full rounded-none">
                  <Link href={`/calculator?product=${product.slug}`}>
                    <Ruler className="h-4 w-4" aria-hidden />
                    Calculate quantity
                  </Link>
                </Button>
                <a
                  href={whatsAppLink(
                    WHATSAPP_NUMBER,
                    orderEnquiry({ productName: product.name, variantName }),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 border border-border text-sm font-semibold text-[#25D366] transition hover:border-[#25D366] hover:bg-[#25D366]/10"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Ask about this floor
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="border border-border p-5">
            <p className="text-sm text-muted-foreground">
              This visualisation was saved without a product attached.
            </p>
          </div>
        )}

        <div className="border border-border bg-surface p-5">
          <p className="flex items-center gap-2 font-display text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-gold" aria-hidden />
            Try your own room
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Upload a photo of your space and see any of our floors in it.
          </p>
          <Button asChild variant="outline" className="mt-4 h-11 w-full rounded-none">
            <Link href="/visualizer">Open the visualizer</Link>
          </Button>
        </div>
      </aside>
    </div>
  );
}

function ExpiredLink() {
  return (
    <div className="container-fluid grid min-h-[60vh] place-items-center py-16 pt-header text-center">
      <div className="max-w-md">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
          Shared visualisation
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight">This link no longer works.</h1>
        <p className="mt-4 text-muted-foreground">
          The visualisation may have been deleted, or the link copied incompletely. You can make
          your own in a couple of minutes.
        </p>
        <Button asChild className="mt-8 h-11 rounded-none">
          <Link href="/visualizer">Open the visualizer</Link>
        </Button>
      </div>
    </div>
  );
}
