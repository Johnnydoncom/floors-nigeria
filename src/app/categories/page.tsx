import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getCategories } from "@/lib/api/catalog";
import { breadcrumbSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/site/JsonLd";

export const metadata: Metadata = {
  title: "Flooring Categories",
  description:
    "Every flooring family Floor Nigeria supplies — SPC and vinyl, engineered wood, artificial grass, epoxy, mats, wall panels and accessories.",
  alternates: { canonical: "/categories" },
};

/**
 * The directory of category landing pages: one crawlable link per category,
 * which is how search engines discover the catalogue (§18).
 */
export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Flooring", url: "/categories" },
        ])}
      />

      <section className="bg-charcoal-dark pb-12 pt-header text-primary-foreground">
        <div className="container-fluid pt-8">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-light">
            Categories
          </p>
          <h1 className="mt-3 max-w-3xl text-balance font-display text-4xl tracking-tight md:text-5xl">
            Every surface we supply, by family.
          </h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/75">
            Pick a material to see what we stock, or browse the whole catalogue and filter by room,
            look, finish and budget.
          </p>
        </div>
      </section>

      <div className="container-fluid grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <article key={category.slug} className="group border border-border bg-card">
            <Link
              href={`/categories/${category.slug}`}
              className="relative block aspect-[5/3] overflow-hidden bg-muted"
            >
              {category.image_url ? (
                <Image
                  src={category.image_url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <span className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-muted),var(--color-surface))]" />
              )}
            </Link>

            <div className="p-5">
              <h2 className="font-display text-xl tracking-tight">
                <Link href={`/categories/${category.slug}`} className="transition hover:text-gold">
                  {category.name}
                </Link>
              </h2>

              {category.short_description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {category.short_description}
                </p>
              )}

              {category.children && category.children.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {category.children.slice(0, 4).map((child) => (
                    <li key={child.slug}>
                      <Link
                        href={`/categories/${child.slug}`}
                        className="inline-flex h-8 items-center border border-border px-3 text-xs transition hover:border-gold hover:text-gold"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
