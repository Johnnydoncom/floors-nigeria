import type { Quad } from "./types";

/**
 * The room's own light, separated from the floor it fell on (§10).
 *
 * Multiplying the photograph back over the new material carries its shadows
 * onto it, which is most of what makes a render read as the same room. Done
 * naively it carries the *old floor* too: a dark floor darkens the new one, a
 * red tile tints it, and the brightest reflections are lost because a multiply
 * can only darken.
 *
 * So the light is measured relative to the floor itself. Each pixel's
 * luminance is divided by the floor's average, which leaves 1 where the floor
 * is evenly lit, less in shadow and more in a highlight:
 *
 * - **shading** — the part below 1, as grey, multiplied over the material.
 *   Colourless, so the old floor's hue does not survive, and centred on the
 *   floor's own exposure, so a dark floor no longer darkens a light one.
 * - **highlights** — the part above 1, screened over the material in
 *   proportion to how glossy its finish is: the window glinting off a polished
 *   floor glints off the new one.
 *
 * A light blur first takes out the old floor's own grain and grout lines,
 * which are texture, not light. Computed once per photograph and floor area,
 * then reused for every material and slider change.
 */

export type LightingMaps = { shading: HTMLCanvasElement; highlights: HTMLCanvasElement };

/** Working resolution: shadows are soft enough that this loses nothing visible. */
const MAX_SIDE = 1600;

/**
 * Blur radius as a share of the longer side: enough to remove not just a
 * board's grain but the pattern of a parquet or a tiled floor, which would
 * otherwise ghost through the new one. Shadows are soft enough not to mind.
 */
const BLUR_SHARE = 0.006;

/**
 * How much of the darkness below the floor's average is kept.
 *
 * A polished floor mirrors whatever stands on it, and a mirror image measures
 * exactly like a shadow. Keeping most of the depth holds on to the shadows that
 * ground the furniture, without printing dark columns across a matt floor.
 */
const SHADOW_DEPTH = 0.68;

/** How far above the floor's average a pixel must be to count as a highlight. */
const HIGHLIGHT_START = 1.2;
const HIGHLIGHT_RANGE = 1.1;

type Entry = { key: unknown; maps: LightingMaps | null };
const cache = new WeakMap<object, Entry>();

/**
 * Lighting maps for a photograph and the floor within it — the mask when there
 * is one, the quad otherwise. Returns null when the photograph cannot be read
 * back, and the caller falls back to multiplying the photograph itself.
 */
export function lightingMaps(
  photo: CanvasImageSource,
  photoWidth: number,
  photoHeight: number,
  region: { mask?: CanvasImageSource | null; quad: Quad },
): LightingMaps | null {
  const key = region.mask ?? region.quad.map((point) => `${point.x},${point.y}`).join(";");
  const cached = cache.get(photo as object);

  if (cached && cached.key === key) return cached.maps;

  const maps = compute(photo, photoWidth, photoHeight, region);
  cache.set(photo as object, { key, maps });

  return maps;
}

