import type { LayoutPattern, MaterialKind } from "./types";

/**
 * Laying patterns, as geometry (§10).
 *
 * Each layout is described by one repeating period — a rectangle, in metres,
 * that tiles the plane by plain translation — and the planks inside it. The
 * renderer bakes a period into a texture once and repeats it, so the cost of a
 * herringbone is paid per material change, not per frame.
 *
 * Planks may hang over the period's edge; whatever hangs over one side is the
 * part that belongs on the opposite side, so the baker draws each plank at the
 * neighbouring offsets as well and lets the canvas edge clip it. That is what
 * makes every period seamless without special-casing the joins.
 *
 * Pure arithmetic, so the tiling guarantees can be checked without a browser
 * (`scripts/patterns.test.mjs`).
 */

export type PlankRect = {
  /** Top-left corner in metres, inside or overhanging the period. */
  x: number;
  y: number;
  /** Extent along x and y, in metres. */
  w: number;
  h: number;
  /** Turned a quarter: the plank's length runs along y. */
  vertical: boolean;
  /** Stable per-plank number, for choosing which part of the texture it shows. */
  seed: number;
};

export type PatternPeriod = {
  width: number;
  height: number;
  planks: PlankRect[];
  /** Turn the whole pattern by this much on top of the visitor's own rotation. */
  baseRotation: number;
};

/** Rows in a period: enough planks that the repeat is not noticed. */
const ROWS = 8;

/** Planks per row in a period, for the layouts that lay rows. */
const COLUMNS = 3;

/** Herringbone needs a whole-number ratio of length to width to close up. */
const MIN_HERRINGBONE_RATIO = 2;

/**
 * The period for a layout and plank size.
 *
 * `lengthM` runs along the plank, `widthM` across it. For a square tile they
 * are the same.
 */
export function patternPeriod(
  layout: LayoutPattern,
  kind: MaterialKind,
  lengthM: number,
  widthM: number,
): PatternPeriod {
  const length = Math.max(lengthM, 0.01);
  const width = Math.max(Math.min(widthM, length), 0.01);

  switch (layout) {
    case "grid":
      return gridPeriod(length, width);
    case "staggered":
      return rowsPeriod(length, width, (row) => (row % 2) * 0.5);
    case "straight":
      return rowsPeriod(length, width, (row) => randomOffsets[row % randomOffsets.length]);
    case "herringbone":
      return herringbonePeriod(length, width);
    case "diagonal":
      // Tiles go diagonal as a grid; planks as a stagger, which is how a
      // diagonal plank floor is actually fitted.
      return {
        ...(kind === "tile"
          ? gridPeriod(length, width)
          : rowsPeriod(length, width, (row) => (row % 2) * 0.5)),
        baseRotation: 45,
      };
    case "natural":
    default:
      return { width: length, height: length, planks: [], baseRotation: 0 };
  }
}

/**
 * Joint offsets for a random lay, as a fraction of a plank length.
 *
 * Fixed rather than random so a pattern is identical on every render and in a
 * saved design. No two neighbouring rows sit within a fifth of a plank of each
 * other, which is the fitter's rule for keeping end joints apart.
 */
const randomOffsets = [0, 0.38, 0.77, 0.21, 0.6, 0.94, 0.33, 0.71];

function gridPeriod(length: number, width: number): PatternPeriod {
  const planks: PlankRect[] = [];
  const columns = 4;
  const rows = 4;

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      planks.push({
        x: column * length,
        y: row * width,
        w: length,
        h: width,
        vertical: false,
        seed: row * columns + column,
      });
    }
  }

  return { width: columns * length, height: rows * width, planks, baseRotation: 0 };
}

/**
 * Rows of planks, each row's joints shifted by `offset(row)` plank lengths.
 *
 * The period is a whole number of planks wide, so a row wraps onto itself
 * exactly whatever its offset.
 */
