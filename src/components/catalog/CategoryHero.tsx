import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

export type BreadcrumbTrail = { name: string; url: string }[];

export type CategoryLink = { name: string; slug: string };

/**
 * The masthead for category and room landing pages.
 *
 * Compact on purpose: where you are, one line of orientation, the
 * subcategories, and the way into the room visualizer — then the products,
 * which start above the fold. The full category copy belongs under the grid,
 * where a shopper who wants it will go looking (§32).
 *
 * It names no product count. The category's own count leaves out its
 * subcategories, so it disagreed with the grid's; the toolbar's count is the
 * one that matches what is shown.
 */
export function CategoryHero({
  eyebrow,
  title,
  lede,
  imageUrl,
  trail,
  links = [],
  linksLabel = "Browse",
  hrefPrefix = "/products",
}: {
  eyebrow: string;
  title: string;
  /** One sentence. Anything longer belongs below the products. */
  lede?: string | null;
  imageUrl?: string | null;
  trail: BreadcrumbTrail;
  links?: CategoryLink[];
  linksLabel?: string;
  hrefPrefix?: string;
}) {
  return (
    <section className="border-b border-border bg-surface/50 pt-header">
      <div className="container-fluid py-6 lg:py-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {trail.map((crumb, index) => (
              <li key={crumb.url} className="flex items-center gap-2">
                {index > 0 && <span aria-hidden>/</span>}
                {index === trail.length - 1 ? (
                  <span className="text-foreground">{crumb.name}</span>
                ) : (
                  <Link href={crumb.url} className="transition hover:text-foreground">
                    {crumb.name}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
              {eyebrow}
            </p>
            <h1 className="mt-1 text-balance font-display text-3xl tracking-tight md:text-4xl">
              {title}
            </h1>
            {lede && (
              <p className="mt-2 line-clamp-2 text-base leading-relaxed text-muted-foreground">
                {lede}
              </p>
            )}
          </div>

          <Link
            href="/visualizer"
            className="group flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-background p-2 pr-4 transition hover:border-gold hover:shadow-luxe sm:w-auto"
          >
            <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image
                src={imageUrl ?? "/rooms/loft-lounge/thumb.webp"}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden />
                See these floors in your room
              </span>
              <span className="block text-xs text-muted-foreground">
                Upload a photo, or try one of ours
              </span>
            </span>
            <ArrowUpRight
              className="ml-auto h-4 w-4 shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>

        {links.length > 0 && (
          <nav aria-label={linksLabel} className="mt-5">
            <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
              {links.map((link) => (
                <li key={link.slug}>
                  <Link
                    href={`${hrefPrefix}/${link.slug}`}
                    className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-border bg-background px-4 text-sm transition hover:border-charcoal hover:bg-charcoal hover:text-primary-foreground"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}
