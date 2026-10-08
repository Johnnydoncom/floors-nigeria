import {
  domainCovering,
  domainQuad,
  fitDomainToFrame,
  maskHull,
  type MaterialDomain,
} from "./coverage";
import { unitSquareToQuad } from "./homography";
import {
  classifyScene,
  cleanFloorMask,
  resampleBinary,
  type LabelledScene,
  type Segment,
} from "./floor-mask";
import { refineMask, type Grid, type Rgb } from "./refine-mask";
import type { Point, Quad } from "./types";

/**
 * Automatic floor detection (§10, "AI-assisted floor/wall boundary detection").
 *
 * A semantic segmentation model labels every pixel of the room, and the pixels
 * it calls floor are reduced to the four corners the renderer needs. The model
 * runs entirely in the browser, so the photograph still never leaves the
 * device.
 *
 * SegFormer-B0 trained on ADE20K is the choice here: ADE20K has a dedicated
 * floor class, and the quantised B0 weights are about 4MB — small enough to
 * fetch on Nigerian mobile data, which rules out the larger indoor-scene
 * models. It is loaded on demand, so visitors who never press the button never
 * pay for it.
 */

const MODEL_ID = "Xenova/segformer-b0-finetuned-ade-512-512";

/** Below this share of the photo, the detection is too small to be a room floor. */
const MIN_FLOOR_COVERAGE = 0.04;

/**
 * A floor patch is kept when it is this much of the biggest patch, and this
 * much of the photograph.
 *
 * A floor is not always one connected shape: a console table against a wall, an
 * island unit, or a doorway through to a hall all split it in two. Keeping only
 * the biggest piece leaves the rest on its old covering.
 */
const KEEP_REGION = { ofLargest: 0.08, ofFrame: 0.005 };

/**
 * How far above the floor's own furthest row a second patch may begin, as a
 * share of the photograph, and still be believed.
 *
 * Size alone is not enough to tell a second piece of floor from a mistake. The
 * model reliably calls a few wood-toned vertical surfaces floor — a panelled
 * door, a framed picture, the treads of a staircase — and any of them can be
 * larger than a genuine strip of floor past a kitchen island. What separates
 * them is where they sit: a floor cannot begin further away than the floor
 * does, because there is no floor behind the far wall to be a part of. A patch
 * that starts higher up the photograph than that is on a wall.
 */
const SAME_PLANE_TOLERANCE = 0.04;

/**
 * Width the mask is refined to. The model's own output is a few hundred pixels
 * across; refining much beyond this costs time without sharpening anything,
 * since the mask is scaled to the canvas afterwards regardless.
 */
export const REFINE_WIDTH = 1280;

/**
 * Longest side of the image handed to the model.
 *
 * SegFormer resizes everything to 512 square internally, so a bigger input adds
 * no detail — but the pipeline upsamples all 150 class maps back to whatever
 * size it was given, in JavaScript. At a phone photo's size that was seconds of
 * work and tens of megabytes; the refinement step restores a crisp boundary
 * against the full photograph anyway.
 */
export const MODEL_INPUT_SIDE = 640;

/** Share of the band averaged at each end when measuring the floor's extent. */
const EDGE_BAND = 0.12;

/** The far edge never narrows below this share of the near edge. */
const MIN_FAR_WIDTH_RATIO = 0.25;

/**
 * How far past its own edges the detected quad may be stretched to swallow the
 * mask, in quad widths and depths.
 *
 * Modest on purpose. This quad is what the visitor sees and drags when they
 * open "Adjust floor area", so it has to stay on the photograph; the renderer
 * no longer relies on it to bound the material, and widens its own domain
 * until every floor pixel is covered whatever this comes out as.
 */
const MAX_EXPANSION = { u: 1.6, v: 1.1 };

/** How far outside the photo a corner handle may sit and still be draggable. */
const HANDLE_MARGIN = 0.14;

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
  /**
   * `downloading` the model (with a percentage), `preparing` the runtime that
   * executes it, then `analysing` the photograph.
   */
  stage: "downloading" | "preparing" | "analysing";
  /** 0–100 while the model downloads. */
  percent?: number;
};

/** What detection needs from the photograph, prepared on the main thread. */
export type DetectionInput = {
  /** The photograph, small, for the model. */
  modelInput: Rgb;
  /** The photograph at the refinement resolution, for snapping the boundary. */
  photo: Rgb;
};

