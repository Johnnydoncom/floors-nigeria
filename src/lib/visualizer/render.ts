import { drawFloor, floorMap } from "./floor-raster";
import { planeAspect, project, unitSquareToQuad } from "./homography";
import { FINISH_SHEEN, lightingMaps } from "./lighting";
import { materialTile } from "./material-tile";
import type { LightMood, Point, Quad, SurfaceLayer } from "./types";

/**
 * Renders a floor material into a room photograph (§10).
 *
 * The floor is a plane, so the mapping from material to photograph is a
 * homography (see `homography.ts`). `floor-raster.ts` runs it backwards for
 * every pixel, which covers the whole photograph by construction; the mask then
 * keeps the pixels that are floor, and the room's own light goes back over them.
 */

/** Material coordinate the pattern is turned and phased about: the quad's middle. */
const PATTERN_ANCHOR = 0.5;

export type RenderOptions = {
  photo: CanvasImageSource;
  photoWidth: number;
  photoHeight: number;
  /**
   * The surfaces to dress, drawn in order. Today that is one floor; walls are
   * the same homography on a vertical plane, which is why this is a list.
   */
  surfaces: SurfaceLayer[];
  /** A paint colour for the walls, and the baked wall layer it is laid through. */
  paint?: { color: string; walls: CanvasImageSource } | null;
  /** The room's light, as a grade over the finished picture. */
  mood?: LightMood;
};

/**
 * Each mood as a multiply tint and an optional screen glow. Mild on purpose:
 * it should read as the same room at another hour, not as a filter.
 */
const MOODS: Record<
  Exclude<LightMood, "daylight">,
  { tint: string; alpha: number; glow?: string; glowAlpha?: number }
> = {
  warm: { tint: "#ffd9a8", alpha: 0.32, glow: "#ff9d4d", glowAlpha: 0.05 },
  cool: { tint: "#dbe6ff", alpha: 0.3, glow: "#cfe0ff", glowAlpha: 0.04 },
  evening: { tint: "#e2b27a", alpha: 0.55, glow: "#ff8a3d", glowAlpha: 0.04 },
};

/**
 * Off-screen canvases, kept per target and reused: a slider drag renders many
 * times a second, and a fresh photo-sized canvas for each would be 10MB of
 * garbage a frame on a 1920px room.
 */
const scratch = new WeakMap<
  HTMLCanvasElement,
  { floor: HTMLCanvasElement; paint: HTMLCanvasElement }
>();

function scratchFor(target: HTMLCanvasElement, width: number, height: number) {
  let entry = scratch.get(target);
  if (!entry) {
    entry = { floor: document.createElement("canvas"), paint: document.createElement("canvas") };
    scratch.set(target, entry);
  }
  for (const canvas of [entry.floor, entry.paint]) {
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }
  return entry;
}

/**
 * Draw the room, then each surface's material with the room's own light back
 * over it.
 */
export function renderRoom(canvas: HTMLCanvasElement, options: RenderOptions): void {
  const { photo, photoWidth, photoHeight, surfaces, paint, mood = "daylight" } = options;
  const context = canvas.getContext("2d");

  if (!context || photoWidth === 0 || photoHeight === 0) return;

  if (canvas.width !== photoWidth || canvas.height !== photoHeight) {
    canvas.width = photoWidth;
    canvas.height = photoHeight;
  }

  const buffers = scratchFor(canvas, photoWidth, photoHeight);

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
  context.clearRect(0, 0, photoWidth, photoHeight);
  context.drawImage(photo, 0, 0, photoWidth, photoHeight);

  if (paint) paintWalls(context, buffers.paint, photoWidth, photoHeight, paint);

  for (const surface of surfaces) {
    drawSurface(context, buffers.floor, photo, photoWidth, photoHeight, surface);
  }

  if (mood !== "daylight") grade(context, photoWidth, photoHeight, MOODS[mood]);
}

/**
 * A paint colour through the wall layer: the colour multiplied by the wall's
 * own light (grey), kept only where the wall is (alpha). Shadows, the wash of
 * a downlight and the texture of brick all survive, so it reads as paint
 * rather than a flat fill.
 */
function paintWalls(
  context: CanvasRenderingContext2D,
  buffer: HTMLCanvasElement,
  width: number,
  height: number,
  paint: { color: string; walls: CanvasImageSource },
): void {
  const layer = buffer.getContext("2d");
  if (!layer) return;

  layer.globalCompositeOperation = "source-over";
  layer.clearRect(0, 0, width, height);
  layer.drawImage(paint.walls, 0, 0, width, height);
  // Multiply over transparency paints the colour outright, so the alpha is put
  // back from the wall layer afterwards.
  layer.globalCompositeOperation = "multiply";
  layer.fillStyle = paint.color;
  layer.fillRect(0, 0, width, height);
  layer.globalCompositeOperation = "destination-in";
  layer.drawImage(paint.walls, 0, 0, width, height);
  layer.globalCompositeOperation = "source-over";

  context.drawImage(buffer, 0, 0);
}

