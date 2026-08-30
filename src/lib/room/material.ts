import type { Variant } from "@/lib/api/types";

/**
 * How a catalogue product lays out across a real floor.
 *
 * The 3D room is the one place the visualizer can be honest about scale: the
 * variation record carries the actual plank size in millimetres, so planks can
 * be drawn at the size they will be delivered rather than at whatever looks
 * about right. A 1220 × 183 plank in a 4.5m room is 3.7 planks wide, and that
 * is what the customer should see.
 */

/** Used when a product has no dimensions recorded — a common laminate plank. */
export const FALLBACK_PLANK = { lengthMm: 1220, widthMm: 183 };

export type PlankSize = { lengthM: number; widthM: number; isMeasured: boolean };

export function plankSize(variant?: Variant | null): PlankSize {
  const lengthMm = variant?.dimensions.length_mm ?? null;
  const widthMm = variant?.dimensions.width_mm ?? null;

  const isMeasured = lengthMm !== null && widthMm !== null && lengthMm > 0 && widthMm > 0;

  return {
    lengthM: (isMeasured ? lengthMm! : FALLBACK_PLANK.lengthMm) / 1000,
    widthM: (isMeasured ? widthMm! : FALLBACK_PLANK.widthMm) / 1000,
    isMeasured,
  };
}

/**
 * What the room costs in this material, using the same waste allowance and
 * pack arithmetic as the floor calculator (§12), so the designer and the
 * calculator can never quote different numbers for the same room.
 */
export type MaterialEstimate = {
  areaSqm: number;
  wastePercentage: number;
  areaWithWasteSqm: number;
  packs: number | null;
  cost: number | null;
};

export function estimateMaterial({
  areaSqm,
  wastePercentage,
  variant,
}: {
  areaSqm: number;
  wastePercentage: number;
  variant?: Variant | null;
}): MaterialEstimate {
  const areaWithWasteSqm = round(areaSqm * (1 + wastePercentage / 100), 2);
  const coverage = variant?.packaging.coverage_per_pack_sqm ?? null;
  const unitPrice = variant?.pricing.effective_price ?? null;

  const packs = coverage && coverage > 0 ? Math.ceil(areaWithWasteSqm / coverage) : null;

  const cost =
    unitPrice === null
      ? null
      : packs !== null && coverage
        ? round(packs * coverage * unitPrice, 2)
        : round(areaWithWasteSqm * unitPrice, 2);

  return {
    areaSqm: round(areaSqm, 2),
    wastePercentage,
    areaWithWasteSqm,
    packs,
    cost,
  };
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