type Segmenter = (image: unknown) => Promise<Segment[]>;

let segmenterPromise: Promise<{ segmenter: Segmenter; toImage: (input: Rgb) => unknown }> | null =
  null;

/**
 * Where the ONNX runtime is served from. `scripts/vendor-ort.mjs` copies it out
 * of node_modules at build time, into a folder named for its version so it can
 * be cached forever; same-origin, so it is cached at all — the default CDN copy
 * was refused by the browser's cache and downloaded again on every visit.
 */
const SELF_HOSTED_RUNTIME = "/vendor/ort";

/**
 * Load the model once per session and share it across detections.
 */
async function getSegmenter(onProgress?: (progress: DetectionProgress) => void) {
  segmenterPromise ??= (async () => {
    const { pipeline, env, RawImage } = await import("@huggingface/transformers");

    await pointAtSelfHostedRuntime(env.backends.onnx as OnnxEnv);

    // Several files download: a few kilobytes of configuration, then the
    // weights. Progress is measured on the weights alone — counting a config
    // file that finishes first showed 100% and then fell back to 10%.
    const weights = new Map<string, { loaded: number; total: number }>();

    const segmenter = await pipeline("image-segmentation", MODEL_ID, {
      dtype: "q8",
      device: "wasm",
      progress_callback: (event: {
        status?: string;
        file?: string;
        loaded?: number;
        total?: number;
      }) => {
        if (event.status === "progress" && event.file && event.total) {
          if (!event.file.endsWith(".onnx")) return;
          weights.set(event.file, { loaded: event.loaded ?? 0, total: event.total });
          const loaded = [...weights.values()].reduce((sum, file) => sum + file.loaded, 0);
          const total = [...weights.values()].reduce((sum, file) => sum + file.total, 0);
          onProgress?.({ stage: "downloading", percent: Math.round((loaded / total) * 100) });
        } else if (event.status === "ready") {
          onProgress?.({ stage: "preparing" });
        }
      },
    });

    return {
      segmenter: segmenter as unknown as Segmenter,
      toImage: (input: Rgb) => new RawImage(input.data, input.width, input.height, 4),
    };
  })();

  try {
    return await segmenterPromise;
  } catch (error) {
    // A failed download must not poison every later attempt.
    segmenterPromise = null;
    throw error;
  }
}

type OnnxEnv = {
  versions?: { web?: string };
  wasm?: { wasmPaths?: unknown };
};

/**
 * Point the runtime at the self-hosted copy when this deployment has one, and
 * leave the CDN default in place when it does not — detection must never fail
 * because a build step was skipped.
 *
 * The plain SIMD build is chosen on every browser. Transformers.js picks the
 * "asyncify" build outside Safari, which only WebGPU needs; it is 23MB against
 * 13MB, and this model runs on the CPU.
 */
async function pointAtSelfHostedRuntime(onnx: OnnxEnv): Promise<void> {
  const version = onnx.versions?.web;

  if (!version || !onnx.wasm) return;

  const base = `${SELF_HOSTED_RUNTIME}/${version}`;

  try {
    const probe = await fetch(`${base}/ort-wasm-simd-threaded.mjs`, { method: "HEAD" });
    if (!probe.ok) return;
  } catch {
    return;
  }

  onnx.wasm.wasmPaths = {
    mjs: `${base}/ort-wasm-simd-threaded.mjs`,
    wasm: `${base}/ort-wasm-simd-threaded.wasm`,
  };
}

/**
 * Find the floor in a prepared photograph and return its mask and quad, or null
 * when the model finds nothing convincing — in which case the visitor marks it
 * by hand.
 *
 * Runs in a Web Worker (`floor-detector.ts`): nothing here touches the DOM, so
 * the model and every pass over the masks happen off the main thread and the
 * page never freezes while a floor is being found.
 */
