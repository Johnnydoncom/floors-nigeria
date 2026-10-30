import type { Pixels } from "./texture-prep";

/**
 * Finding the material inside a product photograph (§24).
 *
 * Until a dedicated texture is uploaded, a product's "texture" is its catalogue
 * photo: a tile cut out on white, a plank with a vase standing on it, a deck
 * beside a swimming pool. Repeating any of those lays the photograph across the
 * floor, background and props included. What can be laid is the largest clean
 * rectangle of the material itself.
 *
 * The material is the colour photographers put in the lower middle of the frame.
 * So: discount the white studio backdrop, take the weighted median colour of
 * what is left, mark every cell near that colour, and find the largest rectangle
 * of marked cells. It runs on a thumbnail-sized copy, in a millisecond or two.
 *
 * Pure pixels, so it can be checked without a browser
 * (`scripts/material-patch.test.mjs`).
 */

/** A rectangle as shares of the photograph. */
export type Patch = { x: number; y: number; width: number; height: number };

/** Long side of the copy to analyse: fine enough to step round a prop. */
export const PATCH_PROBE_SIDE = 96;

/** Brighter and greyer than this, joined to the frame, is a studio backdrop. */
const BACKDROP_LUMA = 228;
const BACKDROP_CHROMA = 16;

/** How far from the material's colour a cell may be, in luma-weighted steps. */
const MIN_TOLERANCE = 20;
const MAX_TOLERANCE = 46;

/** Smaller than this share of the photo is a guess, not a patch. */
const MIN_PATCH_SHARE = 0.07;

/** A patch this oblong repeats as stripes; it is trimmed to this ratio. */
const MAX_ASPECT = 1.7;

type Cell = { luma: number; cb: number; cr: number };

/** The largest clean rectangle of material, or null when there is none. */
export function findMaterialPatch({ data, width, height }: Pixels): Patch | null {
  const count = width * height;

  if (count === 0) return null;

  const cells: Cell[] = new Array(count);

  for (let index = 0; index < count; index++) {
    const r = data[index * 4];
    const g = data[index * 4 + 1];
    const b = data[index * 4 + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    cells[index] = { luma, cb: 0.564 * (b - luma), cr: 0.713 * (r - luma) };
  }

  const backdrop = backdropCells(cells, width, height);
  const seed = materialColour(cells, backdrop, width, height);

  if (!seed) return null;

  const tolerance = toleranceFor(cells, backdrop, seed);
  const marked = new Uint8Array(count);

  for (let index = 0; index < count; index++) {
    marked[index] =
      backdrop[index] === 0 && colourDistance(cells[index], seed) <= tolerance ? 1 : 0;
  }

  const rectangle = largestRectangle(majority(marked, width, height), width, height);

  if (!rectangle || rectangle.width * rectangle.height < count * MIN_PATCH_SHARE) return null;

  return withinAspect(rectangle, width, height);
}

/** Near-white pixels reachable from the frame: a backdrop, not a pale floor. */
function backdropCells(cells: Cell[], width: number, height: number): Uint8Array {
  const backdrop = new Uint8Array(cells.length);
  const stack: number[] = [];

  const isPale = (index: number) =>
    cells[index].luma >= BACKDROP_LUMA &&
    Math.hypot(cells[index].cb, cells[index].cr) <= BACKDROP_CHROMA;

  const visit = (index: number) => {
    if (backdrop[index] === 0 && isPale(index)) {
      backdrop[index] = 1;
      stack.push(index);
    }
  };

  for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
  }

  for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }

  while (stack.length > 0) {
    const index = stack.pop() as number;
    const x = index % width;

    if (x > 0) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index + width < cells.length) visit(index + width);
  }

  return backdrop;
}

