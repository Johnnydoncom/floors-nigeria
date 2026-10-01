import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Camera, MousePointerClick, Ruler } from "lucide-react";
import { getProducts } from "@/lib/api/catalog";
import { toTextureChoices } from "@/lib/room/materials";
import { VisualizerStudio, type DemoRoom } from "@/components/visualizer/VisualizerStudio";

export const metadata: Metadata = pageMetadata({
  title: "Room Visualizer — See Flooring in Your Room",
  description:
    "See any Floor Nigeria floor in your own room. Upload a photo, mark the floor and try real products to scale before you buy.",
  path: "/visualizer",
});

/** Rooms to try when a visitor has not photographed their own yet. */
const DEMO_ROOMS: DemoRoom[] = [
  { src: "/images/hero-living.jpg", label: "Living room" },
  { src: "/images/project-residence.jpg", label: "Residence" },
  { src: "/images/project-office.jpg", label: "Office" },
  { src: "/images/project-hotel.jpg", label: "Hotel lobby" },
];

/** Materials offered in the studio, enough to compare without overwhelming. */
const MATERIAL_LIMIT = 24;

/**
 * The room visualizer (§10).
 *
 * The catalogue is fetched here and handed to the studio, so the materials on
 * offer are the ones actually for sale — with their prices — rather than a
 * separate set of demo textures.
 */
export default async function VisualizerPage() {
  const { data: products } = await getProducts({ per_page: MATERIAL_LIMIT, sort: "popular" });
  const materials = products.flatMap(toTextureChoices);

  return (
    <>
      <section className="bg-charcoal-dark pt-header text-primary-foreground">
        <div className="container-fluid py-10 lg:py-14">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-light">
            Room Visualizer
          </p>
          <h1 className="mt-2 max-w-3xl text-balance font-display text-4xl tracking-tight md:text-5xl">
            See it on your own floor before you buy.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-primary-foreground/70">
            Photograph your room, mark where the floor is, and try any of our materials on it to
            scale. Nothing is uploaded until you choose to save.
          </p>

          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            <Step icon={<Camera className="h-4 w-4" aria-hidden />} title="Add your room">
              Upload a photo, or start from one of ours.
            </Step>
            <Step
              icon={<MousePointerClick className="h-4 w-4" aria-hidden />}
              title="Mark the floor"
            >
              Drag the four corners onto the floor area.
            </Step>
            <Step icon={<Ruler className="h-4 w-4" aria-hidden />} title="Try materials">
              Switch floors, sizes and direction until it looks right.
            </Step>
          </ol>
        </div>
      </section>

      <VisualizerStudio materials={materials} demoRooms={DEMO_ROOMS} />
    </>
  );
}

function Step({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="border border-white/10 p-4">
      <p className="flex items-center gap-2 font-display text-sm font-semibold text-gold-light">
        {icon}
        {title}
      </p>
      <p className="mt-1.5 text-sm text-primary-foreground/65">{children}</p>
    </li>
  );
}
