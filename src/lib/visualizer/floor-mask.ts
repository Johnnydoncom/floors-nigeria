import type { Grid } from "./refine-mask";

/**
 * Turning a segmentation model's label map into a floor mask worth rendering.
 *
 * The model gives one mask per class it recognises. Merging the floor classes
 * and stopping there produces two faults a customer sees immediately, and both
 * are visible in any photograph of a real room:
 *
 * - **Material climbing the walls and the stairs.** A floor and a skirting
 *   board are the same colour under the same light, and a stair tread is a
 *   horizontal walkable surface — exactly what the floor class was trained on.
 *   The model leaks across both.
 * - **Bare patches in the middle of the floor.** A rug, a pool of sunlight, a
 *   reflection: the model labels them something else, they become holes, and
 *   the old covering shows through in the middle of the room.
 *
 * Neither is fixable by looking at the floor class alone. What fixes both is
 * the rest of the label map: a class that cannot lie in a floor plane —
 * a wall, a stair, a ceiling — is evidence *against* floor wherever the floor
 * class overlaps it, and a hole labelled with one of those classes, ringed by
 * floor, is a mislabel rather than an object standing in the room.
 *
 * So every class is sorted into three piles, and the piles disagree usefully.
 *
 * The third pile — everything that is neither floor nor structure — is the
 * default, and deliberately so. Two alternatives were tried and both are worse.
 * Listing the things that stand on a floor and treating the remainder as
 * mislabels lays the new floor over whatever the list happens to miss, which on
 * a real photograph was a coffee table and two footstools. And asking geometry
 * instead — mapping each thing back onto the floor plane and keeping the ones
 * that could be lying in it — does not work either: over the same floor a rug
 * measures 0.8 as deep as it is wide and a footstool measures 1.1, because a
 * silhouette carries no height. A thing that is really a rug therefore needs a
 * model that says so.
 */

/**
 * Classes that are the floor plane itself.
 *
 * Matched token by token, because the same checkpoint is published with both
 * short labels ("rug") and ADE20K's full synonym lists ("rug;carpet;carpeting")
 * depending on how the config was exported. Missing one loses a whole area of
 * floor, which is the failure this file exists to prevent.
 */
export const FLOOR_LABELS = new Set([
  "floor",
  "flooring",
  "rug",
  "carpet",
  "carpeting",
  "mat",
  "matting",
]);

/**
 * Classes that cannot be a floor: they stand up out of the plane, or hang above
 * it, or are somewhere else entirely.
 *
 * Two jobs. Where the floor class overlaps one of these the floor class is
 * wrong, and the overlap is trimmed — that is the wall and the staircase. And
 * where one of these is ringed by floor it is a mislabel rather than an object,
 * because no room has a patch of wall in the middle of its floor — that is the
 * bare rug in the middle of the room.
 */
export const STRUCTURE_LABELS = new Set([
  "wall",
  "ceiling",
  "sky",
  "windowpane",
  "window",
  "door",
  "screen door",
  "doorframe",
  "curtain",
  "drape",
  "blind",
  "painting",
  "picture",
  "poster",
  "mirror",
  "stairs",
  "stairway",
  "staircase",
  "step",
  "escalator",
  "railing",
  "rail",
  "bannister",
  "banister",
  "balustrade",
  "column",
  "pillar",
  "fireplace",
  "radiator",
  "building",
  "edifice",
  "house",
  "skyscraper",
  "mountain",
  "mount",
  "hill",
  "tower",
  "bridge",
  "awning",
  "canopy",
  "signboard",
  "sign",
  "bulletin board",
  "flag",
  "clock",
  "chandelier",
  "sconce",
  "streetlight",
  "shower",
]);

/**
 * How far the floor is pulled back from a wall or a stair, in working pixels.
 *
 * Asymmetric on purpose: a hairline of the old floor along a skirting board is
 * hard to see, while material running up the wall is the first thing anyone
 * notices. No pull-back happens along a sofa or a chair leg, where the floor
 * genuinely continues to the edge of the object.
 */
const STRUCTURE_CLEARANCE = 2;

