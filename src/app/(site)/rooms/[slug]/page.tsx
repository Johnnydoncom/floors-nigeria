import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getCategories, getTaxonomy } from "@/lib/api/catalog";
import { FloorCard } from "@/components/catalog/FloorCard";
import { categoryHref, floorsForRoom } from "@/lib/floor-families";
import { breadcrumbSchema } from "@/lib/structured-data";
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

  return pageMetadata({
    title,
    description:
      room.description ??
      `Flooring for the ${room.name.toLowerCase()} — supplied, delivered and installed across Nigeria by Floor Nigeria.`,
    path: `/rooms/${room.slug}`,
    noindex: hasRefinements(refinements),
    image: room.image_url,
    imageAlt: title,
  });
}

/**
 * "Flooring for the living room" is how customers search, so each room gets a
 * real page at its own URL rather than a filtered query string (§6, §18).
 */
export default async function RoomPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const room = await getTaxonomy("room", slug);

  if (!room) notFound();

  // Products are not yet tagged by room upstream, so the floors that suit
  // the room lead the page and link to their categories either way.
  const floors = floorsForRoom(room.slug, await getCategories().catch(() => []));

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
        lede={
          room.description ??
          `Durable, good-looking floors chosen for the ${room.name.toLowerCase()} — with delivery and professional installation nationwide.`
        }
        imageUrl={room.image_url}
        productCount={room.products_count}
        trail={trail}
      />

      {floors.length > 0 && (
        <section className="container-fluid pt-12" aria-labelledby="room-floors">
          <p className="eyebrow">Recommended</p>
          <h2 id="room-floors" className="mt-3 font-display text-2xl tracking-tight md:text-3xl">
            Floors for the {room.name.toLowerCase()}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {floors.map((category) => (
              <FloorCard
                key={category.slug}
                href={categoryHref(category.slug)}
                name={category.name}
                image={category.image_url}
                sizes="(min-width: 1024px) 25vw, 50vw"
              />
            ))}
          </div>
        </section>
      )}

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
