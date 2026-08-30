import type { Metadata } from "next";
import { Box, Camera, PencilRuler } from "lucide-react";
import { getProducts } from "@/lib/api/catalog";
import { toTextureChoices } from "@/lib/room/materials";
import { RoomDesigner } from "@/components/designer/RoomDesigner";

export const metadata: Metadata = {
  title: "Room Designer",
  description:
    "Measure your room, see it in 3D with any Floor Nigeria product laid at its true plank size, and view the material in your own space in AR.",
  alternates: { canonical: "/room-designer" },
};

/** Materials offered in the designer, enough to compare without overwhelming. */
const MATERIAL_LIMIT = 24;

/**
 * The room designer (§11).
 *
 * Where the photo visualizer answers "how would this look in my room?", this
 * answers "how much of it do I need, and what will it cost?" — from the same
 * catalogue, with the plank size and pack coverage the product actually ships.
 */
export default async function RoomDesignerPage() {
  const { data: products } = await getProducts({ per_page: MATERIAL_LIMIT, sort: "popular" });
  const materials = products.flatMap(toTextureChoices);

  return (
    <>
      <section className="bg-charcoal-dark pt-header text-primary-foreground">
        <div className="container-fluid py-10 lg:py-14">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-light">
            Room Designer
          </p>
          <h1 className="mt-2 max-w-3xl text-balance font-display text-4xl tracking-tight md:text-5xl">
            Build your room, then walk across it.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-primary-foreground/70">
            Enter the measurements you took with a tape, and see the floor laid in three dimensions
            at its real plank size — with the area, packs and cost worked out as you go.
          </p>

          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            <Step icon={<PencilRuler className="h-4 w-4" aria-hidden />} title="Measure">
              Width, length and ceiling height, rectangular or L-shaped.
            </Step>
            <Step icon={<Box className="h-4 w-4" aria-hidden />} title="See it in 3D">
              Look around from above, or stand in the room at eye level.
            </Step>
            <Step icon={<Camera className="h-4 w-4" aria-hidden />} title="Hold it up (AR)">
              On a supported phone, place the material on your own floor.
            </Step>
          </ol>
        </div>
      </section>

      <RoomDesigner materials={materials} />
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
