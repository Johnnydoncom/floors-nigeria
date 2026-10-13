import { decodeRuns, isAreaRuns, type AreaRuns } from "./area-runs";
import type { Point, Quad } from "./types";

/**
 * Hand corrections to the floor area (§10).
 *
 * Detection is good and never perfect: a rug it called furniture, a shadow it
 * called wall, a second room through a doorway. The visitor paints floor in or
 * out with a brush, draws round an area, or taps one and lets smart select find
 * its edges, and the result replaces the detected mask.
 *
 * Edits are kept as a list of operations in normalised coordinates rather than
 * as pixels. Undo is dropping the last one, the list survives a re-render at
 * another resolution, and it is small enough to save with a design — where a
 * stack of full-resolution mask snapshots would cost a phone tens of megabytes.
 */

export type MaskMode = "add" | "erase";

export type MaskEdit =
  | {
      type: "brush";
      mode: MaskMode;
      /** Brush diameter as a share of the photo's width. */
      size: number;
      points: Point[];
    }
  | { type: "polygon"; mode: MaskMode; points: Point[] }
  /** An area smart select found, as a bitmap stretched over the whole photo. */
  | ({ type: "area"; mode: MaskMode } & AreaRuns);

/**
 * The floor area with every edit applied, at the photo's resolution.
 *
 * Starts from the detected mask, or — when the floor was marked by hand — from
 * the quad, so painting works the same either way. Returns null when there is
 * nothing to compose, leaving the quad to bound the material as before.
 */
export function composeMask(
  base: CanvasImageSource | null,
  quad: Quad,
  edits: MaskEdit[],
  width: number,
  height: number,
): HTMLCanvasElement | null {
  if (edits.length === 0 || width === 0 || height === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) return null;

  if (base) {
    // The detected mask is opaque where the floor is; scaling it hard keeps
    // the boundary the refinement step sharpened.
    context.imageSmoothingEnabled = false;
    context.drawImage(base, 0, 0, width, height);
    context.imageSmoothingEnabled = true;
  } else {
    tracePolygon(context, quad, width, height);
    context.fillStyle = "#000";
    context.fill();
  }

  for (const edit of edits) applyEdit(context, edit, width, height);

  return canvas;
}

export function applyEdit(
  context: CanvasRenderingContext2D,
  edit: MaskEdit,
  width: number,
  height: number,
): void {
  context.save();
  context.globalCompositeOperation = edit.mode === "add" ? "source-over" : "destination-out";
  context.fillStyle = "#000";
  context.strokeStyle = "#000";

  if (edit.type === "area") {
    // Smoothing on: the bitmap is coarser than the photo, and a hard scale
    // would put a staircase along every edge it found.
    context.imageSmoothingEnabled = true;
    context.drawImage(areaCanvas(edit), 0, 0, width, height);
  } else if (edit.type === "polygon") {
    if (edit.points.length >= 3) {
      tracePolygon(context, edit.points, width, height);
      context.fill();
    }
  } else {
    const diameter = Math.max(1, edit.size * width);
    const [first, ...rest] = edit.points;

    if (first) {
      context.beginPath();
      context.arc(first.x * width, first.y * height, diameter / 2, 0, Math.PI * 2);
      context.fill();

      if (rest.length > 0) {
        context.lineWidth = diameter;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        context.moveTo(first.x * width, first.y * height);
        for (const point of rest) context.lineTo(point.x * width, point.y * height);
        context.stroke();
      }
    }
  }

  context.restore();
}

/** Each area's bitmap, drawn once and reused on every re-compose. */
const areaCanvases = new WeakMap<AreaRuns, HTMLCanvasElement>();

function areaCanvas(area: AreaRuns): HTMLCanvasElement {
  const cached = areaCanvases.get(area);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;

  const mask = decodeRuns(area);
  const image = new ImageData(area.width, area.height);
  for (let index = 0; index < mask.length; index++) {
    if (mask[index] === 1) image.data[index * 4 + 3] = 255;
  }
  canvas.getContext("2d")?.putImageData(image, 0, 0);

  areaCanvases.set(area, canvas);
  return canvas;
}

function tracePolygon(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  width: number,
  height: number,
): void {
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x * width, point.y * height);
    else context.lineTo(point.x * width, point.y * height);
  });
  context.closePath();
}

/**
 * Drop points closer together than a pixel or so, which a pointer reports by
 * the hundred and which add nothing to a stroke but size to a saved design.
 */
export function simplifyStroke(points: Point[], minDistance = 0.002): Point[] {
  const kept: Point[] = [];

  for (const point of points) {
    const last = kept[kept.length - 1];
    if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= minDistance) kept.push(point);
  }

  const final = points[points.length - 1];
  if (final && kept[kept.length - 1] !== final) kept.push(final);

  return kept.map((point) => ({ x: round(point.x), y: round(point.y) }));
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Parse edits saved with a design, discarding anything malformed. */
export function parseMaskEdits(value: unknown): MaskEdit[] {
  let raw = value;

  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): MaskEdit[] => {
    if (!entry || typeof entry !== "object") return [];

    const candidate = entry as Record<string, unknown>;
    const mode = candidate.mode === "erase" ? "erase" : "add";

    if (candidate.type === "area") {
      if (!isAreaRuns(candidate)) return [];
      const { width, height, runs } = candidate;
      return [{ type: "area", mode, width, height, runs }];
    }

    const points = Array.isArray(candidate.points)
      ? (candidate.points as unknown[]).flatMap((point) => {
          const { x, y } = (point ?? {}) as { x?: unknown; y?: unknown };
          return Number.isFinite(Number(x)) && Number.isFinite(Number(y))
            ? [{ x: Number(x), y: Number(y) }]
            : [];
        })
      : [];

    if (points.length === 0) return [];

    if (candidate.type === "polygon") return [{ type: "polygon", mode, points }];

    const size = Number(candidate.size);
    return [{ type: "brush", mode, size: Number.isFinite(size) && size > 0 ? size : 0.04, points }];
  });
}
