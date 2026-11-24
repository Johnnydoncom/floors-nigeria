import type { StageMaterial } from "@/components/visualizer/RoomStage";
import { defaultDimensions, layoutsFor } from "./patterns";
import type { LayoutPattern, Placement, TextureChoice } from "./types";

/**
 * How a chosen floor is laid when it is chosen — shared by the studio and the
 * product page's room preview, so a floor looks the same in both.
 */

/**
 * The floor the studio opens on. The first impression should be the best one
 * the catalogue can give: a real texture if there is one, or else a plank floor,
 * whose photographs make the most convincing surface.
 */
export function starterMaterial(materials: TextureChoice[]): TextureChoice | null {
  return (
    materials.find((choice) => choice.isSeamless) ??
    materials.find((choice) => choice.kind === "plank") ??
    materials[0] ??
    null
  );
}

export function toStageMaterial(choice: TextureChoice | null): StageMaterial | null {
  if (!choice) return null;

  return {
    textureSrc: choice.textureUrl,
    kind: choice.kind ?? "plank",
    isSeamless: choice.isSeamless ?? false,
    textureSizeM: choice.textureSizeM ?? null,
    label: choice.variantName
      ? `${choice.productName} — ${choice.variantName}`
      : choice.productName,
  };
}

/** The product's own piece size, longest side first, or a typical one. */
export function dimensionsOf(choice: TextureChoice | null): {
  lengthMm: number;
  widthMm: number;
  isMeasured: boolean;
} {
  const kind = choice?.kind ?? "plank";
  const length = choice?.variant?.dimensions.length_mm ?? null;
  const width = choice?.variant?.dimensions.width_mm ?? null;

  if (length && width && length > 0 && width > 0) {
    return {
      lengthMm: Math.max(length, width),
      widthMm: Math.min(length, width),
      isMeasured: true,
    };
  }

  return { ...defaultDimensions(kind), isMeasured: false };
}

/**
 * Placement for a newly chosen material: its own piece size, and a layout it
 * can actually be laid in. A layout the visitor picked is kept wherever the new
 * floor allows it; otherwise it is laid the way that floor is fitted: planks
 * staggered, tiles in a grid. Both cut the surface into real pieces, which is
 * what makes it read as a floor rather than a photograph repeated.
 */
export function placementFor(
  choice: TextureChoice | null,
  current: Placement,
  layoutPinned: boolean,
): Placement {
  const kind = choice?.kind ?? "plank";
  const dimensions = dimensionsOf(choice);
  const layouts = layoutsFor(kind);
  const fallbackLayout: LayoutPattern =
    kind === "tile" ? "grid" : kind === "plank" ? "staggered" : "natural";

  return {
    ...current,
    layout: layoutPinned && layouts.includes(current.layout) ? current.layout : fallbackLayout,
    plankLengthMm: dimensions.lengthMm,
    plankWidthMm: dimensions.widthMm,
    finish: kind === "carpet" || kind === "rug" ? "matte" : current.finish,
  };
}
