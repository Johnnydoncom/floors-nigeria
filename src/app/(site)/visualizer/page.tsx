import { Suspense } from "react";
import { preload } from "react-dom";
import type { Metadata } from "next";
import { Camera, Layers, ScanLine } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { getFilterOptions, getProducts } from "@/lib/api/catalog";
import type { FilterOptions } from "@/lib/api/types";
import { floorChoices, isFloorCategory } from "@/lib/room/materials";
import { TEMPLATE_ROOMS } from "@/lib/visualizer/template-rooms";
import { ToolGuide, ToolHeading } from "@/components/tools/ToolIntro";
import { VisualizerStudio, type SampleRoom } from "@/components/visualizer/VisualizerStudio";
import type { VisualizerFilters } from "@/components/visualizer/MaterialBrowser";

export const metadata: Metadata = pageMetadata({
  title: "Room Visualizer — See Flooring in Your Room",
  description:
    "See any Floor Nigeria floor in your own room. Upload a photo and the floor is found automatically — then try real products, patterns and finishes, compare them, view them in AR and share the result.",
  path: "/visualizer",
});

/**
 * Rooms to try when a visitor has not photographed their own yet: template
 * rooms, whose floor, light, walls and rug were prepared ahead of time, so they
 * open with no model to download and nothing to measure (`template-rooms.ts`).
 */
const SAMPLE_ROOMS: SampleRoom[] = TEMPLATE_ROOMS.map((room) => ({
  src: room.src,
  label: room.label,
  thumb: room.thumb,
  floor: room.floor,
}));

/** Materials shipped with the page, for an instant first screen. */
const MATERIAL_LIMIT = 24;

/**
 * The room visualizer (§10).
 *
 * The most popular materials and the filter choices are fetched here and
 * handed to the studio, so it opens instantly on the floors actually for sale;
 * everything else in the catalogue is a search away inside it.
 */
export default async function VisualizerPage() {
  // The first room is the first thing on screen: its photograph is the page's
  // largest paint, and its floor and light are what the first floor needs.
  const first = TEMPLATE_ROOMS[0];
  // Requested as the studio requests them (CORS mode, for a readable canvas),
  // or the browser would fetch each twice.
  preload(first.src, { as: "image", fetchPriority: "high", crossOrigin: "anonymous" });
  for (const layer of [first.floor.mask, first.floor.shading, first.floor.highlights]) {
    if (layer) preload(layer, { as: "image", fetchPriority: "low", crossOrigin: "anonymous" });
  }

  const [{ data: products }, filterOptions] = await Promise.all([
    getProducts({ per_page: MATERIAL_LIMIT, sort: "popular" }),
    getFilterOptions(),
  ]);
  const materials = floorChoices(products);

  return (
    <>
      <ToolHeading
        title="See it on your own floor before you buy."
        summary="Try any of our floors in your room. Your photo stays on this device until you choose to save."
      />

      {/* The studio follows ?product, ?variant and ?design links, which are
          only known in the browser — the shell prerenders without them. */}
      <Suspense fallback={<StudioSkeleton />}>
        <VisualizerStudio
          materials={materials}
          sampleRooms={SAMPLE_ROOMS}
          filters={visualizerFilters(filterOptions)}
        />
      </Suspense>

      <ToolGuide
        eyebrow="How it works"
        title="Your room, any floor, in a few taps."
        description="Photograph your room and we find the floor for you. Try any of our floors on it — in the pattern, direction and finish you want — then compare, share, or see it in AR. Nothing is uploaded until you choose to save."
        steps={[
          {
            icon: <Camera className="h-4 w-4" aria-hidden />,
            title: "Add your room",
            detail: "Upload or take a photo, or start from one of ours.",
          },
          {
            icon: <ScanLine className="h-4 w-4" aria-hidden />,
            title: "We find the floor",
            detail: "Furniture stays put. Paint or draw to fine-tune.",
          },
          {
            icon: <Layers className="h-4 w-4" aria-hidden />,
            title: "Try, compare, decide",
            detail: "Switch floors and patterns, then request a quote or a sample.",
          },
        ]}
      />
    </>
  );
}

/** The catalogue's filters, trimmed to what the studio offers. */
function visualizerFilters(options: FilterOptions): VisualizerFilters {
  const colour =
    options.attributes.find((attribute) => attribute.swatch_type === "color") ??
    options.attributes.find((attribute) => /colou?r/i.test(attribute.slug));

  return {
    categories: options.categories
      .filter(({ name }) => isFloorCategory(name))
      .map(({ slug, name }) => ({ slug, name })),
    brands: options.brands,
    colour: colour
      ? {
          attribute: colour.slug,
          terms: colour.values
            .slice(0, 40)
            .map((term) => ({ slug: term.slug, label: term.label, hex: term.color_hex })),
        }
      : null,
    price: { min: options.price.min, max: options.price.max },
  };
}

/** The studio's frame with the first room already in it, so the page paints the room at once. */
function StudioSkeleton() {
  const first = TEMPLATE_ROOMS[0];
  return (
    <div className="container-fluid grid grid-cols-1 gap-3 pb-10 pt-2 lg:grid-cols-[76px_minmax(300px,360px)_minmax(0,1fr)] lg:gap-5 lg:pt-4">
      <div className="hidden h-[26rem] animate-pulse rounded-2xl bg-surface motion-reduce:animate-none lg:block" />
      <div className="hidden h-[32rem] animate-pulse rounded-2xl bg-surface motion-reduce:animate-none lg:block" />
      {/* eslint-disable-next-line @next/next/no-img-element -- the preloaded photograph, as is */}
      <img
        src={first.src}
        alt={`${first.label} — sample room`}
        width={first.width}
        height={first.height}
        fetchPriority="high"
        crossOrigin="anonymous"
        className="h-auto w-full rounded-lg bg-muted"
      />
    </div>
  );
}
