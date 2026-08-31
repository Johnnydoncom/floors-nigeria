import { perspectiveWeight, project, unitSquareToQuad, type Homography } from "./homography";
import type { Placement, Point, Quad } from "./types";

/**
 * Renders a floor material into a room photograph (§10).
 *
 * The floor is a plane, so the mapping from material to photograph is a
 * homography (see `homography.ts`). Canvas 2D cannot apply a projective
 * transform directly — `setTransform` is affine — so the material is drawn as a
 * mesh of small cells, each positioned by projecting its corners through the
 * homography and filled with an affine transform. Across a cell a few pixels
 * wide the difference between affine and projective is invisible, while the
 * mesh as a whole is perspective-correct.
 *
 * The mesh is denser towards the far wall, where the same screen distance
 * covers far more floor. Rows are placed at even *screen* intervals by
 * inverting the homography's depth relation, which puts subdivision exactly
 * where foreshortening needs it.
 *
 * All 2D canvas: no WebGL, no model download, so it runs on the mid-range
 * phones most visitors arrive on (§28).
 */

/** Off-screen material size. Larger costs memory for no visible gain. */
const PLANE_SIZE = 1024;

/** Target screen size of a mesh cell, in CSS pixels. */
const CELL_TARGET_PX = 12;

const MIN_ROWS = 16;
const MAX_ROWS = 160;
const MIN_COLUMNS = 8;
const MAX_COLUMNS = 64;

/** Cells are drawn fractionally oversized so no seam shows between them. */
const SEAM_BLEED_PX = 1.5;

/**
 * Share of a product photograph used as the repeating tile.
 *
 * Catalogue photography is staged: a plank propped on a pallet, a tile on a
 * showroom floor, a sprig of greenery for scale. Tiling the whole frame
 * repeats the props across the floor. Taking a square from the middle gets
 * closer to the material itself, which is where photographers put it.
 *
 * This is damage limitation. A product with a proper seamless texture uploaded
 * against it looks better than any crop of a marketing shot can (§24).
 */
const TILE_CROP = 0.62;

export type RenderOptions = {
  photo: CanvasImageSource;
  photoWidth: number;
  photoHeight: number;
  texture: CanvasImageSource | null;
  quad: Quad;
  placement: Placement;
  /**
   * Floor pixels from automatic detection, opaque where material belongs.
   *
   * When present it decides *where* material is drawn and the quad only
   * decides *how* perspective runs — which is what lets material stop at a
   * chair leg. Without it the quad does both, as it must when the floor was
   * marked by hand.
   */
  mask?: CanvasImageSource | null;
};

/**
 * Draw the room, the material, then the room's own light back over it.
 */
export function renderRoom(canvas: HTMLCanvasElement, options: RenderOptions): void {
  const { photo, photoWidth, photoHeight, texture, quad, placement, mask } = options;
  const context = canvas.getContext("2d");

  if (!context || photoWidth === 0 || photoHeight === 0) return;

  canvas.width = photoWidth;
  canvas.height = photoHeight;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, photoWidth, photoHeight);
  context.drawImage(photo, 0, 0, photoWidth, photoHeight);

  if (!texture) return;

  const corners = toPixels(quad, photoWidth, photoHeight);
  const plane = buildMaterialPlane(texture, placement);

  if (!plane) return;

  const homography = unitSquareToQuad(corners);

  // The material is composed off-screen so it can be trimmed to the detected
  // floor before it reaches the photograph.
  const floor = document.createElement("canvas");
  floor.width = photoWidth;
  floor.height = photoHeight;

  const floorContext = floor.getContext("2d");

  if (!floorContext) return;

  floorContext.save();
  clipToQuad(floorContext, corners);
  drawMaterialMesh(floorContext, plane, homography, corners);
  floorContext.restore();

  if (placement.lighting > 0) {
    // Multiplying the original photograph back over the new floor carries its
    // shadows, reflections and falloff onto the material, which is most of what
    // makes the result read as the same room rather than a flat sticker.
    floorContext.save();
    floorContext.globalCompositeOperation = "multiply";
    floorContext.globalAlpha = placement.lighting;
    floorContext.drawImage(photo, 0, 0, photoWidth, photoHeight);
    floorContext.restore();
  }

  if (mask) {
    // Keep only the pixels the detector called floor. Multiply above ran on
    // the full rectangle, so this also trims the lighting pass.
    floorContext.globalCompositeOperation = "destination-in";
    // Smoothing would feather the mask's boundary back out — the softness the
    // detector just spent its time removing — so the edge is scaled hard.
    floorContext.imageSmoothingEnabled = false;
    floorContext.drawImage(mask, 0, 0, photoWidth, photoHeight);
    floorContext.imageSmoothingEnabled = true;
    floorContext.globalCompositeOperation = "source-over";
  }

  context.globalAlpha = placement.opacity;
  context.drawImage(floor, 0, 0);
  context.globalAlpha = 1;
}