export async function analyseRoom(
  input: DetectionInput,
  onProgress?: (progress: DetectionProgress) => void,
): Promise<FloorDetection | null> {
  const { segmenter, toImage } = await getSegmenter(onProgress);

  onProgress?.({ stage: "analysing" });

  const scene = classifyScene(await segmenter(toImage(input.modelInput)));

  if (scene === null) return null;

  // Snap the model's soft, low-resolution boundary onto the edges the
  // photograph actually has, then reconcile it with the rest of the label map,
  // before anything is measured from it.
  const sharpened = sharpenAgainstPhoto(scene, input.photo);
  const geometry = floorGeometryFromMask(cleanFloorMask(sharpened));

  if (geometry === null) return null;

  return {
    quad: geometry.quad,
    mask: toAlphaMask(geometry.mask),
  };
}

/**
 * Everything between "these pixels are floor" and "here is the floor".
 *
 * Separated from the model so the geometry can be exercised on a mask built by
 * hand — the part with the arithmetic in it is the part worth testing, and it
 * should not need a 3MB download to run.
 */
export function floorGeometryFromMask(mask: Grid): { quad: Quad; mask: Grid } | null {
  const { width, height } = mask;
  const floor = keptFloor(mask);

  if (floor === null) return null;
  if (floor.area / (width * height) < MIN_FLOOR_COVERAGE) return null;

  // Perspective comes from the largest patch — the open floor. The smaller
  // patches are the same plane seen past an obstruction, so they follow it.
  const quad = quadFromRegion(floor.primary, width, height);

  if (quad === null) return null;

  return { quad: expandQuadOverMask(quad, floor.mask), mask: floor.mask };
}

/**
 * Refine the floor boundary against the photograph, at the refinement
 * resolution the whole scene is resampled to.
 */
function sharpenAgainstPhoto(scene: LabelledScene, photo: Rgb): LabelledScene {
  const { width, height } = photo;

  // Every mask and the photograph must line up pixel for pixel before the
  // boundary can be re-decided against the photograph's own edges.
  const at = (mask: Uint8Array) => resampleBinary(mask, scene, width, height);
  const structure = at(scene.structure);

  const floor = refineMask({ data: at(scene.floor), width, height }, photo, structure);

  return {
    width,
    height,
    floor: floor.data,
    structure,
    occluder: at(scene.occluder),
  };
}

/**
 * Stretch the quad along its own plane until it contains the floor.
 *
 * The quad above describes the floor's perspective but only spans its middle,
 * and an outline that stops short of the skirting is the first thing a visitor
 * corrects by hand. Rather than guess at a bigger quad, the mask's own outline
 * is mapped back onto the material through the inverse homography; the image of
 * that rectangle is a quad on the same plane, with the same perspective, that
 * covers all of it (see `coverage.ts`).
 *
 * It is then pulled back inside the photograph, because these four corners
 * carry the drag handles. Coverage does not depend on the result: the renderer
 * widens its own domain over the mask whatever quad it is given.
 */
function expandQuadOverMask(quad: Quad, mask: Grid): Quad {
  const { width, height } = mask;
  const homography = unitSquareToQuad(toPixels(quad, width, height));
  const outline = maskHull(width, height, (index) => mask.data[index] === 1);

  const domain: MaterialDomain = fitDomainToFrame(
    homography,
    domainCovering(homography, outline, width, height, MAX_EXPANSION),
    width,
    height,
    HANDLE_MARGIN,
  );

  return domainQuad(homography, domain).map((point) => fromPixels(point, width, height)) as Quad;
}

function toPixels(quad: Quad, width: number, height: number): Quad {
  return quad.map((point) => ({ x: point.x * width, y: point.y * height })) as Quad;
}

function fromPixels(point: Point, width: number, height: number): Point {
  return { x: point.x / width, y: point.y / height };
}

/**
 * The floor mask as an image the renderer can composite against.
 *
 * Opaque where the floor is, transparent everywhere else, so a single
 * `destination-in` pass trims rendered material back to the floor — including
 * around chair legs and table bases, which no quadrilateral could do.
 */
function toAlphaMask(mask: Grid): ImageData {
  const image = new ImageData(mask.width, mask.height);

  for (let index = 0; index < mask.data.length; index++) {
    image.data[index * 4 + 3] = mask.data[index] === 1 ? 255 : 0;
  }

  return image;
}

/** One connected run of floor, while the patches are still being judged. */
type Patch = {
  area: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
};

type Region = {
  /** Leftmost and rightmost floor pixel on each row, or -1 where there is none. */
  left: Int32Array;
  right: Int32Array;
  top: number;
  bottom: number;
  area: number;
};

