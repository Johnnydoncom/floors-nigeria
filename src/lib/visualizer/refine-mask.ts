/**
 * Snapping a floor mask onto the edges the photograph actually has.
 *
 * SegFormer decides at a quarter of its input resolution and the result is
 * scaled back up, so although the mask arrives at full size its boundary
 * follows a coarse decision. At a wall junction that is visible twice over:
 * material creeps up the skirting on one side, and a sliver of the old floor
 * survives on the other.
 *
 * The photograph knows exactly where the wall is — there is a strong edge
 * there. Each pixel near the boundary is re-decided by a vote of the mask
 * values around it, weighted by how similar the photograph's colour is at each
 * of those points. Across a junction the colours differ, the far side's votes
 * are discounted, and the boundary settles onto the edge a human would draw.
 *
 * Only the boundary band is touched. Everything deep inside the floor, or
 * clearly on a wall, is already right and is left alone — which is what keeps
 * this fast enough to run on a phone.
 */

/** Vote radius, in working-resolution pixels. Wide enough to cross a coarse error. */
const RADIUS = 7;

/** Spatial falloff, in pixels. */
const SPATIAL_SIGMA = 4;

/** Colour tolerance across the three channels. Lower follows edges harder. */
const COLOUR_SIGMA = 26;

/** Above this share of the vote, the pixel is floor. */
const DECISION = 0.5;

/**
 * Holes smaller than this share of the frame are speckle and get filled;
 * anything larger is furniture standing on the floor and is left alone.
 */
const SPECKLE_SHARE = 0.0006;

export type Grid = { data: Uint8Array; width: number; height: number };

export type Rgb = { data: Uint8ClampedArray; width: number; height: number };

/**
 * Re-decide the mask's boundary against the photograph.
 *
 * Both inputs must be the same size; callers resample to a working resolution
 * first.
 */
export function refineMask(mask: Grid, photo: Rgb): Grid {
  const { width, height } = mask;
  const output = Uint8Array.from(mask.data);
  const band = boundaryBand(mask);

  const spatial = buildSpatialWeights();
  const colour = buildColourWeights();
  const span = RADIUS * 2 + 1;

  for (let index = 0; index < band.length; index++) {
    if (band[index] === 0) continue;

    const x = index % width;
    const y = (index - x) / width;

    const centre = index * 4;
    const red = photo.data[centre];
    const green = photo.data[centre + 1];
    const blue = photo.data[centre + 2];

    let total = 0;
    let weighted = 0;

    for (let dy = -RADIUS; dy <= RADIUS; dy++) {
      const sampleY = y + dy;

      if (sampleY < 0 || sampleY >= height) continue;

      for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        const sampleX = x + dx;

        if (sampleX < 0 || sampleX >= width) continue;

        const sample = sampleY * width + sampleX;
        const samplePixel = sample * 4;

        const difference =
          Math.abs(photo.data[samplePixel] - red) +
          Math.abs(photo.data[samplePixel + 1] - green) +
          Math.abs(photo.data[samplePixel + 2] - blue);

        const weight =
          spatial[(dy + RADIUS) * span + (dx + RADIUS)] * colour[Math.min(765, difference)];

        total += weight;
        weighted += weight * mask.data[sample];
      }
    }

    output[index] = total > 0 && weighted / total >= DECISION ? 1 : 0;
  }

  return fillSpeckles({ data: output, width, height });
}

/**
 * Pixels within `RADIUS` of a boundary — the only ones worth re-deciding.
 *
 * Found by dilating the set of pixels that differ from a neighbour, which is
 * far cheaper than testing every pixel's whole neighbourhood.
 */
function boundaryBand(mask: Grid): Uint8Array {
  const { data, width, height } = mask;
  const edge = new Uint8Array(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const value = data[index];

      const differs =
        (x > 0 && data[index - 1] !== value) ||
        (x < width - 1 && data[index + 1] !== value) ||
        (y > 0 && data[index - width] !== value) ||
        (y < height - 1 && data[index + width] !== value);

      if (differs) edge[index] = 1;
    }
  }

  return dilate(edge, width, height, RADIUS);
}

/**
 * Grow a set by `radius`, as two passes of a separable box dilation.
 */
function dilate(source: Uint8Array, width: number, height: number, radius: number): Uint8Array {
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

/**
 * Fill pinholes left where the model wavered mid-floor, without filling the
 * genuine holes that furniture makes.
 *
 * Works on the background: a pocket of not-floor that never reaches the edge
 * of the frame and is smaller than a speckle becomes floor. Furniture pockets
 * are far larger and survive.
 */
export function fillSpeckles(mask: Grid): Grid {
  const { data, width, height } = mask;
  const visited = new Uint8Array(data.length);
  const limit = Math.max(24, Math.round(width * height * SPECKLE_SHARE));
  const stack: number[] = [];

  for (let start = 0; start < data.length; start++) {
    if (data[start] === 1 || visited[start] === 1) continue;

    const pocket: number[] = [];
    let touchesEdge = false;

    stack.push(start);
    visited[start] = 1;

    while (stack.length > 0) {
      const index = stack.pop()!;
      pocket.push(index);

      const x = index % width;
      const y = (index - x) / width;

      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;

      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];

      for (const neighbour of neighbours) {
        if (neighbour >= 0 && data[neighbour] === 0 && visited[neighbour] === 0) {
          visited[neighbour] = 1;
          stack.push(neighbour);
        }
      }
    }

    if (!touchesEdge && pocket.length <= limit) {
      for (const index of pocket) data[index] = 1;
    }
  }

  return mask;
}

function buildSpatialWeights(): Float32Array {
  const span = RADIUS * 2 + 1;
  const weights = new Float32Array(span * span);

  for (let dy = -RADIUS; dy <= RADIUS; dy++) {
    for (let dx = -RADIUS; dx <= RADIUS; dx++) {
      weights[(dy + RADIUS) * span + (dx + RADIUS)] = Math.exp(
        -(dx * dx + dy * dy) / (2 * SPATIAL_SIGMA * SPATIAL_SIGMA),
      );
    }
  }

  return weights;
}

/**
 * Colour weights precomputed for every possible channel-sum difference, so the
 * inner loop is a lookup rather than an exponential.
 */
function buildColourWeights(): Float32Array {
  const weights = new Float32Array(766);

  for (let difference = 0; difference <= 765; difference++) {
    weights[difference] = Math.exp(
      -(difference * difference) / (2 * COLOUR_SIGMA * COLOUR_SIGMA * 9),
    );
  }

  return weights;
}
