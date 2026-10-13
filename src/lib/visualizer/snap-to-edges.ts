import type { Rgb } from "./refine-mask";

/**
 * Moving the floor's edge onto the edges the photograph shows.
 *
 * Where a floor meets a wall or a sideboard the model's boundary is a blob: it
 * wanders a few of the model's cells either side of the real junction. Along a
 * skirting board that shows twice over — a strip of the old floor left between
 * the new one and the wall, and a wedge missing at the foot of a column — and
 * the colour vote in `refine-mask.ts` cannot close it, because it is not
 * allowed to turn anything the model called wall into floor (that is what
 * keeps material off the walls).
 *
 * The photograph is unambiguous here. A skirting board or the plinth of a
 * cabinet meets a floor along a hard, straight edge, far stronger than a plank
 * seam. So the junction is re-decided by a marker-controlled watershed over
 * the photograph's edge strength:
 *
 * - Pixels well inside the floor are floor, and pixels well inside a wall or a
 *   piece of furniture are not — the model is right about those.
 * - In a band either side of the model's junction, they are flooded outward
 *   together, lowest edge strength first. They meet on the strongest edge
 *   between them, which is the line a person would draw.
 *
 * Thin things — a chair leg, a table's pedestal seen edge-on — have no inside
 * a band this wide would leave standing, and the floor would flood straight
 * over them. They are left exactly as the model drew them; the model is good
 * at objects, and those edges were already close.
 */

/**
 * Width of the band re-decided either side of a junction, as a share of the
 * photo's width: at a wall, and at a piece of furniture.
 *
 * Narrower at furniture. A wall is one plane with one hard edge at its foot,
 * and the model's blob can be well off it. Furniture stands in its own shadow,
 * where a dark leg and the dark floor around it have barely an edge between
 * them — given the wall's reach, the floor flooded up a sideboard's leg.
 */
const WALL_BAND_SHARE = 0.02;
const FURNITURE_BAND_SHARE = 0.01;

const UNKNOWN = 0;
const FLOOR = 1;
const WALL = 2;
const THING = 3;
const BARRIER = 4;

export type Junctions = {
  width: number;
  height: number;
  floor: Uint8Array;
  structure: Uint8Array;
  occluder: Uint8Array;
  /**
   * Where the model allows floor at all. Outside it a pixel can lose floor but
   * never gain it, however the photograph's edges fall: wood panelling meets a
   * wood floor with no edge between them, and the strongest edge nearby can be
   * a band of sunlight up the panel.
   */
  possibleFloor?: Uint8Array;
};

/**
 * The floor, structure and occluder masks with their shared boundaries moved
 * onto the photograph's edges. All must be at the photograph's size.
 */
