import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Heart, Sparkles, Trash2, X } from "lucide-react";
import { getFavorites, getSavedVisualizations } from "@/lib/api/account";
import { deleteVisualizationAction, removeFavoriteAction } from "@/app/account/actions";
import { formatDate, naira } from "@/lib/format";
import { ActionButton } from "@/components/account/ActionButton";
import { ConfirmAction } from "@/components/account/ConfirmAction";
import { EmptyState, SectionHeading } from "@/components/account/display";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const [products, visualizations] = await Promise.all([getFavorites(), getSavedVisualizations()]);

  return (
    <div className="space-y-12">
      <section>
        <SectionHeading
          title="Saved products"
          description="Your shortlist. Save a product from its page with the heart button."
        />
        {products.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No saved products"
            action={{ href: "/products", label: "Browse floors" }}
          >
            Tap <span className="font-semibold">Save</span> on any product to keep it here for
            comparing, sharing or quoting later.
          </EmptyState>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <li
                key={product.id}
                className="group relative min-w-0 border border-border transition hover:border-gold"
              >
                <Link href={`/products/${product.slug}`} className="block">
                  <span className="relative block aspect-[4/3] w-full overflow-hidden bg-muted">
                    {product.thumb_url || product.image_url ? (
                      <Image
                        src={(product.image_url ?? product.thumb_url) as string}
                        alt={product.name}
                        fill
                        sizes="(min-width: 1280px) 22vw, (min-width: 640px) 36vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : null}
                  </span>
                  <span className="block p-4 pr-12">
                    <span className="block truncate font-display text-lg">{product.name}</span>
                    <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                      {product.price_from !== null
                        ? `${product.has_price_range ? "From " : ""}${naira(product.price_from)}`
                        : "Price on request"}
                    </span>
                  </span>
                </Link>
                <ActionButton
                  action={removeFavoriteAction.bind(null, product.slug)}
                  label={`Remove ${product.name} from saved products`}
                  className="absolute bottom-4 right-3 grid h-9 w-9 place-items-center text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <X className="h-4 w-4" aria-hidden />
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeading
          title="Room visualisations"
          description="Rooms you've saved from the visualiser. Each has a private link you can send to anyone."
        />
        {visualizations.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No saved visualisations"
            action={{ href: "/visualizer", label: "Open the visualiser" }}
          >
            Upload a photo of your room, try floors on it, and save the ones you like.
          </EmptyState>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2">
            {visualizations.map((visualization) => (
              <li key={visualization.share_token} className="min-w-0 border border-border">
                <Link
                  href={`/visualizer/s/${visualization.share_token}`}
                  className="relative block aspect-[4/3] overflow-hidden bg-muted"
                >
                  {visualization.result_url && (
                    <Image
                      src={visualization.result_url}
                      alt={
                        visualization.product
                          ? `${visualization.product.name} visualised in a room`
                          : "A visualised room"
                      }
                      fill
                      sizes="(min-width: 640px) 36vw, 100vw"
                      className="object-cover"
                    />
                  )}
                </Link>
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {visualization.product?.name ?? "Room visualisation"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {visualization.variant?.name ? `${visualization.variant.name} · ` : ""}
                      Saved {formatDate(visualization.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/visualizer/s/${visualization.share_token}`}
                      aria-label="Open the shareable page"
                      className="grid h-9 w-9 place-items-center text-muted-foreground transition hover:bg-muted hover:text-gold"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                    </Link>
                    <ConfirmAction
                      trigger={
                        <button
                          type="button"
                          aria-label="Delete this visualisation"
                          className="grid h-9 w-9 place-items-center text-muted-foreground transition hover:bg-muted hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      }
                      title="Delete this visualisation?"
                      description="The image is removed and anyone you've sent the link to will no longer be able to open it."
                      confirmLabel="Delete"
                      action={deleteVisualizationAction.bind(null, visualization.share_token)}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