/**
 * The floor as the renderer should see it: every patch worth keeping, plus the
 * extents of the biggest one for the quad fit.
 *
 * A room's floor is often more than one connected shape — a table pushed to a
 * wall, a kitchen island, a doorway through to a hall all cut it in two — and
 * keeping only the biggest piece leaves the rest on its old covering, which is
 * the complaint this path exists to answer. Every patch that is a real share of
 * both the biggest one and of the photograph is kept; genuine strays, a
 * reflection or a bright sliver of wall, still go.
 *
 * Iterative flood fill: a recursive one overflows the stack on a floor filling
 * half a photograph. Eight-connected, so a patch pinched to a diagonal by a
 * chair leg stays one patch rather than two half-sized ones that then both fail
 * the threshold.
 */
function keptFloor(mask: Grid): { mask: Grid; primary: Region; area: number } | null {
  const { data, width, height } = mask;
  const labels = new Int32Array(data.length).fill(-1);
  const stack: number[] = [];
  const patches: Patch[] = [];

  for (let start = 0; start < data.length; start++) {
    if (data[start] === 0 || labels[start] !== -1) continue;

    const label = patches.length;
    const patch: Patch = {
      area: 0,
      top: height,
      bottom: -1,
      left: width,
      right: -1,
    };

    stack.push(start);
    labels[start] = label;

    while (stack.length > 0) {
      const index = stack.pop()!;
      patch.area++;

      const x = index % width;
      const y = (index - x) / width;

      if (y < patch.top) patch.top = y;
      if (y > patch.bottom) patch.bottom = y;
      if (x < patch.left) patch.left = x;
      if (x > patch.right) patch.right = x;

      for (let dy = -1; dy <= 1; dy++) {
        const sampleY = y + dy;

        if (sampleY < 0 || sampleY >= height) continue;

        for (let dx = -1; dx <= 1; dx++) {
          const sampleX = x + dx;

          if (sampleX < 0 || sampleX >= width) continue;

          const neighbour = sampleY * width + sampleX;

          if (data[neighbour] === 1 && labels[neighbour] === -1) {
            labels[neighbour] = label;
            stack.push(neighbour);
          }
        }
      }
    }

    patches.push(patch);
  }

  if (patches.length === 0) return null;

  let primaryLabel = 0;

  for (let label = 1; label < patches.length; label++) {
    if (patches[label].area > patches[primaryLabel].area) primaryLabel = label;
  }

  const biggest = patches[primaryLabel];
  const enough = Math.max(
    biggest.area * KEEP_REGION.ofLargest,
    width * height * KEEP_REGION.ofFrame,
  );
  const highest = biggest.top - height * SAME_PLANE_TOLERANCE;

  const keep = patches.map(
    (patch, label) =>
      label === primaryLabel || (patch.area >= enough && onTheSamePlane(patch, biggest, highest)),
  );

  const kept = new Uint8Array(data.length);
  const left = new Int32Array(height).fill(-1);
  const right = new Int32Array(height).fill(-1);
  let top = -1;
  let bottom = -1;
  let area = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const label = labels[index];

      if (label === -1 || !keep[label]) continue;

      kept[index] = 1;
      area++;

      if (label !== primaryLabel) continue;
      if (left[y] === -1) left[y] = x;
      right[y] = x;
    }

    if (left[y] !== -1) {
      if (top === -1) top = y;
      bottom = y;
    }
  }

  if (top === -1) return null;

  return {
    mask: { data: kept, width, height },
    primary: { left, right, top, bottom, area: biggest.area },
    area,
  };
}

/**
 * Could this patch be more of the same floor, rather than something on a wall?
 *
 * Two questions, both about depth, because depth is what a photograph of a room
 * actually tells you. It must not begin further away than the floor itself
 * reaches — there is no floor behind the far wall for it to be part of — and it
 * must come down to at least where the floor begins, rather than floating in
 * the wall above it. A panelled door and a framed picture each fail; a strip of
 * floor beyond a kitchen island passes.
 *
 * Deliberately says nothing about where the patch sits horizontally: the case
 * this exists for — a floor cut in two by something standing against a wall —
 * leaves two patches side by side that share no columns at all.
 */
function onTheSamePlane(patch: Patch, primary: Patch, highest: number): boolean {
  return patch.top >= highest && patch.bottom >= primary.top;
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
