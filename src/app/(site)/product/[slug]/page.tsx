import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getProduct } from "@/lib/api/catalog";
import { breadcrumbSchema, productSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/site/JsonLd";
import { RichText } from "@/components/site/RichText";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ProductPurchasePanel } from "@/components/catalog/ProductPurchasePanel";
import { ProductSpecifications } from "@/components/catalog/ProductSpecifications";
import { ProductDocuments } from "@/components/catalog/ProductDocuments";
import { ProductReviews } from "@/components/catalog/ProductReviews";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Product not found", robots: { index: false } };
  }

  const { seo } = product;

  return pageMetadata({
    title: seo.title,
    description: seo.description ?? product.short_description,
    path: seo.canonical ?? `/product/${product.slug}`,
    image: seo.og_image ?? product.image_url,
    imageAlt: product.name,
    keywords: [product.name, product.category?.name, product.brand?.name].filter(
      (keyword): keyword is string => Boolean(keyword),
    ),
    noindex: seo.noindex,
    follow: !seo.noindex,
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Products", url: "/products" },
    ...product.breadcrumbs.map((crumb) => ({
      name: crumb.name,
      url: `/products/${crumb.slug}`,
    })),
    { name: product.name, url: `/product/${product.slug}` },
  ];

  return (
    <>
      <JsonLd data={[productSchema(product), breadcrumbSchema(crumbs)]} />

      <nav aria-label="Breadcrumb" className="container-fluid pt-header">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {crumbs.map((crumb, index) => (
            <li key={crumb.url} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden>/</span>}
              {index === crumbs.length - 1 ? (
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

      <section className="container-fluid pb-16 pt-8">
        <ProductPurchasePanel product={product} />
      </section>

      {(product.description || product.highlights.length > 0) && (
        <section className="container-fluid grid gap-10 border-t border-border py-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-display text-2xl tracking-tight">About this product</h2>
            {product.description && <RichText text={product.description} className="mt-4" />}
            {product.installation_notes && (
              <>
                <h3 className="mt-8 font-display text-lg">Installation</h3>
                <p className="mt-2 text-muted-foreground">{product.installation_notes}</p>
              </>
            )}
            {product.care_notes && (
              <>
                <h3 className="mt-8 font-display text-lg">Care</h3>
                <p className="mt-2 text-muted-foreground">{product.care_notes}</p>
              </>
            )}
          </div>

          {product.highlights.length > 0 && (
            <div className="lg:col-span-5">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Highlights
              </h2>
              <ul className="mt-4 space-y-3">
                {product.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3 border-b border-border pb-3 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-gold" aria-hidden />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <ProductSpecifications groups={product.specifications} />
      <ProductDocuments documents={product.documents} />
      <ProductReviews reviews={product.reviews} rating={product.rating} />

      {product.related_products.length > 0 && (
        <section className="container-fluid border-t border-border py-14">
          <h2 className="font-display text-2xl tracking-tight">You may also consider</h2>
          <Suspense fallback={null}>
            <ProductGrid products={product.related_products} className="mt-8" />
          </Suspense>
        </section>
      )}
    </>
  );
}
