import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTaxonomy } from "@/lib/api/catalog";
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
  const room = await getTaxonomy("room", slug);

  if (!room) {
    return { title: "Room not found", robots: { index: false } };
  }

  const title = `${room.name} Flooring`;

  return {
    title,
    description:
      room.description ??
      `Flooring for the ${room.name.toLowerCase()} — supplied, delivered and installed across Nigeria by Floor Nigeria.`,
    alternates: { canonical: `/rooms/${room.slug}` },
    robots: hasRefinements(refinements) ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      type: "website",
      images: room.image_url ? [absoluteUrl(room.image_url)] : undefined,
    },
  };
}

/**
 * "Flooring for the living room" is how customers search, so each room gets a
 * real page at its own URL rather than a filtered query string (§6, §18).
 */
export default async function RoomPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const room = await getTaxonomy("room", slug);

  if (!room) notFound();

  const trail = [
    { name: "Home", url: "/" },
    { name: "Rooms", url: "/products" },
    { name: room.name, url: `/rooms/${room.slug}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(trail)} />

      <CategoryHero
        eyebrow="Shop by room"
        title={`${room.name} Flooring`}
        description={
          room.description ??
          `Durable, good-looking floors chosen for the ${room.name.toLowerCase()} — with delivery and professional installation nationwide.`
        }
        imageUrl={room.image_url}
        productCount={room.products_count}
        trail={trail}
      />

      <CatalogBrowser
        basePath={`/rooms/${room.slug}`}
        searchParams={searchParams}
        baseFilters={{ taxonomies: [room.slug] }}
        hiddenGroups={["room"]}
        emptyMessage={`Nothing for the ${room.name.toLowerCase()} matches these filters yet.`}
      />
    </>
  );
}