function toPixels(quad: Quad, width: number, height: number): Quad {
  return quad.map((point) => ({ x: point.x * width, y: point.y * height })) as Quad;
}

function clipToQuad(context: CanvasRenderingContext2D, [a, b, c, d]: Quad): void {
  context.beginPath();
  context.moveTo(a.x, a.y);
  context.lineTo(b.x, b.y);
  context.lineTo(c.x, c.y);
  context.lineTo(d.x, d.y);
  context.closePath();
  context.clip();
}

/**
 * The material, tiled, turned and brightened, on an off-screen canvas — the
 * floor as it would look seen from directly above.
 */
function buildMaterialPlane(
  texture: CanvasImageSource,
  placement: Placement,
): HTMLCanvasElement | null {
  const plane = document.createElement("canvas");
  plane.width = PLANE_SIZE;
  plane.height = PLANE_SIZE;

  const context = plane.getContext("2d");
  const tile = cropToTile(texture);
  const pattern = tile && context?.createPattern(tile, "repeat");

  if (!context || !pattern || !tile) return null;

  // A "tile" is the plane divided by how many the visitor asked to see across
  // the room, so the control reads as plank size rather than as a scale factor.
  const tilePixels = PLANE_SIZE / Math.max(1, placement.tiles);
  const scale = tile.width > 0 ? tilePixels / tile.width : 1;

  if (placement.brightness !== 1 && "filter" in context) {
    context.filter = `brightness(${placement.brightness})`;
  }

  context.save();
  context.translate(PLANE_SIZE / 2, PLANE_SIZE / 2);
  context.rotate((placement.rotation * Math.PI) / 180);
  context.scale(scale, scale);
  context.fillStyle = pattern;
  // Overdraw generously: rotation pulls the pattern in from outside the plane.
  const reach = (PLANE_SIZE * 2) / scale;
  context.fillRect(-reach, -reach, reach * 2, reach * 2);
  context.restore();

  return plane;
}

/**
 * A square from the middle of the product photograph, to repeat as the tile.
 *
 * Squaring it also stops a portrait or landscape photo from stretching into
 * planks that are the wrong shape.
 */
function cropToTile(texture: CanvasImageSource): HTMLCanvasElement | null {
  const width = naturalWidth(texture);
  const height = naturalHeight(texture);

  if (width === 0 || height === 0) return null;

  const side = Math.round(Math.min(width, height) * TILE_CROP);
  const tile = document.createElement("canvas");
  tile.width = side;
  tile.height = side;

  const context = tile.getContext("2d");

  if (!context) return null;

  context.drawImage(
    texture,
    Math.round((width - side) / 2),
    Math.round((height - side) / 2),
    side,
    side,
    0,
    0,
    side,
    side,
  );

  return tile;
}

/**
 * Draw the material as a perspective-correct mesh.
 */
