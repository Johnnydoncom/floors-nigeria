import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategory } from "@/lib/api/catalog";
import { absoluteUrl, breadcrumbSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/site/JsonLd";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { CategoryHero } from "@/components/catalog/CategoryHero";
import { hasRefinements, type SearchParamsRecord } from "@/lib/catalog-filters";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParamsRecord>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ slug }, refinements] = await Promise.all([params, searchParams]);
  const category = await getCategory(slug);

  if (!category) {
    return { title: "Category not found", robots: { index: false } };
  }

  const { seo } = category;

  return {
    title: seo.title,
    description:
      seo.description ??
      category.short_description ??
      `Browse ${category.name} from Floor Nigeria — supplied, delivered and installed nationwide.`,
    // Filtered and paginated views point back here, so refinements never
    // compete with the category page in search results.
    alternates: { canonical: seo.canonical ?? `/categories/${category.slug}` },
    robots: hasRefinements(refinements) ? { index: false, follow: true } : undefined,
    openGraph: {
      title: seo.title,
      description: seo.description ?? undefined,
      type: "website",
      images: category.image_url ? [absoluteUrl(category.image_url)] : undefined,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) notFound();

  const trail = [
    { name: "Home", url: "/" },
    { name: "Flooring", url: "/categories" },
    ...(category.parent
      ? [{ name: category.parent.name, url: `/categories/${category.parent.slug}` }]
      : []),
    { name: category.name, url: `/categories/${category.slug}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(trail)} />

      <CategoryHero
        eyebrow={category.parent?.name ?? "Category"}
        title={category.name}
        description={category.description ?? category.short_description}
        imageUrl={category.image_url}
        productCount={category.products_count}
        trail={trail}
      />

      {category.children && category.children.length > 0 && (
        <nav aria-label="Subcategories" className="container-fluid border-b border-border py-6">
          <ul className="flex flex-wrap gap-2">
            {category.children.map((child) => (
              <li key={child.slug}>
                <Link
                  href={`/categories/${child.slug}`}
                  className="inline-flex h-10 items-center border border-border px-4 text-sm transition hover:border-gold hover:text-gold"
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <CatalogBrowser
        basePath={`/categories/${category.slug}`}
        searchParams={searchParams}
        baseFilters={{ categories: [category.slug] }}
        hiddenGroups={["categories"]}
        emptyMessage={`Nothing in ${category.name} matches these filters yet.`}
      />
    </>
  );
}
