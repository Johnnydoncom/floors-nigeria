import type { Quad } from "./types";

/**
 * Automatic floor detection (§10, "AI-assisted floor/wall boundary detection").
 *
 * A semantic segmentation model labels every pixel of the room, and the pixels
 * it calls floor are reduced to the four corners the renderer needs. The model
 * runs entirely in the browser, so the photograph still never leaves the
 * device.
 *
 * SegFormer-B0 trained on ADE20K is the choice here: ADE20K has a dedicated
 * floor class, and the quantised B0 weights are under 3MB — small enough to
 * fetch on Nigerian mobile data, which rules out the larger indoor-scene
 * models. It is loaded on demand, so visitors who never press the button never
 * pay for it.
 */

const MODEL_ID = "Xenova/segformer-b0-finetuned-ade-512-512";

/** ADE20K classes that are floor for our purposes. */
const FLOOR_LABELS = new Set(["floor", "rug"]);

/** Below this share of the photo, the detection is too small to be a room floor. */
const MIN_FLOOR_COVERAGE = 0.04;

/** Share of the band averaged at each end when measuring the floor's extent. */
const EDGE_BAND = 0.12;

/** The far edge never narrows below this share of the near edge. */
const MIN_FAR_WIDTH_RATIO = 0.25;

/** A row counts as open floor at this share of the floor's widest row. */
const BODY_WIDTH_RATIO = 0.45;

/**
 * What the detector found: where the floor is, and how perspective runs across
 * it.
 *
 * These answer different questions and must not be conflated. The *mask* is
 * the exact set of floor pixels, furniture and rugs bitten out of it — it
 * decides where material may be drawn. The *quad* is four points on the floor
 * plane that define the homography — it decides how the material recedes. A
 * quad alone cannot express "floor, except where the sofa is"; a mask alone
 * carries no perspective.
 */
export type FloorDetection = {
  quad: Quad;
  /** Floor pixels as an alpha mask, at the size the model worked in. */
  mask: ImageData;
};

export type DetectionProgress = {
  stage: "downloading" | "analysing";
  /** 0–100 while the model downloads. */
  percent?: number;
};

type SegmentationResult = {
  label: string;
  mask: { data: Uint8Array; width: number; height: number };
};

type Segmenter = (image: string) => Promise<SegmentationResult[]>;

let segmenterPromise: Promise<Segmenter> | null = null;

/**
 * Load the model once per session and share it across detections.
 */
async function getSegmenter(
  onProgress?: (progress: DetectionProgress) => void,
): Promise<Segmenter> {
  segmenterPromise ??= (async () => {
    const { pipeline } = await import("@huggingface/transformers");

    const segmenter = await pipeline("image-segmentation", MODEL_ID, {
      dtype: "q8",
      progress_callback: (event: { status?: string; progress?: number }) => {
        if (event.status === "progress") {
          onProgress?.({ stage: "downloading", percent: Math.round(event.progress ?? 0) });
        }
      },
    });

    return segmenter as unknown as Segmenter;
  })();

  try {
    return await segmenterPromise;
  } catch (error) {
    // A failed download must not poison every later attempt.
    segmenterPromise = null;
    throw error;
  }
}

/**
 * Find the floor in a room photograph and return it as a quad, or null when
 * the model finds nothing convincing — in which case the visitor marks it by
 * hand, exactly as before.
 */
export async function detectFloor(
  imageSrc: string,
  onProgress?: (progress: DetectionProgress) => void,
): Promise<FloorDetection | null> {
  const segmenter = await getSegmenter(onProgress);

  onProgress?.({ stage: "analysing" });

  const segments = await segmenter(imageSrc);
  const floors = segments.filter((segment) => FLOOR_LABELS.has(segment.label.toLowerCase()));

  if (floors.length === 0) return null;

  const { width, height } = floors[0].mask;
  const mask = mergeMasks(floors, width, height);
  const region = largestRegion(mask, width, height);

  if (region === null || region.area / (width * height) < MIN_FLOOR_COVERAGE) return null;

  const quad = quadFromRegion(region, width, height);

  return quad === null ? null : { quad, mask: toAlphaMask(mask, width, height) };
}

/**
 * The floor mask as an image the renderer can composite against.
 *
 * Opaque where the floor is, transparent everywhere else, so a single
 * `destination-in` pass trims rendered material back to the floor — including
 * around chair legs and table bases, which no quadrilateral could do.
 */
function toAlphaMask(mask: Uint8Array, width: number, height: number): ImageData {
  const image = new ImageData(width, height);

  for (let index = 0; index < mask.length; index++) {
    image.data[index * 4 + 3] = mask[index] === 1 ? 255 : 0;
  }

  return image;
}

/**
 * Floor and rug are separate classes but the same surface to us.
 */
function mergeMasks(segments: SegmentationResult[], width: number, height: number): Uint8Array {
  const merged = new Uint8Array(width * height);

  for (const segment of segments) {
    const { data } = segment.mask;
    for (let index = 0; index < merged.length; index++) {
      if (data[index] > 127) merged[index] = 1;
    }
  }

  return merged;
}

type Region = {
  /** Leftmost and rightmost floor pixel on each row, or -1 where there is none. */
  left: Int32Array;
  right: Int32Array;
  top: number;
  bottom: number;
  area: number;
};

/**
 * Keep the largest connected run of floor and discard stray patches — a strip
 * of hallway through a doorway, or a reflection the model mislabelled.
 *
 * Iterative flood fill: a recursive one overflows the stack on a floor that
 * fills half a photograph.
 */
