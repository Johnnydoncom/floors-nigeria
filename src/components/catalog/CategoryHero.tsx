import Image from "next/image";
import Link from "next/link";

export type BreadcrumbTrail = { name: string; url: string }[];

export type CategoryLink = { name: string; slug: string };

/**
 * The masthead for category and room landing pages.
 *
 * Deliberately short: a heading, one line of orientation, and the imagery —
 * enough for a visitor and a crawler to know where they are, without pushing
 * the products below the fold. The full category copy belongs under the grid,
 * where a shopper who wants it will go looking (§32).
 */
export function CategoryHero({
  eyebrow,
  title,
  lede,
  imageUrl,
  productCount,
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
  productCount?: number;
  trail: BreadcrumbTrail;
  links?: CategoryLink[];
  linksLabel?: string;
  hrefPrefix?: string;
}) {
  return (
    <section className="bg-charcoal-dark pt-header text-primary-foreground">
      <div className="container-fluid grid items-center gap-10 py-10 lg:grid-cols-12 lg:py-14">
        <div className="lg:col-span-7">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/55">
              {trail.map((crumb, index) => (
                <li key={crumb.url} className="flex items-center gap-2">
                  {index > 0 && <span aria-hidden>/</span>}
                  {index === trail.length - 1 ? (
                    <span className="text-gold-light">{crumb.name}</span>
                  ) : (
                    <Link href={crumb.url} className="transition hover:text-primary-foreground">
                      {crumb.name}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <p className="mt-6 font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-light">
            {eyebrow}
          </p>

          <h1 className="mt-2 text-balance font-display text-4xl tracking-tight md:text-5xl">
            {title}
          </h1>

          {lede && (
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-primary-foreground/70">
              {lede}
            </p>
          )}

          {productCount !== undefined && productCount > 0 && (
            <p className="mt-6 inline-flex items-center gap-2 border border-white/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary-foreground/70">
              {productCount} product{productCount === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {imageUrl && (
          <div className="hidden lg:col-span-5 lg:block">
            <div className="relative aspect-[4/3] overflow-hidden shadow-luxe ring-1 ring-white/10">
              <Image
                src={imageUrl}
                alt=""
                fill
                sizes="(min-width: 1024px) 40vw, 0px"
                priority
                className="object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {links.length > 0 && (
        <nav aria-label={linksLabel} className="border-t border-white/10">
          <div className="container-fluid flex items-center gap-3 overflow-x-auto py-4">
            <span className="shrink-0 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">
              {linksLabel}
            </span>
            <ul className="flex gap-2">
              {links.map((link) => (
                <li key={link.slug}>
                  <Link
                    href={`${hrefPrefix}/${link.slug}`}
                    className="inline-flex h-9 items-center whitespace-nowrap border border-white/15 px-3.5 text-sm text-primary-foreground/80 transition hover:border-gold hover:text-gold-light"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </section>
  );
}
