import type { Rgb } from "./refine-mask";

/**
 * Deciding the floor around and under furniture from the photograph's colours.
 *
 * The model decides on cells about seven photo pixels wide, and under a table
 * that is coarser than everything in it: a chrome chair leg is five pixels
 * across, a caster less, and the floor between them comes in pockets. Its
 * scores there are no guide either way — on the sample office it called the
 * shaded floor under the table "swivel chair" at 0.85–0.97, and the chrome legs
 * floor at 0.8–1.0 — so material went on the legs and the floor under the
 * table kept its old covering.
 *
 * The photograph is clearer. Away from the furniture the floor is known, and
 * deep inside the furniture so is the furniture; near where they meet, each
 * pixel is given to whichever its colour matches better, judged against
 * samples from its own part of the photo so the light under a table is
 * compared with the light under that table. A warm wood floor against chrome,
 * black casters and white shells is decided at a glance. Where the two match
 * equally — a walnut sideboard on a walnut floor — nothing is decided and the
 * model's answer stands.
 */

/** How far either side of a floor/furniture junction is re-decided, as a share of the photo's width. */
const ZONE_SHARE = 0.04;

/** Pixels at least this far from the other side teach the colour models. */
const TEACH_MARGIN = 3;

/**
 * Furniture is taught only from pixels where the model gives floor no more than
 * this share, of 255 (about 2%).
 *
 * Floor the model mistook for furniture, taught as furniture, makes itself
 * look like furniture — the shaded floor under a table came out as the table.
 * The model is wrong there but not sure: it gave floor 3–24% under the table
 * and effectively nothing inside the chair shells and the tabletop. Without
 * scores, furniture is taught from deep inside each piece instead.
 */
const FURNITURE_FLOOR_DOUBT = 5;

/**
 * Floor is taught only from pixels where the model gives floor at least this
 * share, of 255 (about 90%) — the mirror of the rule above. The fast model
 * called the dark base of a table floor, the base's grey was learned as a floor
 * colour, and the base was then floored over.
 */
const FLOOR_CERTAINTY = 230;

/**
 * Pixels darker than this, as the sum of their three channels, are left to the
 * model. Deep in a shadow a pixel's colour is mostly noise; deciding it by
 * colour pocked the shade under armchairs and a sideboard with holes.
 */
const TOO_DARK = 150;

/**
 * Changes forming patches smaller than this share of the photo are undone.
 * A real pocket of floor between chair legs or a real leg is a patch; a
 * scatter of single pixels flipping is the colour models disagreeing on noise.
 */
const MIN_CHANGE_SHARE = 0.00008;

/**
 * How many times likelier under one colour model than the other a pixel must
 * be before it changes hands. Below this the colours do not decide and the
 * model's label is kept.
 */
const DECISIVE = 4;

/** Fewest teaching pixels a piece of furniture needs before its colours count. */
const MIN_PIECE_SAMPLES = 200;

/** Histogram resolution: brightness, red–green and yellow–blue bins. */
const BINS = [6, 32, 32] as const;

/** The colour shares binned run from minus this to plus this. */
const CHROMA_RANGE = 0.35;

/** Added to a pixel's brightness before taking colour shares. */
const DARK_FLOOR = 45;

export type Furnished = {
  width: number;
  height: number;
  floor: Uint8Array;
  occluder: Uint8Array;
  /** The model's floor probability per pixel, 0–255, when the scene came from scores. */
  floorScore?: Uint8Array;
};

/**
 * The floor and occluder masks re-decided near their junction by colour. Both
 * must be at the photograph's size.
 *
 * Colours are learned as histograms rather than sampled nearby. A chrome leg
 * the model called floor is a handful of pixels against the whole floor, so it
 * barely registers in the floor's colours and loses to the furniture's;
 * nearest-sample matching was decided by exactly such strays.
 *
 * The floor is one material and is learned over the whole photo. Furniture is
 * learned piece by piece — each connected group the model drew — because one
 * room holds a walnut desk and a white-and-chrome table set, and pooled
 * together the desk's wood matched the shaded floor under the table.
 */
