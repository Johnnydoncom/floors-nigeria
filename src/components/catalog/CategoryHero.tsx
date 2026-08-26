import Image from "next/image";
import Link from "next/link";

export type BreadcrumbTrail = { name: string; url: string }[];

/**
 * The masthead shared by category and room landing pages: a breadcrumb trail,
 * the page's own copy for search engines to index, and its imagery (§18, §32).
 */
export function CategoryHero({
  eyebrow,
  title,
  description,
  imageUrl,
  productCount,
  trail,
}: {
  eyebrow: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  productCount?: number;
  trail: BreadcrumbTrail;
}) {
  return (
    <section className="relative bg-charcoal-dark pt-header text-primary-foreground">
      {imageUrl && (
        <>
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover opacity-25"
          />
          <span
            className="absolute inset-0 bg-gradient-to-r from-charcoal-dark via-charcoal-dark/85 to-transparent"
            aria-hidden
          />
        </>
      )}

      <div className="container-fluid relative pb-12 pt-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">
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

        <h1 className="mt-3 max-w-3xl text-balance font-display text-4xl tracking-tight md:text-5xl">
          {title}
        </h1>

        {description && <p className="mt-4 max-w-2xl text-primary-foreground/75">{description}</p>}

        {productCount !== undefined && productCount > 0 && (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-primary-foreground/55">
            {productCount} product{productCount === 1 ? "" : "s"}
          </p>
        )}
      </div>
    </section>
  );
}