export function snapToEdges<T extends Junctions>(scene: T, photo: Rgb): T {
  const { width, height, floor, structure, occluder, possibleFloor } = scene;
  const size = width * height;
  const wallBand = Math.max(4, Math.round(width * WALL_BAND_SHARE));
  const furnitureBand = Math.max(2, Math.round(width * FURNITURE_BAND_SHARE));

  // Furniture thick enough to keep a core once the band is taken off it.
  const core = erode(occluder, width, height, furnitureBand);
  const solid = dilate(core, width, height, furnitureBand);
  for (let index = 0; index < size; index++) solid[index] &= occluder[index];

  const other = new Uint8Array(size);
  for (let index = 0; index < size; index++) other[index] = structure[index] | solid[index];

  // Where the floor touches a wall or something solid, then everything within
  // the band of it.
  const near = new Uint8Array(size);
  const atWall = dilate(touching(floor, structure, width, height), width, height, wallBand);
  const atFurniture = dilate(touching(floor, solid, width, height), width, height, furnitureBand);
  for (let index = 0; index < size; index++) near[index] = atWall[index] | atFurniture[index];
  const labels = new Uint8Array(size);
  let unknown = 0;

  for (let index = 0; index < size; index++) {
    const isFloor = floor[index] === 1;
    const isOther = other[index] === 1;

    if (!isFloor && !isOther) {
      labels[index] = BARRIER;
    } else if (near[index] === 1 && !isFloor && possibleFloor?.[index] === 0) {
      // Sure not to be floor: it keeps its label, and does not spread either.
      // Seeding the other flood right at the junction would let it run across
      // flat floor, with no edge to stop it, and pull the floor back.
      labels[index] = BARRIER;
    } else if (near[index] === 1 && !(occluder[index] === 1 && core[index] === 1)) {
      labels[index] = UNKNOWN;
      unknown++;
    } else {
      labels[index] = isFloor ? FLOOR : structure[index] === 1 ? WALL : THING;
    }
  }

  if (unknown === 0) return scene;

  flood(labels, edgeStrength(photo, dilate(near, width, height, 1)), width);

  const snapped: T = {
    ...scene,
    floor: Uint8Array.from(floor),
    structure: Uint8Array.from(structure),
    occluder: Uint8Array.from(occluder),
  };

  for (let index = 0; index < size; index++) {
    if (near[index] === 0 || labels[index] === BARRIER) continue;

    const label = labels[index];
    snapped.floor[index] = label === FLOOR ? 1 : 0;
    snapped.structure[index] = label === WALL ? 1 : 0;
    snapped.occluder[index] = label === THING ? 1 : 0;
  }

  return snapped;
}

/** Pixels of `a` with a four-neighbour in `b`. */
function touching(a: Uint8Array, b: Uint8Array, width: number, height: number): Uint8Array {
  const result = new Uint8Array(a.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (a[index] !== 1) continue;

      if (
        (x > 0 && b[index - 1] === 1) ||
        (x < width - 1 && b[index + 1] === 1) ||
        (y > 0 && b[index - width] === 1) ||
        (y < height - 1 && b[index + width] === 1)
      ) {
        result[index] = 1;
      }
    }
  }

  return result;
}

/**
 * Meyer's watershed from the labelled pixels into the unknown ones, through a
 * bucket queue keyed on edge strength. A pixel takes the label of whichever
 * flood reaches it first, and floods reach weak edges before strong ones — so
 * the two meet on the strongest edge between them.
 */
function flood(labels: Uint8Array, edges: Uint8Array, width: number): void {
  const buckets: number[][] = Array.from({ length: 256 }, () => []);
  const queued = new Uint8Array(labels.length);
  let level = 0;

  // A pixel is flooded at its own edge strength, or at the current level if it
  // is only reachable past a stronger edge than its own.
  const offer = (index: number) => {
    if (labels[index] !== UNKNOWN || queued[index] === 1) return;
    queued[index] = 1;
    buckets[Math.max(level, edges[index])].push(index);
  };

  const neighbours = (index: number, visit: (neighbour: number) => void) => {
    const x = index % width;
    if (x > 0) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < labels.length - width) visit(index + width);
  };

  for (let index = 0; index < labels.length; index++) {
    if (labels[index] !== UNKNOWN && labels[index] !== BARRIER) neighbours(index, offer);
  }

  // First in, first out within a level, so equal-strength ground is shared out
  // evenly between the two floods rather than to whichever started first.
  const heads = new Int32Array(256);

  while (level < 256) {
    const bucket = buckets[level];

    if (heads[level] === bucket.length) {
      level++;
      continue;
    }

    const index = bucket[heads[level]++];

    // Take the label of a flooded neighbour; floor wins a tie, since a pixel
    // reached by two floods at once sits on the edge itself.
    let label = UNKNOWN;
    neighbours(index, (neighbour) => {
      const value = labels[neighbour];
      if (value === FLOOR || ((value === WALL || value === THING) && label !== FLOOR)) {
        label = value;
      }
    });

    labels[index] = label;
    neighbours(index, offer);
  }
}