function drawMaterialMesh(
  context: CanvasRenderingContext2D,
  plane: HTMLCanvasElement,
  homography: Homography,
  corners: Quad,
): void {
  const rows = rowCount(corners);
  const columns = columnCount(corners);
  const depths = depthSamples(homography, rows);

  for (let row = 0; row < rows; row++) {
    const v0 = depths[row];
    const v1 = depths[row + 1];

    for (let column = 0; column < columns; column++) {
      const u0 = column / columns;
      const u1 = (column + 1) / columns;

      // A cell at or beyond the horizon has no image in front of the camera.
      if (perspectiveWeight(homography, u0, v0) <= 0) continue;

      const origin = project(homography, u0, v0);
      const alongU = project(homography, u1, v0);
      const alongV = project(homography, u0, v1);

      if (!isFinitePoint(origin) || !isFinitePoint(alongU) || !isFinitePoint(alongV)) continue;

      const sourceX = u0 * plane.width;
      const sourceY = v0 * plane.height;
      const sourceWidth = (u1 - u0) * plane.width;
      const sourceHeight = (v1 - v0) * plane.height;

      if (sourceWidth <= 0 || sourceHeight <= 0) continue;

      // Grow each cell by a fraction of a pixel so neighbours overlap and no
      // background shows through the mesh. The clip keeps the bleed inside the
      // floor area.
      const bleedU = 1 + SEAM_BLEED_PX / Math.max(distance(origin, alongU), 1);
      const bleedV = 1 + SEAM_BLEED_PX / Math.max(distance(origin, alongV), 1);

      const across = {
        x: ((alongU.x - origin.x) / sourceWidth) * bleedU,
        y: ((alongU.y - origin.y) / sourceWidth) * bleedU,
      };
      const down = {
        x: ((alongV.x - origin.x) / sourceHeight) * bleedV,
        y: ((alongV.y - origin.y) / sourceHeight) * bleedV,
      };

      context.setTransform(across.x, across.y, down.x, down.y, origin.x, origin.y);
      context.drawImage(
        plane,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight,
      );
    }
  }

  context.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Material depths whose *projected* positions are evenly spaced down the
 * screen, so the mesh is fine near the far wall and coarse underfoot.
 *
 * Along the quad's centre line the homography reduces to y = (A + Bv)/(C + Dv),
 * which inverts to v = (A − yC)/(yD − B) — an exact way to ask "which part of
 * the material lands on this screen row?".
 */
function depthSamples(homography: Homography, rows: number): number[] {
  const { d, e, f, g, h } = homography;
  const centre = 0.5;

  const a = d * centre + f;
  const b = e;
  const c = g * centre + 1;
  const dd = h;

  const yFar = a / c;
  const yNear = (a + b) / (c + dd);

  const samples: number[] = [];

  for (let row = 0; row <= rows; row++) {
    const y = yFar + ((yNear - yFar) * row) / rows;
    const denominator = y * dd - b;

    const v = Math.abs(denominator) < 1e-9 ? row / rows : (a - y * c) / denominator;

    // Clamp and keep the sequence monotonic: a wildly dragged corner must not
    // produce a mesh that folds back on itself.
    const previous = samples[samples.length - 1] ?? 0;
    samples.push(Math.min(1, Math.max(previous, Number.isFinite(v) ? v : row / rows)));
  }

  samples[0] = 0;
  samples[rows] = 1;

  return samples;
}

function rowCount(corners: Quad): number {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  const height = Math.max(distance(topLeft, bottomLeft), distance(topRight, bottomRight));

  return clampInteger(Math.round(height / CELL_TARGET_PX), MIN_ROWS, MAX_ROWS);
}

function columnCount(corners: Quad): number {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  const width = Math.max(distance(topLeft, topRight), distance(bottomLeft, bottomRight));

  return clampInteger(Math.round(width / (CELL_TARGET_PX * 2)), MIN_COLUMNS, MAX_COLUMNS);
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function distance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function naturalHeight(source: CanvasImageSource): number {
  if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
    return source.naturalHeight;
  }

  if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
    return source.height;
  }

  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    return source.height;
  }

  return 0;
}

function naturalWidth(source: CanvasImageSource): number {
  if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
    return source.naturalWidth;
  }

  if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
    return source.width;
  }

  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    return source.width;
  }

  return 0;
}

/**
 * Load an image for canvas use, requesting CORS so the result can still be
 * exported. Same-origin media (everything served through `/media`) is
 * unaffected either way.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}