/** Holes smaller than this share of the frame are speckle and always fill. */
const SPECKLE_SHARE = 0.0006;

export type SegmentationMask = { data: Uint8Array; width: number; height: number };

export type Segment = { label: string; mask: SegmentationMask };

/**
 * The label map sorted into the three piles, as masks over the same grid.
 */
export type LabelledScene = {
  width: number;
  height: number;
  /** The floor classes, merged. */
  floor: Uint8Array;
  /** Classes that cannot be floor. */
  structure: Uint8Array;
  /** Everything else in the room: what stands on the floor and hides it. */
  occluder: Uint8Array;
};

/** Split a label into its synonyms, as either export spells them. */
function tokens(label: string): string[] {
  return label
    .toLowerCase()
    .split(/[;,]/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function isFloorLabel(label: string): boolean {
  return tokens(label).some((token) => FLOOR_LABELS.has(token));
}

export function isStructureLabel(label: string): boolean {
  return tokens(label).some((token) => STRUCTURE_LABELS.has(token));
}

/**
 * Anything that is neither the floor nor part of the building's structure is
 * something in the room, and something in the room hides the floor until
 * geometry says it lies flat on it.
 */
export function isOccluderLabel(label: string): boolean {
  return !isFloorLabel(label) && !isStructureLabel(label);
}

/**
 * Sort a segmentation result into floor, structure and occluder masks.
 *
 * Returns null when the model found no floor at all, which is the one case the
 * caller has to handle differently: there is nothing to render and the visitor
 * marks the floor by hand.
 */
export function classifyScene(segments: Segment[]): LabelledScene | null {
  const floors = segments.filter((segment) => isFloorLabel(segment.label));

  if (floors.length === 0) return null;

  const { width, height } = floors[0].mask;
  const size = width * height;

  const floor = new Uint8Array(size);
  const structure = new Uint8Array(size);
  const occluder = new Uint8Array(size);

  for (const segment of segments) {
    // Masks of a different size cannot be lined up with the floor's, and a
    // misaligned mask is worse than a missing one.
    if (segment.mask.width !== width || segment.mask.height !== height) continue;

    const target = isFloorLabel(segment.label)
      ? floor
      : isStructureLabel(segment.label)
        ? structure
        : occluder;

    const { data } = segment.mask;

    for (let index = 0; index < size; index++) {
      if (data[index] > 127) target[index] = 1;
    }
  }

  return { width, height, floor, structure, occluder };
}

/**
 * The floor as it should be rendered: trimmed off the walls and stairs, with
 * the model's mislabels in the middle of the room filled back in.
 */
export function cleanFloorMask(scene: LabelledScene): Grid {
  const { width, height, structure, occluder } = scene;
  const size = width * height;
  const floor = Uint8Array.from(scene.floor);

  // 1. A pixel the model also called wall, ceiling or stair is not floor,
  //    whatever the floor class says about it.
  for (let index = 0; index < size; index++) {
    if (structure[index] === 1) floor[index] = 0;
  }

  // 2. Stand back from those surfaces rather than stopping exactly at them:
  //    the boundary is never pixel-exact, and erring inwards is invisible
  //    where erring outwards is material up the wall.
  if (STRUCTURE_CLEARANCE > 0) {
    const nearStructure = dilate(structure, width, height, STRUCTURE_CLEARANCE);

    for (let index = 0; index < size; index++) {
      if (nearStructure[index] === 1) floor[index] = 0;
    }
  }

  // 3. Fill the holes that are not really objects.
  fillMislabelledHoles({ data: floor, width, height }, occluder);

  // 4. Settle the outline. The model's boundary wanders in and out by a pixel
  //    or two, which reads as a torn edge once material is laid inside it.
  return smoothOutline({ data: floor, width, height });
}

/**
 * Give back to the floor every pocket it closes around that has nothing
 * standing in it.
 *
 * The pockets are flooded across everything except the things that stand on a
 * floor, so those act as the walls of a pocket rather than as its contents.
 * That separation is what lets a rug touching a sofa be judged on its own
 * merits: as one flood over all not-floor the two are a single pocket, the
 * sofa dominates it, and the rug stays bare — which is exactly what a
 * photograph of a real living room produces.
 *
 * A pocket has to reach the floor to be given back to it, so a gap inside a
 * sofa stays inside the sofa. And a pocket that reaches the edge of the frame
 * is not enclosed at all — it is the rest of the room — so it is left alone.
 */
function fillMislabelledHoles(mask: Grid, occluder: Uint8Array): void {
  const { data, width, height } = mask;
  const visited = new Uint8Array(data.length);
  const speckle = Math.max(24, Math.round(width * height * SPECKLE_SHARE));
  const stack: number[] = [];

  const floodable = (index: number) => data[index] === 0 && occluder[index] === 0;

  for (let start = 0; start < data.length; start++) {
    if (!floodable(start) || visited[start] === 1) continue;

    const pocket: number[] = [];
    let touchesEdge = false;
    let touchesFloor = false;

    stack.push(start);
    visited[start] = 1;

    while (stack.length > 0) {
      const index = stack.pop()!;
      pocket.push(index);

      const x = index % width;
      const y = (index - x) / width;

      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;

      for (const neighbour of [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ]) {
        if (neighbour < 0) continue;

        if (data[neighbour] === 1) {
          touchesFloor = true;
          continue;
        }

        if (floodable(neighbour) && visited[neighbour] === 0) {
          visited[neighbour] = 1;
          stack.push(neighbour);
        }
      }
    }

    if (!touchesFloor) continue;
    if (touchesEdge && pocket.length > speckle) continue;

    for (const index of pocket) data[index] = 1;
  }
}

/**
 * A majority vote over each pixel's neighbourhood — the cheapest way to settle
 * a boundary that wanders. Isolated spurs go, single-pixel nicks fill, and
 * anything with a real edge behind it stays exactly where it is.
 */
function smoothOutline(mask: Grid): Grid {
  const { data, width, height } = mask;
  const output = Uint8Array.from(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;

      let votes = 0;
      let total = 0;

      for (let dy = -1; dy <= 1; dy++) {
        const sampleY = y + dy;
        if (sampleY < 0 || sampleY >= height) continue;

        for (let dx = -1; dx <= 1; dx++) {
          const sampleX = x + dx;
          if (sampleX < 0 || sampleX >= width) continue;

          total++;
          votes += data[sampleY * width + sampleX];
        }
      }

      output[index] = votes * 2 > total ? 1 : 0;
    }
  }

  return { data: output, width, height };
}

/** Grow a set by `radius`, as two passes of a separable box dilation. */
export function dilate(
  source: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  const horizontal = new Uint8Array(source.length);

  for (let y = 0; y < height; y++) {
    const row = y * width;

    for (let x = 0; x < width; x++) {
      if (source[row + x] === 0) continue;

      const from = Math.max(0, x - radius);
      const to = Math.min(width - 1, x + radius);

      for (let sample = from; sample <= to; sample++) horizontal[row + sample] = 1;
    }
  }

  const grown = new Uint8Array(source.length);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (horizontal[y * width + x] === 0) continue;

      const from = Math.max(0, y - radius);
      const to = Math.min(height - 1, y + radius);

      for (let sample = from; sample <= to; sample++) grown[sample * width + x] = 1;
    }
  }

  return grown;
}

/** Nearest-neighbour resample of a binary mask, for lining grids up. */
export function resampleBinary(
  source: Uint8Array,
  from: { width: number; height: number },
  width: number,
  height: number,
): Uint8Array {
  if (from.width === width && from.height === height) return source;

  const data = new Uint8Array(width * height);
  const scaleX = from.width / width;
  const scaleY = from.height / height;

  for (let y = 0; y < height; y++) {
    const sourceRow = Math.min(from.height - 1, Math.floor(y * scaleY)) * from.width;

    for (let x = 0; x < width; x++) {
      data[y * width + x] = source[sourceRow + Math.min(from.width - 1, Math.floor(x * scaleX))];
    }
  }

  return data;
}
