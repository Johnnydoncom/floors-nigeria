import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Box, Camera, PencilRuler } from "lucide-react";
import { getProducts } from "@/lib/api/catalog";
import { floorChoices } from "@/lib/room/materials";
import { RoomDesigner } from "@/components/designer/RoomDesigner";
import { ToolGuide, ToolHeading } from "@/components/tools/ToolIntro";

export const metadata: Metadata = pageMetadata({
  title: "Room Designer",
  description:
    "Measure your room, see it in 3D with any Floor Nigeria product laid at its true plank size, and view the material in your own space in AR.",
  path: "/room-designer",
});

/** Products fetched for the designer, enough to compare without overwhelming. */
const MATERIAL_LIMIT = 36;

/**
 * The room designer (§11).
 *
 * Where the photo visualizer answers "how would this look in my room?", this
 * answers "how much of it do I need, and what will it cost?" — from the same
 * catalogue, with the plank size and pack coverage the product actually ships..
 */
export default async function RoomDesignerPage() {
  const { data: products } = await getProducts({ per_page: MATERIAL_LIMIT, sort: "popular" });
  // Rugs and mats are placed on a floor, not laid wall to wall, so they have no
  // place in a room being measured for flooring.
  const materials = floorChoices(products).filter((choice) => choice.kind !== "rug");

  return (
    <>
      <ToolHeading
        title="Build your room, then walk across it."
        summary="Enter your measurements and see the floor laid in 3D, with the area, packs and cost worked out as you go."
      />

      <RoomDesigner materials={materials} />

      <ToolGuide
        eyebrow="How it works"
        title="From a tape measure to a floor you can stand on."
        description="Enter the measurements you took with a tape, and see the floor laid in three dimensions at its real plank size — with the area, packs and cost worked out as you go."
        steps={[
          {
            icon: <PencilRuler className="h-4 w-4" aria-hidden />,
            title: "Measure",
            detail: "Width, length and ceiling height, rectangular or L-shaped.",
          },
          {
            icon: <Box className="h-4 w-4" aria-hidden />,
            title: "See it in 3D",
            detail: "Look around from above, or stand in the room at eye level.",
          },
          {
            icon: <Camera className="h-4 w-4" aria-hidden />,
            title: "Hold it up (AR)",
            detail: "On a supported phone, place the material on your own floor.",
          },
        ]}
      />
    </>
  );
}
