import type { Placement, Point, Quad } from "./types";

/**
 * Renders a floor material into a room photograph (§10).
 *
 * The floor is a plane, and a plane under perspective projects to the
 * quadrilateral the visitor marks out. Screen positions along its edges
 * interpolate linearly, but the material does not: a row near the far wall
 * covers far more of the floor than a row at your feet. Both are handled here
 * so planks converge the way they do in the room.
 *
 * Everything is 2D canvas work — no WebGL, no model download — so it runs on
 * the mid-range Android phones most visitors arrive on (§28).
 */

/** Slices the floor is drawn in. More is smoother; 240 is past the point of noticing. */
const SLICE_COUNT = 240;

/** Size of the off-screen tiled material. Bigger costs memory for no visible gain. */
const PLANE_SIZE = 1024;

export type RenderOptions = {
  photo: CanvasImageSource;
  photoWidth: number;
  photoHeight: number;
  texture: CanvasImageSource | null;
  quad: Quad;
  placement: Placement;
};

/**
 * Draw the room, then the material, then the room's own light back over it.
 */
export function renderRoom(canvas: HTMLCanvasElement, options: RenderOptions): void {
  const { photo, photoWidth, photoHeight, texture, quad, placement } = options;
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

  context.save();
  clipToQuad(context, corners);
  context.globalAlpha = placement.opacity;
  drawPerspectiveFloor(context, plane, corners);
  context.restore();

  if (placement.lighting > 0) {
    // Multiplying the original photo back over the new floor carries its
    // shadows, reflections and falloff onto the material, which is most of
    // what makes the result read as the same room.
    context.save();
    clipToQuad(context, corners);
    context.globalCompositeOperation = "multiply";
    context.globalAlpha = placement.lighting;
    context.drawImage(photo, 0, 0, photoWidth, photoHeight);
    context.restore();
  }
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
 * The material, tiled and turned, on an off-screen canvas representing the
 * floor seen from directly above.
 */
function buildMaterialPlane(
  texture: CanvasImageSource,
  placement: Placement,
): HTMLCanvasElement | null {
  const plane = document.createElement("canvas");
  plane.width = PLANE_SIZE;
  plane.height = PLANE_SIZE;

  const context = plane.getContext("2d");
  const pattern = context?.createPattern(texture, "repeat");

  if (!context || !pattern) return null;

  // One "tile" spans the plane divided by how many the visitor asked to see
  // across the room.
  const tilePixels = PLANE_SIZE / Math.max(1, placement.tiles);
  const textureWidth = naturalWidth(texture);
  const scale = textureWidth > 0 ? tilePixels / textureWidth : 1;

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
 * Draw the tiled plane into the quad, slice by slice.
 *
 * Each slice is a thin band of the floor. Its screen position comes from
 * interpolating the quad's edges; how much material it covers comes from the
 * perspective relationship between the far and near widths, which is what
 * makes distant planks bunch together.
 */
function drawPerspectiveFloor(
  context: CanvasRenderingContext2D,
  plane: HTMLCanvasElement,
  [farLeft, farRight, nearRight, nearLeft]: Quad,
): void {
  const farWidth = distance(farLeft, farRight);
  const nearWidth = distance(nearLeft, nearRight);

  if (farWidth === 0 || nearWidth === 0) return;

  for (let slice = 0; slice < SLICE_COUNT; slice++) {
    const t = slice / SLICE_COUNT;
    const tNext = (slice + 1) / SLICE_COUNT;

    const v = materialDepth(t, farWidth, nearWidth);
    const vNext = materialDepth(tNext, farWidth, nearWidth);

    const left = lerp(farLeft, nearLeft, t);
    const right = lerp(farRight, nearRight, t);
    const leftNext = lerp(farLeft, nearLeft, tNext);

    const sourceY = v * plane.height;
    const sourceHeight = Math.max((vNext - v) * plane.height, 0.5);

    // Map the slice's source rectangle onto the band between this row and the
    // next. The band is treated as a parallelogram, which at this thickness is
    // indistinguishable from the true trapezoid.
    const across = { x: (right.x - left.x) / plane.width, y: (right.y - left.y) / plane.width };
    const down = {
      x: (leftNext.x - left.x) / sourceHeight,
      y: (leftNext.y - left.y) / sourceHeight,
    };

    context.setTransform(across.x, across.y, down.x, down.y, left.x, left.y);
    context.drawImage(
      plane,
      0,
      sourceY,
      plane.width,
      sourceHeight,
      0,
      0,
      plane.width,
      sourceHeight,
    );
  }

  context.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * How far into the material a given screen row falls.
 *
 * Linear in screen space would leave every plank the same depth; this is the
 * projective mapping for a plane whose far edge is `farWidth` and near edge
 * `nearWidth` wide, so the material compresses towards the far wall.
 */
function materialDepth(t: number, farWidth: number, nearWidth: number): number {
  return (t * nearWidth) / (farWidth + t * (nearWidth - farWidth));
}

function lerp(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

function distance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
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