function rowsPeriod(length: number, width: number, offset: (row: number) => number): PatternPeriod {
  const planks: PlankRect[] = [];
  const periodWidth = COLUMNS * length;

  for (let row = 0; row < ROWS; row++) {
    const shift = (((offset(row) % 1) + 1) % 1) * length;

    // The last plank overhangs the right edge by exactly the gap the shift left
    // at the start; wrapping draws that overhang there, so no extra plank.
    for (let column = 0; column < COLUMNS; column++) {
      planks.push({
        x: shift + column * length,
        y: row * width,
        w: length,
        h: width,
        vertical: false,
        seed: row * COLUMNS + column,
      });
    }
  }

  return { width: periodWidth, height: ROWS * width, planks, baseRotation: 0 };
}

/**
 * Herringbone: horizontal and vertical planks in a staircase.
 *
 * Horizontal plank k sits at (kW, kW), and the vertical plank whose side it
 * butts against at (kW − W, kW). Successive pairs step one plank width along
 * the diagonal, and the staircases repeat every 2L across. With L a whole
 * number of widths, (0, 2L) is a translation of the pattern too, so a square
 * 2L period contains it exactly: 2L / W pairs.
 *
 * Laid axis-aligned, the zigzag runs corner to corner; the classic look has it
 * running along the room, which is a 45° turn.
 */
export function herringbonePeriod(length: number, width: number): PatternPeriod {
  const ratio = Math.max(MIN_HERRINGBONE_RATIO, Math.round(length / width));
  const plankLength = ratio * width;
  const side = 2 * plankLength;
  const pairs = 2 * ratio;
  const planks: PlankRect[] = [];

  for (let k = 0; k < pairs; k++) {
    planks.push({
      x: k * width,
      y: k * width,
      w: plankLength,
      h: width,
      vertical: false,
      seed: k * 2,
    });
    planks.push({
      x: k * width - width,
      y: k * width,
      w: width,
      h: plankLength,
      vertical: true,
      seed: k * 2 + 1,
    });
  }

  return { width: side, height: side, planks, baseRotation: 45 };
}

/**
 * Offsets at which a plank must also be drawn so a period wraps seamlessly:
 * itself, plus any neighbour period it overhangs into.
 */
export function wrapOffsets(plank: PlankRect, period: PatternPeriod): { dx: number; dy: number }[] {
  const offsets: { dx: number; dy: number }[] = [];

  for (const dx of [-period.width, 0, period.width]) {
    for (const dy of [-period.height, 0, period.height]) {
      const left = plank.x + dx;
      const top = plank.y + dy;

      if (left < period.width && left + plank.w > 0 && top < period.height && top + plank.h > 0) {
        offsets.push({ dx, dy });
      }
    }
  }

  return offsets;
}

/** Sensible plank or tile size, in millimetres, when a product records none. */
export function defaultDimensions(kind: MaterialKind): { lengthMm: number; widthMm: number } {
  switch (kind) {
    case "tile":
      return { lengthMm: 600, widthMm: 600 };
    case "rug":
      return { lengthMm: 3000, widthMm: 2000 };
    case "carpet":
      return { lengthMm: 1000, widthMm: 1000 };
    case "plank":
    default:
      return { lengthMm: 1220, widthMm: 183 };
  }
}

/** Layouts that make sense for a kind of floor, in the order they are offered. */
export function layoutsFor(kind: MaterialKind): LayoutPattern[] {
  switch (kind) {
    case "tile":
      return ["natural", "grid", "staggered", "diagonal"];
    case "carpet":
    case "rug":
      return ["natural"];
    case "plank":
    default:
      return ["natural", "staggered", "straight", "herringbone", "diagonal"];
  }
}

export const LAYOUT_LABELS: Record<LayoutPattern, string> = {
  natural: "As photographed",
  straight: "Straight",
  staggered: "Staggered",
  herringbone: "Herringbone",
  diagonal: "Diagonal",
  grid: "Grid",
};