export function settleFurniture<T extends Furnished>(scene: T, photo: Rgb): T {
  const { width, height, floor, occluder, floorScore } = scene;
  const size = width * height;
  const reach = Math.max(4, Math.round(width * ZONE_SHARE));

  const nearFloor = dilate(floor, width, height, reach);
  const nearFurniture = dilate(occluder, width, height, reach);
  const besideFurniture = dilate(occluder, width, height, TEACH_MARGIN);
  const besideFloor = dilate(floor, width, height, TEACH_MARGIN);
  const teachesFurniture = (index: number) =>
    occluder[index] === 1 &&
    (floorScore
      ? besideFloor[index] === 0 && floorScore[index] <= FURNITURE_FLOOR_DOUBT
      : nearFloor[index] === 0);

  const bins = colourBins(photo);
  const binCount = BINS[0] * BINS[1] * BINS[2];
  const floorColours = new Float32Array(binCount);
  let floorTotal = 0;
  let zoneSize = 0;

  // Furniture pieces, spread by the zone's reach so a floor pixel in the zone
  // knows which piece it is beside.
  const pieces = labelPieces(occluder, width, height);
  const nearestPiece = spreadLabels(pieces, width, reach);
  const pieceColours = new Map<number, { counts: Float32Array; total: number }>();

  for (let index = 0; index < size; index++) {
    if (
      floor[index] === 1 &&
      besideFurniture[index] === 0 &&
      (!floorScore || floorScore[index] >= FLOOR_CERTAINTY)
    ) {
      floorColours[bins[index]]++;
      floorTotal++;
    } else if (teachesFurniture(index)) {
      let piece = pieceColours.get(pieces[index]);
      if (!piece) {
        piece = { counts: new Float32Array(binCount), total: 0 };
        pieceColours.set(pieces[index], piece);
      }
      piece.counts[bins[index]]++;
      piece.total++;
    }

    if (
      (floor[index] === 1 && nearFurniture[index] === 1) ||
      (occluder[index] === 1 && nearFloor[index] === 1)
    ) {
      zoneSize++;
    }
  }

  if (zoneSize === 0 || floorTotal === 0 || pieceColours.size === 0) return scene;

  const floorLikelihood = smoothHistogram(floorColours, floorTotal);
  const pieceLikelihood = new Map<number, Float32Array>();

  for (const [piece, { counts, total }] of pieceColours) {
    // A piece too small to have colours of its own says nothing reliable.
    if (total >= MIN_PIECE_SAMPLES) pieceLikelihood.set(piece, smoothHistogram(counts, total));
  }

  // 1 where a pixel becomes floor, 2 where it stops being floor.
  const change = new Uint8Array(size);
  const { data } = photo;

  for (let index = 0; index < size; index++) {
    const inZone =
      (floor[index] === 1 && nearFurniture[index] === 1) ||
      (occluder[index] === 1 && nearFloor[index] === 1);
    if (!inZone) continue;
    if (data[index * 4] + data[index * 4 + 1] + data[index * 4 + 2] < TOO_DARK) continue;

    const furnitureLikelihood = pieceLikelihood.get(nearestPiece[index]);
    if (!furnitureLikelihood) continue;

    const asFloor = floorLikelihood[bins[index]];
    const asFurniture = furnitureLikelihood[bins[index]];

    if (floor[index] === 0 && asFloor > asFurniture * DECISIVE) change[index] = 1;
    else if (floor[index] === 1 && asFurniture > asFloor * DECISIVE) change[index] = 2;
  }

  dropSmallPatches(change, width, height, Math.round(size * MIN_CHANGE_SHARE));

  const settled = { ...scene, floor: Uint8Array.from(floor), occluder: Uint8Array.from(occluder) };

  for (let index = 0; index < size; index++) {
    if (change[index] === 0) continue;
    const toFloor = change[index] === 1;
    settled.floor[index] = toFloor ? 1 : 0;
    settled.occluder[index] = toFloor ? 0 : 1;
  }

  return settled;
}

/**
 * Each pixel's colour bin, on axes that separate surfaces rather than
 * lighting: red–green and yellow–blue as shares of the pixel's brightness, which
 * a shadow leaves alone, and brightness itself only coarsely.
 *
 * Plain colour differences shrink in shadow, so the floor in the shade under a
 * table fell into the same bins as the dark grey of the chairs over it. As
 * shares, shaded wood stays warm and grey stays neutral.
 */
function colourBins(photo: Rgb): Uint16Array {
  const { data, width, height } = photo;
  const bins = new Uint16Array(width * height);
  const [brightnessBins, redGreenBins, yellowBlueBins] = BINS;
  const axis = (share: number, count: number) =>
    Math.min(
      count - 1,
      Math.max(0, Math.floor(((share + CHROMA_RANGE) / (2 * CHROMA_RANGE)) * count)),
    );

  for (let index = 0; index < width * height; index++) {
    const red = data[index * 4];
    const green = data[index * 4 + 1];
    const blue = data[index * 4 + 2];
    // The constant keeps near-black pixels, whose ratios are noise, neutral.
    const total = red + green + blue + DARK_FLOOR;

    const brightness = Math.min(
      brightnessBins - 1,
      Math.floor(((red + green + blue) / 765) * brightnessBins),
    );
    const redGreen = axis((red - green) / total, redGreenBins);
    const yellowBlue = axis(((red + green) / 2 - blue) / total, yellowBlueBins);

    bins[index] = (brightness * redGreenBins + redGreen) * yellowBlueBins + yellowBlue;
  }

  return bins;
}

