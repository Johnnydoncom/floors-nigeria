import * as THREE from "three";
import { materialTile, normalMapFromHeight } from "@/lib/visualizer/material-tile";
import { defaultDimensions } from "@/lib/visualizer/patterns";
import { loadTexture } from "@/lib/visualizer/images";
import type { Finish, LayoutPattern, MaterialKind, TextureChoice } from "@/lib/visualizer/types";

/**
 * The material as a physical object for AR: a square of floor at true scale,
 * with the joints as real grooves.
 *
 * Both AR paths — WebXR on Android, Quick Look on iOS — show the same patch,
 * so it is built once here. The pattern is baked into the texture rather than
 * repeated by the GPU: Quick Look ignores texture repeats on some versions, and
 * a baked patch looks identical everywhere.
 */

/** Side of the floor patch, in metres: enough to judge a pattern at room scale. */
export const PATCH_SIZE_M = 2.4;

/** Texture resolution: a 2.4m patch at this is ~1200px, crisp at arm's length. */
const PX_PER_M = 512;

const ROUGHNESS: Record<Finish, number> = { matte: 0.85, satin: 0.55, gloss: 0.22 };

export type ArMaterialSpec = {
  textureUrl: string;
  textureKey: string;
  kind: MaterialKind;
  layout: LayoutPattern;
  lengthM: number;
  widthM: number;
  rotationDegrees: number;
  isSeamless: boolean;
  finish: Finish;
};

/** The AR spec for a catalogue material, with the visitor's layout choices. */
export function arSpecFor(
  choice: TextureChoice,
  options: {
    layout?: LayoutPattern;
    rotationDegrees?: number;
    finish?: Finish;
    lengthMm?: number;
    widthMm?: number;
  } = {},
): ArMaterialSpec {
  const kind = choice.kind ?? "plank";
  const fallback = defaultDimensions(kind);
  const lengthMm = options.lengthMm ?? choice.variant?.dimensions.length_mm ?? fallback.lengthMm;
  const widthMm = options.widthMm ?? choice.variant?.dimensions.width_mm ?? fallback.widthMm;

  return {
    textureUrl: choice.textureUrl,
    textureKey: choice.textureUrl,
    kind,
    layout: options.layout ?? (kind === "tile" ? "grid" : "staggered"),
    lengthM: Math.max(lengthMm, widthMm) / 1000,
    widthM: Math.min(lengthMm, widthMm) / 1000,
    rotationDegrees: options.rotationDegrees ?? 0,
    isSeamless: choice.isSeamless ?? false,
    finish: options.finish ?? (kind === "carpet" || kind === "rug" ? "matte" : "satin"),
  };
}

/** A floor patch lying flat, origin at its centre, ready to place. */
export async function buildFloorPatch(spec: ArMaterialSpec): Promise<THREE.Mesh> {
  const texture = await loadTexture(spec.textureUrl);
  const isRug = spec.kind === "rug";
  const sizeX = isRug ? spec.lengthM : PATCH_SIZE_M;
  const sizeY = isRug ? spec.widthM : PATCH_SIZE_M;

  const { albedo, normal } = bakePatch(texture, spec, sizeX, sizeY);

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const material = new THREE.MeshStandardMaterial({
    map,
    roughness: ROUGHNESS[spec.finish],
    metalness: 0,
  });

  if (normal) {
    material.normalMap = new THREE.CanvasTexture(normal);
    material.normalScale.set(0.6, 0.6);
  }

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sizeX, sizeY), material);

  // PlaneGeometry stands upright by default; lay it on the floor.
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = "floor-patch";

  return mesh;
}

function bakePatch(
  texture: CanvasImageSource,
  spec: ArMaterialSpec,
  sizeX: number,
  sizeY: number,
): { albedo: HTMLCanvasElement; normal: HTMLCanvasElement | null } {
  const width = Math.round(sizeX * PX_PER_M);
  const height = Math.round(sizeY * PX_PER_M);

  const albedo = document.createElement("canvas");
  albedo.width = width;
  albedo.height = height;

  const tile = materialTile({
    texture,
    textureKey: spec.textureKey,
    kind: spec.kind,
    layout: spec.layout,
    lengthM: spec.lengthM,
    widthM: spec.widthM,
    isSeamless: spec.isSeamless,
    pxPerM: PX_PER_M,
    withHeight: true,
  });

  const context = albedo.getContext("2d");

  if (!context || !tile) return { albedo, normal: null };

  if (!tile.repeat) {
    context.drawImage(tile.image, 0, 0, width, height);
    return { albedo, normal: null };
  }

  const angle = ((spec.rotationDegrees + tile.baseRotation) * Math.PI) / 180;
  fillPattern(context, tile.image, tile.metresPerPx, angle, width, height);

  let normal: HTMLCanvasElement | null = null;

  if (tile.height) {
    const heightCanvas = document.createElement("canvas");
    heightCanvas.width = width;
    heightCanvas.height = height;

    const heightContext = heightCanvas.getContext("2d");

    if (heightContext) {
      fillPattern(heightContext, tile.height, tile.metresPerPx, angle, width, height);
      normal = normalMapFromHeight(heightCanvas);
    }
  }

  return { albedo, normal };
}

/** Repeat a tile across a canvas at PX_PER_M, turned about the centre. */
function fillPattern(
  context: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  metresPerPx: number,
  angle: number,
  width: number,
  height: number,
): void {
  const pattern = context.createPattern(image, "repeat");

  if (!pattern) return;

  const scale = metresPerPx * PX_PER_M;
  const reach = Math.hypot(width, height) / scale;

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(angle);
  context.scale(scale, scale);
  context.fillStyle = pattern;
  context.fillRect(-reach, -reach, reach * 2, reach * 2);
  context.restore();
}
