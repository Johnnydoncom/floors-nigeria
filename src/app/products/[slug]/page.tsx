import { notFound } from "next/navigation";
import { PRODUCTS, getProduct } from "@/lib/catalog";
import type { Metadata } from "next";
import { ProductDetailClient } from "./ProductDetailClient";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.blurb,
    openGraph: {
      title: `${product.name} — Floors NG`,
      description: product.blurb,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  return <ProductDetailClient product={product} />;
}