/**
 * Edge strength, 0–255, over `region` only (zero elsewhere): the largest Sobel
 * response across the three colour channels of a lightly smoothed copy, so a
 * white skirting board on pale wood registers as strongly as one on dark wood.
 */
function edgeStrength(photo: Rgb, region: Uint8Array): Uint8Array {
  const { width, height, data } = photo;
  const clampX = (x: number) => (x < 0 ? 0 : x >= width ? width - 1 : x);
  const clampY = (y: number) => (y < 0 ? 0 : y >= height ? height - 1 : y);

  // 3×3 box blur, enough to quiet wood grain and JPEG noise — computed only
  // where the Sobel below will read it.
  const smooth = new Float32Array(width * height * 3);
  const needed = dilate(region, width, height, 1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (needed[index] === 0) continue;

      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const row = clampY(y + dy) * width;
          for (let dx = -1; dx <= 1; dx++) sum += data[(row + clampX(x + dx)) * 4 + channel];
        }
        smooth[index * 3 + channel] = sum / 9;
      }
    }
  }

  const edges = new Uint8Array(width * height);
  const at = (x: number, y: number, channel: number) =>
    smooth[(clampY(y) * width + clampX(x)) * 3 + channel];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (region[y * width + x] === 0) continue;

      let strongest = 0;

      for (let channel = 0; channel < 3; channel++) {
        const gx =
          at(x + 1, y - 1, channel) +
          2 * at(x + 1, y, channel) +
          at(x + 1, y + 1, channel) -
          at(x - 1, y - 1, channel) -
          2 * at(x - 1, y, channel) -
          at(x - 1, y + 1, channel);
        const gy =
          at(x - 1, y + 1, channel) +
          2 * at(x, y + 1, channel) +
          at(x + 1, y + 1, channel) -
          at(x - 1, y - 1, channel) -
          2 * at(x, y - 1, channel) -
          at(x + 1, y - 1, channel);

        strongest = Math.max(strongest, Math.hypot(gx, gy));
      }

      // A Sobel response tops out near 1440; edges that matter sit well below.
      edges[y * width + x] = Math.min(255, Math.round(strongest / 2));
    }
  }

  return edges;
}

/** Grow a set by `radius`, as two passes of a separable box dilation. */
function dilate(source: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const horizontal = new Uint8Array(source.length);

  for (let y = 0; y < height; y++) {
    const row = y * width;

    for (let x = 0, seen = -Infinity; x < width; x++) {
      if (source[row + x] === 1) seen = x;
      if (x - seen <= radius) horizontal[row + x] = 1;
    }
    for (let x = width - 1, seen = Infinity; x >= 0; x--) {
      if (source[row + x] === 1) seen = x;
      if (seen - x <= radius) horizontal[row + x] = 1;
    }
  }

  const grown = new Uint8Array(source.length);

  for (let x = 0; x < width; x++) {
    for (let y = 0, seen = -Infinity; y < height; y++) {
      if (horizontal[y * width + x] === 1) seen = y;
      if (y - seen <= radius) grown[y * width + x] = 1;
    }
    for (let y = height - 1, seen = Infinity; y >= 0; y--) {
      if (horizontal[y * width + x] === 1) seen = y;
      if (seen - y <= radius) grown[y * width + x] = 1;
    }
  }

  return grown;
}

/** Shrink a set by `radius`: what survives is at least that far inside it. */
function erode(source: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const outside = new Uint8Array(source.length);
  for (let index = 0; index < source.length; index++) outside[index] = source[index] === 1 ? 0 : 1;

  const grown = dilate(outside, width, height, radius);
  const eroded = new Uint8Array(source.length);

  for (let index = 0; index < source.length; index++) {
    // The frame's edge is not the end of the object, so it does not erode it.
    eroded[index] = grown[index] === 1 ? 0 : 1;
  }

  return eroded;
}