function grade(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  mood: { tint: string; alpha: number; glow?: string; glowAlpha?: number },
): void {
  context.save();
  context.globalCompositeOperation = "multiply";
  context.globalAlpha = mood.alpha;
  context.fillStyle = mood.tint;
  context.fillRect(0, 0, width, height);
  if (mood.glow && mood.glowAlpha) {
    context.globalCompositeOperation = "screen";
    context.globalAlpha = mood.glowAlpha;
    context.fillStyle = mood.glow;
    context.fillRect(0, 0, width, height);
  }
  context.restore();
}

function drawSurface(
  context: CanvasRenderingContext2D,
  floor: HTMLCanvasElement,
  photo: CanvasImageSource,
  photoWidth: number,
  photoHeight: number,
  surface: SurfaceLayer,
): void {
  const { texture, quad, placement, mask } = surface;

  if (!texture) return;

  const corners = toPixels(quad, photoWidth, photoHeight);
  const homography = unitSquareToQuad(corners);

  // The quad is a rectangle on the floor but rarely a square one. Its real
  // depth comes from the perspective, and its width from the visitor, so the
  // material can be laid in metres — planks at their real size and shape.
  const metres = {
    width: Math.max(0.1, placement.widthM),
    depth: Math.max(0.1, placement.widthM * planeAspect(homography, photoWidth, photoHeight)),
  };

  const tile = materialTile({
    texture,
    textureKey: surface.textureKey,
    // Whatever was chosen fills the floor. A rug is only placed once in AR,
    // where it is a thing on a floor rather than the floor itself.
    kind: surface.materialKind === "rug" ? "carpet" : surface.materialKind,
    layout: placement.layout,
    lengthM: placement.plankLengthMm / 1000,
    widthM: placement.plankWidthMm / 1000,
    isSeamless: surface.isSeamless,
    textureSizeM: surface.textureSizeM,
    // Fine enough for the floor underfoot; mipmaps look after the far end.
    pxPerM: distance(corners[2], corners[3]) / metres.width,
  });

  if (!tile) return;

  // Composed off-screen so it can be trimmed to the floor before it reaches
  // the photograph.
  const floorContext = floor.getContext("2d");

  if (!floorContext) return;

  floorContext.setTransform(1, 0, 0, 1, 0, 0);
  floorContext.globalCompositeOperation = "source-over";
  floorContext.globalAlpha = 1;
  floorContext.clearRect(0, 0, photoWidth, photoHeight);

  floorContext.save();
  // Without a mask the quad is the floor's whole outline.
  if (!mask) clipToQuad(floorContext, corners);

  drawFloor(floorContext, {
    map: floorMap(
      homography,
      {
        metres,
        angle: ((placement.rotation + tile.baseRotation) * Math.PI) / 180,
        tileWidthM: tile.image.width * tile.metresPerPx,
        tileHeightM: tile.image.height * tile.metresPerPx,
        anchor: PATTERN_ANCHOR,
      },
      project(homography, PATTERN_ANCHOR, PATTERN_ANCHOR),
    ),
    tile: tile.image,
    brightness: placement.brightness,
    width: photoWidth,
    height: photoHeight,
  });

  floorContext.restore();

  // Multiply and screen paint transparent pixels too, so the room's light must
  // land only where material was drawn: the mask trims it below, the quad here.
  applyRoomLight(floorContext, photo, photoWidth, photoHeight, surface, mask ? null : corners);

  if (mask) {
    // Keep only the pixels the detector called floor. The lighting pass ran on
    // the full rectangle, so this trims it too. Scaled smoothly: the mask is
    // smaller than the photograph, and a hard scale steps every edge in it.
    floorContext.globalCompositeOperation = "destination-in";
    floorContext.imageSmoothingQuality = "high";
    floorContext.drawImage(mask, 0, 0, photoWidth, photoHeight);
    floorContext.globalCompositeOperation = "source-over";
  }

  context.globalAlpha = placement.opacity;
  context.drawImage(floor, 0, 0);
  context.globalAlpha = 1;
}

/**
 * Carry the room's shadows and highlights onto the new material (see
 * `lighting.ts`). Falls back to multiplying the photograph itself when it
 * cannot be read back, which keeps the shadows at the cost of some of the old
 * floor's tone.
 */
function applyRoomLight(
  floorContext: CanvasRenderingContext2D,
  photo: CanvasImageSource,
  photoWidth: number,
  photoHeight: number,
  surface: SurfaceLayer,
  clip: Quad | null,
): void {
  const { placement, mask, quad } = surface;

  if (placement.lighting <= 0) return;

  const maps = surface.light ?? lightingMaps(photo, photoWidth, photoHeight, { mask, quad });

  floorContext.save();
  if (clip) clipToQuad(floorContext, clip);

  floorContext.globalCompositeOperation = "multiply";
  floorContext.globalAlpha = placement.lighting;
  floorContext.drawImage(maps?.shading ?? photo, 0, 0, photoWidth, photoHeight);

  if (maps) {
    floorContext.globalCompositeOperation = "screen";
    floorContext.globalAlpha = Math.min(1, placement.lighting * FINISH_SHEEN[placement.finish]);
    floorContext.drawImage(maps.highlights, 0, 0, photoWidth, photoHeight);
  }

  floorContext.restore();
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

function distance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}
