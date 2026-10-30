import { drawFloor, floorMap } from "./floor-raster";
import { planeAspect, project, unitSquareToQuad } from "./homography";
import { FINISH_SHEEN, lightingMaps } from "./lighting";
import { materialTile } from "./material-tile";
import type { Point, Quad, SurfaceLayer } from "./types";

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
};

/**
 * Draw the room, then each surface's material with the room's own light back
 * over it.
 */
export function renderRoom(canvas: HTMLCanvasElement, options: RenderOptions): void {
  const { photo, photoWidth, photoHeight, surfaces } = options;
  const context = canvas.getContext("2d");

  if (!context || photoWidth === 0 || photoHeight === 0) return;

  canvas.width = photoWidth;
  canvas.height = photoHeight;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, photoWidth, photoHeight);
  context.drawImage(photo, 0, 0, photoWidth, photoHeight);

  for (const surface of surfaces) {
    drawSurface(context, photo, photoWidth, photoHeight, surface);
  }
}

function drawSurface(
  context: CanvasRenderingContext2D,
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
  const floor = document.createElement("canvas");
  floor.width = photoWidth;
  floor.height = photoHeight;

  const floorContext = floor.getContext("2d");

  if (!floorContext) return;

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

  const maps = lightingMaps(photo, photoWidth, photoHeight, { mask, quad });

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
