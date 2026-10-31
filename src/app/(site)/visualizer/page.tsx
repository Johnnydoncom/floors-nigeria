import { Suspense } from "react";
import type { Metadata } from "next";
import { Camera, Layers, ScanLine } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { getFilterOptions, getProducts } from "@/lib/api/catalog";
import type { FilterOptions } from "@/lib/api/types";
import { floorChoices, isFloorCategory } from "@/lib/room/materials";
import sampleFloors from "@/lib/visualizer/sample-floors.json";
import type { FloorPreset } from "@/lib/visualizer/types";
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
 * Rooms to try when a visitor has not photographed their own yet. Their floors
 * were found ahead of time, so these open with no model to download.
 */
const SAMPLE_ROOMS: SampleRoom[] = [
  { src: "/images/hero-living.jpg", label: "Living room" },
  { src: "/images/project-residence.jpg", label: "Residence" },
  { src: "/images/project-office.jpg", label: "Office" },
  { src: "/images/project-hotel.jpg", label: "Hotel lobby" },
].map((room) => ({
  ...room,
  floor: (sampleFloors as unknown as Record<string, FloorPreset>)[room.src],
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

function StudioSkeleton() {
  return (
    <div className="container-fluid grid gap-8 pb-10 pt-2 lg:grid-cols-[minmax(0,1fr)_380px] lg:pt-4">
      <div className="aspect-[4/3] animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="hidden h-96 animate-pulse rounded-lg bg-muted motion-reduce:animate-none lg:block" />
    </div>
  );
}