function compute(
  photo: CanvasImageSource,
  photoWidth: number,
  photoHeight: number,
  region: { mask?: CanvasImageSource | null; quad: Quad },
): LightingMaps | null {
  if (photoWidth === 0 || photoHeight === 0) return null;

  const scale = Math.min(1, MAX_SIDE / Math.max(photoWidth, photoHeight));
  const width = Math.max(1, Math.round(photoWidth * scale));
  const height = Math.max(1, Math.round(photoHeight * scale));

  const pixels = readPixels(photo, width, height);
  const floor = readRegion(region, width, height);

  if (!pixels || !floor) return null;

  const count = width * height;
  const luminance = new Float32Array(count);

  for (let index = 0; index < count; index++) {
    luminance[index] =
      0.2126 * pixels[index * 4] + 0.7152 * pixels[index * 4 + 1] + 0.0722 * pixels[index * 4 + 2];
  }

  const blurred = boxBlur(
    luminance,
    width,
    height,
    Math.max(1, Math.round(Math.max(width, height) * BLUR_SHARE)),
  );

  let sum = 0;
  let samples = 0;

  for (let index = 0; index < count; index++) {
    if (floor[index * 4 + 3] >= 128) {
      sum += blurred[index];
      samples++;
    }
  }

  // Too little floor to measure against: the whole frame is a fair stand-in.
  if (samples < count * 0.002) {
    sum = blurred.reduce((total, value) => total + value, 0);
    samples = count;
  }

  const mean = Math.max(8, sum / samples);

  const shading = document.createElement("canvas");
  const highlights = document.createElement("canvas");
  shading.width = highlights.width = width;
  shading.height = highlights.height = height;

  const shadingContext = shading.getContext("2d");
  const highlightContext = highlights.getContext("2d");

  if (!shadingContext || !highlightContext) return null;

  const shadingData = shadingContext.createImageData(width, height);
  const highlightData = highlightContext.createImageData(width, height);

  for (let index = 0; index < count; index++) {
    const ratio = blurred[index] / mean;
    const shade = Math.round((1 - (1 - Math.min(1, ratio)) * SHADOW_DEPTH) * 255);
    const glint = Math.round(
      Math.min(1, Math.max(0, (ratio - HIGHLIGHT_START) / HIGHLIGHT_RANGE)) * 255,
    );
    const at = index * 4;

    shadingData.data[at] = shadingData.data[at + 1] = shadingData.data[at + 2] = shade;
    shadingData.data[at + 3] = 255;
    highlightData.data[at] = highlightData.data[at + 1] = highlightData.data[at + 2] = glint;
    highlightData.data[at + 3] = 255;
  }

  shadingContext.putImageData(shadingData, 0, 0);
  highlightContext.putImageData(highlightData, 0, 0);

  return { shading, highlights };
}

function readPixels(
  photo: CanvasImageSource,
  width: number,
  height: number,
): Uint8ClampedArray | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) return null;

  context.drawImage(photo, 0, 0, width, height);

  try {
    return context.getImageData(0, 0, width, height).data;
  } catch {
    // A cross-origin photograph taints the canvas; it can still be drawn, so
    // the caller falls back to the plain multiply.
    return null;
  }
}

function readRegion(
  region: { mask?: CanvasImageSource | null; quad: Quad },
  width: number,
  height: number,
): Uint8ClampedArray | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) return null;

  if (region.mask) {
    context.drawImage(region.mask, 0, 0, width, height);
  } else {
    context.beginPath();
    region.quad.forEach((point, index) => {
      const x = point.x * width;
      const y = point.y * height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = "#000";
    context.fill();
  }

  try {
    return context.getImageData(0, 0, width, height).data;
  } catch {
    return null;
  }
}

/** Separable box blur, twice, which is close enough to a Gaussian here. */
function boxBlur(
  values: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  let current = values;

  for (let pass = 0; pass < 2; pass++) {
    current = blurAxis(current, width, height, radius, true);
    current = blurAxis(current, width, height, radius, false);
  }

  return current;
}

function blurAxis(
  input: Float32Array,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
): Float32Array {
  const output = new Float32Array(input.length);
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const at = (line: number, position: number) =>
    horizontal ? line * width + position : position * width + line;

  for (let line = 0; line < lines; line++) {
    let sum = 0;
    let span = 0;

    for (let position = 0; position <= Math.min(radius, length - 1); position++) {
      sum += input[at(line, position)];
      span++;
    }

    for (let position = 0; position < length; position++) {
      output[at(line, position)] = sum / span;

      const entering = position + radius + 1;
      const leaving = position - radius;

      if (entering < length) {
        sum += input[at(line, entering)];
        span++;
      }

      if (leaving >= 0) {
        sum -= input[at(line, leaving)];
        span--;
      }
    }
  }

  return output;
}

/** How strongly the room's highlights glint off each finish. */
export const FINISH_SHEEN = { matte: 0.12, satin: 0.35, gloss: 0.7 } as const;
