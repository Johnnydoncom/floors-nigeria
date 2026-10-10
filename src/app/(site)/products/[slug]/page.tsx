import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getCategory } from "@/lib/api/catalog";
import { breadcrumbSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/site/JsonLd";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { CategoryDescription } from "@/components/catalog/CategoryDescription";
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

  return pageMetadata({
    title: seo.title,
    description:
      seo.description ??
      category.short_description ??
      `Browse ${category.name} from Floor Nigeria — supplied, delivered and installed nationwide.`,
    // Filtered and paginated views point back here, so refinements never
    // compete with the category page in search results.
    path: seo.canonical ?? `/products/${category.slug}`,
    noindex: hasRefinements(refinements),
    image: category.image_url,
    imageAlt: `${category.name} flooring`,
    keywords: [category.name, `${category.name} Nigeria`, `${category.name} Lagos`],
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) notFound();

  const trail = [
    { name: "Home", url: "/" },
    { name: "Products", url: "/products" },
    ...(category.parent
      ? [{ name: category.parent.name, url: `/products/${category.parent.slug}` }]
      : []),
    { name: category.name, url: `/products/${category.slug}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(trail)} />

      <CategoryHero
        eyebrow={category.parent?.name ?? "Category"}
        title={category.name}
        lede={category.short_description}
        imageUrl={category.image_url}
        productCount={category.products_count}
        trail={trail}
        links={category.children ?? []}
        linksLabel="In this category"
      />

      <CatalogBrowser
        basePath={`/products/${category.slug}`}
        searchParams={searchParams}
        baseFilters={{ categories: [category.slug] }}
        hiddenGroups={["categories"]}
        emptyMessage={`Nothing in ${category.name} matches these filters yet.`}
      />

      <CategoryDescription title={category.name} text={category.description} />
    </>
  );
}