/**
 * Counts to a likelihood per bin, spread over the neighbouring bins first so
 * a colour between two well-populated bins is not mistaken for an unseen one,
 * and floored so an unseen colour is unlikely rather than impossible.
 */
function smoothHistogram(counts: Float32Array, total: number): Float32Array {
  const [brightnessBins, redGreenBins, yellowBlueBins] = BINS;
  const smooth = new Float32Array(counts.length);

  for (let l = 0; l < brightnessBins; l++) {
    for (let a = 0; a < redGreenBins; a++) {
      for (let b = 0; b < yellowBlueBins; b++) {
        let sum = 0;

        for (let dl = -1; dl <= 1; dl++) {
          const nl = l + dl;
          if (nl < 0 || nl >= brightnessBins) continue;
          for (let da = -1; da <= 1; da++) {
            const na = a + da;
            if (na < 0 || na >= redGreenBins) continue;
            for (let db = -1; db <= 1; db++) {
              const nb = b + db;
              if (nb < 0 || nb >= yellowBlueBins) continue;
              const weight = dl === 0 && da === 0 && db === 0 ? 1 : 0.25;
              sum += counts[(nl * redGreenBins + na) * yellowBlueBins + nb] * weight;
            }
          }
        }

        smooth[(l * redGreenBins + a) * yellowBlueBins + b] = sum;
      }
    }
  }

  let smoothTotal = 0;
  for (const value of smooth) smoothTotal += value;

  const floor = 0.5 / total;
  for (let bin = 0; bin < smooth.length; bin++) {
    smooth[bin] = smooth[bin] / smoothTotal + floor;
  }

  return smooth;
}

/** Clear every four-connected patch of equal non-zero values smaller than `minimum`. */
function dropSmallPatches(values: Uint8Array, width: number, height: number, minimum: number) {
  const seen = new Uint8Array(values.length);
  const stack: number[] = [];

  for (let start = 0; start < values.length; start++) {
    const value = values[start];
    if (value === 0 || seen[start] === 1) continue;

    const patch: number[] = [];
    seen[start] = 1;
    stack.push(start);

    while (stack.length > 0) {
      const index = stack.pop()!;
      patch.push(index);
      const x = index % width;
      const y = (index - x) / width;

      for (const neighbour of [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ]) {
        if (neighbour >= 0 && seen[neighbour] === 0 && values[neighbour] === value) {
          seen[neighbour] = 1;
          stack.push(neighbour);
        }
      }
    }

    if (patch.length < minimum) for (const index of patch) values[index] = 0;
  }
}

/** Eight-connected pieces of `mask`, numbered from 1; 0 outside it. */
function labelPieces(mask: Uint8Array, width: number, height: number): Int32Array {
  const labels = new Int32Array(mask.length);
  const stack: number[] = [];
  let next = 0;

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] === 0 || labels[start] !== 0) continue;

    next++;
    labels[start] = next;
    stack.push(start);

    while (stack.length > 0) {
      const index = stack.pop()!;
      const x = index % width;
      const y = (index - x) / width;

      for (let dy = -1; dy <= 1; dy++) {
        const sampleY = y + dy;
        if (sampleY < 0 || sampleY >= height) continue;

        for (let dx = -1; dx <= 1; dx++) {
          const sampleX = x + dx;
          if (sampleX < 0 || sampleX >= width) continue;

          const neighbour = sampleY * width + sampleX;
          if (mask[neighbour] === 1 && labels[neighbour] === 0) {
            labels[neighbour] = next;
            stack.push(neighbour);
          }
        }
      }
    }
  }

  return labels;
}

/**
 * Each unlabelled pixel within `radius` of a labelled one takes the nearest
 * label, by a breadth-first spread; labelled pixels keep their own.
 */
function spreadLabels(labels: Int32Array, width: number, radius: number): Int32Array {
  const spread = Int32Array.from(labels);
  let frontier: number[] = [];

  for (let index = 0; index < labels.length; index++) {
    if (labels[index] !== 0) frontier.push(index);
  }

  for (let step = 1; step <= radius && frontier.length > 0; step++) {
    const next: number[] = [];

    for (const index of frontier) {
      const x = index % width;
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        index >= width ? index - width : -1,
        index < labels.length - width ? index + width : -1,
      ];

      for (const neighbour of neighbours) {
        if (neighbour < 0 || spread[neighbour] !== 0) continue;
        spread[neighbour] = spread[index];
        next.push(neighbour);
      }
    }

    frontier = next;
  }

  return spread;
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