/** Weighted median per channel, leaning to the lower middle of the frame. */
function materialColour(
  cells: Cell[],
  backdrop: Uint8Array,
  width: number,
  height: number,
): Cell | null {
  const samples: { cell: Cell; weight: number }[] = [];

  for (let index = 0; index < cells.length; index++) {
    if (backdrop[index] === 1) continue;

    const x = (index % width) / Math.max(1, width - 1);
    const y = Math.floor(index / width) / Math.max(1, height - 1);
    const across = 1 - Math.abs(x - 0.5) * 1.2;
    // A floor runs towards the camera; what fills the top of a shot is scenery.
    const down = y < 0.42 ? 0.04 : 1;

    samples.push({ cell: cells[index], weight: across * down });
  }

  if (samples.length === 0) return null;

  const median = (channel: keyof Cell) => {
    const sorted = [...samples].sort((a, b) => a.cell[channel] - b.cell[channel]);
    const half = sorted.reduce((total, sample) => total + sample.weight, 0) / 2;
    let running = 0;

    for (const sample of sorted) {
      running += sample.weight;
      if (running >= half) return sample.cell[channel];
    }

    return sorted[sorted.length - 1].cell[channel];
  };

  return { luma: median("luma"), cb: median("cb"), cr: median("cr") };
}

/** Wide enough for the material's own grain, which depends on the material. */
function toleranceFor(cells: Cell[], backdrop: Uint8Array, seed: Cell): number {
  const distances: number[] = [];

  for (let index = 0; index < cells.length; index++) {
    if (backdrop[index] === 0) distances.push(colourDistance(cells[index], seed));
  }

  distances.sort((a, b) => a - b);

  const spread = distances[Math.floor(distances.length * 0.4)] ?? 0;

  return Math.min(MAX_TOLERANCE, Math.max(MIN_TOLERANCE, spread * 1.8));
}

/** Chroma counts double: a shadow changes brightness, not what a thing is. */
function colourDistance(a: Cell, b: Cell): number {
  return Math.hypot((a.luma - b.luma) * 0.6, (a.cb - b.cb) * 1.6, (a.cr - b.cr) * 1.6);
}

/** Each cell takes the majority of its 3×3 block, so grain does not break a run. */
function majority(marked: Uint8Array, width: number, height: number): Uint8Array {
  const smoothed = new Uint8Array(marked.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let total = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

          sum += marked[ny * width + nx];
          total++;
        }
      }

      smoothed[y * width + x] = sum * 2 > total ? 1 : 0;
    }
  }

  return smoothed;
}

type Rectangle = { x: number; y: number; width: number; height: number };

/** The classic histogram-and-stack search: linear in the number of cells. */
function largestRectangle(marked: Uint8Array, width: number, height: number): Rectangle | null {
  const heights = new Int32Array(width + 1);
  let best: Rectangle | null = null;
  let bestArea = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      heights[x] = marked[y * width + x] === 1 ? heights[x] + 1 : 0;
    }

    const stack: number[] = [];

    for (let x = 0; x <= width; x++) {
      while (stack.length > 0 && heights[stack[stack.length - 1]] >= heights[x]) {
        const tall = heights[stack.pop() as number];
        const left = stack.length > 0 ? stack[stack.length - 1] + 1 : 0;
        const area = tall * (x - left);

        if (area > bestArea) {
          bestArea = area;
          best = { x: left, y: y - tall + 1, width: x - left, height: tall };
        }
      }

      stack.push(x);
    }
  }

  return best;
}

function withinAspect(rectangle: Rectangle, width: number, height: number): Patch {
  let { x, y, width: w, height: h } = rectangle;

  if (w > h * MAX_ASPECT) {
    const trimmed = Math.round(h * MAX_ASPECT);
    x += Math.floor((w - trimmed) / 2);
    w = trimmed;
  } else if (h > w * MAX_ASPECT) {
    const trimmed = Math.round(w * MAX_ASPECT);
    y += Math.floor((h - trimmed) / 2);
    h = trimmed;
  }

  return { x: x / width, y: y / height, width: w / width, height: h / height };
}