function largestRegion(mask: Uint8Array, width: number, height: number): Region | null {
  const labels = new Int32Array(mask.length).fill(-1);
  const stack: number[] = [];

  let bestLabel = -1;
  let bestArea = 0;
  let label = 0;

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] === 0 || labels[start] !== -1) continue;

    let area = 0;
    stack.push(start);
    labels[start] = label;

    while (stack.length > 0) {
      const index = stack.pop()!;
      area++;

      const x = index % width;
      const y = (index - x) / width;

      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];

      for (const neighbour of neighbours) {
        if (neighbour >= 0 && mask[neighbour] === 1 && labels[neighbour] === -1) {
          labels[neighbour] = label;
          stack.push(neighbour);
        }
      }
    }

    if (area > bestArea) {
      bestArea = area;
      bestLabel = label;
    }

    label++;
  }

  if (bestLabel === -1) return null;

  const left = new Int32Array(height).fill(-1);
  const right = new Int32Array(height).fill(-1);
  let top = -1;
  let bottom = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (labels[y * width + x] !== bestLabel) continue;
      if (left[y] === -1) left[y] = x;
      right[y] = x;
    }

    if (left[y] !== -1) {
      if (top === -1) top = y;
      bottom = y;
    }
  }

  return top === -1 ? null : { left, right, top, bottom, area: bestArea };
}

/**
 * Reduce the floor region to four corners describing how perspective runs.
 *
 * With the mask deciding *where* material goes, this quad only has to describe
 * *how* it recedes — which is a much more forgiving job, and a good thing,
 * because a floor's visible outline is bounded by furniture, not by walls.
 * Fitting lines to that outline traces the sofa.
 *
 * Instead the quad is built from the two facts a floor mask does report
 * reliably: how far up the photograph the floor reaches, and roughly where it
 * recedes to. The near edge spans the width of the floor at the bottom of the
 * frame; the far edge is centred on the middle of the floor's furthest rows,
 * narrowed by how much the floor has closed in by then. That yields a
 * trapezoid whose sides converge on the part of the room the floor actually
 * runs towards — and the visitor can still drag any corner.
 */
function quadFromRegion(region: Region, width: number, height: number): Quad | null {
  const { left, right, top, bottom } = region;

  const widths = new Int32Array(height);
  let widest = 0;

  for (let y = top; y <= bottom; y++) {
    widths[y] = left[y] === -1 ? 0 : right[y] - left[y] + 1;
    widest = Math.max(widest, widths[y]);
  }

  if (widest < 16) return null;

  const band = widestBand(widths, top, bottom, widest * BODY_WIDTH_RATIO);

  if (band === null || band.bottom - band.top < 8) return null;

  const near = averageExtent(
    left,
    right,
    band.bottom - Math.round((band.bottom - band.top) * EDGE_BAND),
    band.bottom,
  );
  const far = averageExtent(
    left,
    right,
    band.top,
    band.top + Math.round((band.bottom - band.top) * EDGE_BAND),
  );

  if (!near || !far) return null;

  const nearWidth = near.right - near.left;

  if (nearWidth <= 0) return null;

  // How much the floor has closed in by its far rows, floored so an
  // occluded far end cannot collapse the quad to a point.
  const closing = Math.max(MIN_FAR_WIDTH_RATIO, Math.min(1, (far.right - far.left) / nearWidth));
  const farWidth = nearWidth * closing;
  const farCentre = (far.left + far.right) / 2;

  return [
    normalise({ x: farCentre - farWidth / 2, y: band.top }, width, height),
    normalise({ x: farCentre + farWidth / 2, y: band.top }, width, height),
    normalise({ x: near.right, y: band.bottom }, width, height),
    normalise({ x: near.left, y: band.bottom }, width, height),
  ];
}

/**
 * The floor's horizontal extent averaged over a run of rows, which is steadier
 * than any single row that furniture happens to interrupt.
 */
function averageExtent(
  left: Int32Array,
  right: Int32Array,
  from: number,
  to: number,
): { left: number; right: number } | null {
  let count = 0;
  let sumLeft = 0;
  let sumRight = 0;

  for (let y = Math.min(from, to); y <= Math.max(from, to); y++) {
    if (left[y] === -1) continue;
    count++;
    sumLeft += left[y];
    sumRight += right[y];
  }

  return count === 0 ? null : { left: sumLeft / count, right: sumRight / count };
}

/**
 * The longest run of rows where the floor is at least `minimumWidth` across —
 * the open floor, rather than the slivers leading to it.
 */
function widestBand(
  widths: Int32Array,
  top: number,
  bottom: number,
  minimumWidth: number,
): { top: number; bottom: number } | null {
  let best: { top: number; bottom: number } | null = null;
  let runStart = -1;

  for (let y = top; y <= bottom + 1; y++) {
    const isWide = y <= bottom && widths[y] >= minimumWidth;

    if (isWide && runStart === -1) {
      runStart = y;
    } else if (!isWide && runStart !== -1) {
      const run = { top: runStart, bottom: y - 1 };
      if (best === null || run.bottom - run.top > best.bottom - best.top) best = run;
      runStart = -1;
    }
  }

  return best;
}

function normalise(point: { x: number; y: number }, width: number, height: number) {
  return {
    // Allow a little overshoot so a floor running off-frame still reaches the edge.
    x: Math.min(1.15, Math.max(-0.15, point.x / width)),
    y: Math.min(1.15, Math.max(-0.15, point.y / height)),
  };
}
