import { project, unitSquareToQuad } from "./homography";
import type { Quad } from "./types";

/**
 * Preparing a visualizer texture from a product photograph (§24).
 *
 * Product photography shows the floor at an angle, lit from one side, with the
 * edges of the shot in it. A visualizer texture should be the material seen
 * square-on, evenly lit, and repeatable without a visible seam. Three steps get
 * there, each a plain function over pixels so it can be checked without a
 * browser (`scripts/texture-prep.test.mjs`):
 *
 * 1. **Straighten** — the staff member marks four corners of a square patch of
 *    floor in the photo; the same homography the visualizer uses maps that
 *    patch back to a square.
 * 2. **Even the light** — divide out the low-frequency brightness so a window
 *    on one side does not become a stripe every repeat.
 * 3. **Make it seamless** — cross-fade each edge with the material just past
 *    the opposite one, so the last column flows into the first.
 */

export type Pixels = { data: Uint8ClampedArray; width: number; height: number };

/**
 * The patch inside `quad` (in source pixels, clockwise from top-left), mapped
 * to a `side`-pixel square with bilinear sampling.
 */
export function rectify(source: Pixels, quad: Quad, side: number): Pixels {
  const homography = unitSquareToQuad(quad);
  const output = new Uint8ClampedArray(side * side * 4);

  for (let j = 0; j < side; j++) {
    const v = (j + 0.5) / side;

    for (let i = 0; i < side; i++) {
      const point = project(homography, (i + 0.5) / side, v);
      sampleBilinear(source, point.x - 0.5, point.y - 0.5, output, (j * side + i) * 4);
    }
  }

  return { data: output, width: side, height: side };
}

function sampleBilinear(
  source: Pixels,
  x: number,
  y: number,
  output: Uint8ClampedArray,
  at: number,
): void {
  const { data, width, height } = source;
  const cx = Math.min(width - 1, Math.max(0, x));
  const cy = Math.min(height - 1, Math.max(0, y));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = cx - x0;
  const fy = cy - y0;

  for (let channel = 0; channel < 4; channel++) {
    const top =
      data[(y0 * width + x0) * 4 + channel] * (1 - fx) + data[(y0 * width + x1) * 4 + channel] * fx;
    const bottom =
      data[(y1 * width + x0) * 4 + channel] * (1 - fx) + data[(y1 * width + x1) * 4 + channel] * fx;
    output[at + channel] = top * (1 - fy) + bottom * fy;
  }
}

/**
 * Divide out slow changes in brightness, keeping the material's own grain.
 *
 * `illumination` is the image's luminance blurred far beyond any grain — a few
 * dozen pixels across the whole texture is plenty — resampled to full size.
 * Each pixel is scaled by how far its neighbourhood sits from the average,
 * within limits so a genuinely dark knot is not bleached out.
 */
export function evenLighting(image: Pixels, illumination: Pixels): Pixels {
  const { width, height, data } = image;
  const output = new Uint8ClampedArray(data.length);
  const light = (index: number) =>
    0.2126 * illumination.data[index] +
    0.7152 * illumination.data[index + 1] +
    0.0722 * illumination.data[index + 2];

  let total = 0;
  for (let index = 0; index < data.length; index += 4) total += light(index);
  const mean = total / (width * height);

  for (let index = 0; index < data.length; index += 4) {
    const gain = Math.min(1.6, Math.max(0.6, mean / Math.max(1, light(index))));
    output[index] = data[index] * gain;
    output[index + 1] = data[index + 1] * gain;
    output[index + 2] = data[index + 2] * gain;
    output[index + 3] = data[index + 3];
  }

  return { data: output, width, height };
}

/**
 * A tile that repeats without a seam.
 *
 * Along each axis the result is `band` shorter than the input: the first
 * `band` pixels are cross-faded with the pixels just past the new end, so the
 * last pixel of one repeat is followed by what came after it in the photograph.
 * Applied across, then down. `band` is a share of the side.
 */
export function makeSeamless(image: Pixels, band = 0.15): Pixels {
  return seamlessAxis(seamlessAxis(image, band, true), band, false);
}

function seamlessAxis(image: Pixels, band: number, horizontal: boolean): Pixels {
  const { data, width, height } = image;
  const length = horizontal ? width : height;
  const fade = Math.max(1, Math.round(length * band));
  const kept = length - fade;
  const outWidth = horizontal ? kept : width;
  const outHeight = horizontal ? height : kept;
  const output = new Uint8ClampedArray(outWidth * outHeight * 4);

  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      const along = horizontal ? x : y;
      const at = (y * outWidth + x) * 4;
      const here = ((horizontal ? y * width + x : y * width + x) * 4) as number;

      if (along >= fade) {
        for (let channel = 0; channel < 4; channel++) output[at + channel] = data[here + channel];
        continue;
      }

      // Blend in what lies `kept` further on, fading out as `along` grows.
      const beyond = (horizontal ? y * width + (x + kept) : (y + kept) * width + x) * 4;
      const weight = smooth(along / fade);

      for (let channel = 0; channel < 4; channel++) {
        output[at + channel] =
          data[beyond + channel] * (1 - weight) + data[here + channel] * weight;
      }
    }
  }

  return { data: output, width: outWidth, height: outHeight };
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * The side length worth exporting: the marked patch's longest edge in the
 * photograph, so no detail is invented, within what the API accepts.
 */
export function outputSide(quad: Quad, min = 768, max = 2048): number {
  const edges = quad.map((point, index) => {
    const next = quad[(index + 1) % 4];
    return Math.hypot(next.x - point.x, next.y - point.y);
  });

  return Math.round(Math.min(max, Math.max(min, Math.max(...edges))));
}

/** The middle of the photo, as a starting square for the corners. */
export function centredSquare(width: number, height: number, share = 0.6): Quad {
  const side = Math.min(width, height) * share;
  const left = (width - side) / 2;
  const top = (height - side) / 2;

  return [
    { x: left, y: top },
    { x: left + side, y: top },
    { x: left + side, y: top + side },
    { x: left, y: top + side },
  ];
}
