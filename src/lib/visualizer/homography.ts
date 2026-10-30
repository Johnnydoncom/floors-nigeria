import type { Point, Quad } from "./types";

/**
 * Projective mapping between the flat material and the floor in a photograph.
 *
 * A floor is a plane. A camera maps a plane to a plane by a homography — a 3×3
 * matrix applied in homogeneous coordinates — so if we know where the four
 * corners of the floor landed in the photo, we know where *every* point of the
 * material lands. That is the whole basis of the visualizer: no depth data, no
 * camera calibration, just four corners.
 *
 * The matrix is
 *
 *     ⎡ a  b  c ⎤        x = (a·u + b·v + c) / (g·u + h·v + 1)
 *     ⎢ d  e  f ⎥        y = (d·u + e·v + f) / (g·u + h·v + 1)
 *     ⎣ g  h  1 ⎦
 *
 * where (u, v) are coordinates on the material and (x, y) pixels in the photo.
 * The divisor is what produces foreshortening: it grows towards the far wall,
 * shrinking everything mapped through it.
 */
export type Homography = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
};

/** Below this, the quad's opposite edges are parallel and the map is affine. */
const PARALLEL_EPSILON = 1e-9;

/**
 * The homography taking the unit square to a quadrilateral, with corners in the
 * order the visualizer stores them: far-left, far-right, near-right, near-left,
 * matching (0,0), (1,0), (1,1), (0,1) on the material.
 *
 * This is the closed form for a unit-square source (Heckbert, *Fundamentals of
 * Texture Mapping and Image Warping*, §2.2). The general Direct Linear
 * Transform solves an 8×8 system for four arbitrary correspondences; with the
 * source fixed to the unit square that system collapses to the arithmetic
 * below, which is exact, allocation-free and cannot fail to converge.
 */
export function unitSquareToQuad([topLeft, topRight, bottomRight, bottomLeft]: Quad): Homography {
  const dx1 = topRight.x - bottomRight.x;
  const dx2 = bottomLeft.x - bottomRight.x;
  const dy1 = topRight.y - bottomRight.y;
  const dy2 = bottomLeft.y - bottomRight.y;

  // How far the quad departs from a parallelogram. Zero means no perspective.
  const sumX = topLeft.x - topRight.x + bottomRight.x - bottomLeft.x;
  const sumY = topLeft.y - topRight.y + bottomRight.y - bottomLeft.y;

  const determinant = dx1 * dy2 - dx2 * dy1;

  if (Math.abs(determinant) < PARALLEL_EPSILON) {
    // Degenerate quad: fall back to an affine map so a mis-dragged corner
    // still renders something rather than dividing by zero.
    return {
      a: topRight.x - topLeft.x,
      b: bottomLeft.x - topLeft.x,
      c: topLeft.x,
      d: topRight.y - topLeft.y,
      e: bottomLeft.y - topLeft.y,
      f: topLeft.y,
      g: 0,
      h: 0,
    };
  }

  if (Math.abs(sumX) < PARALLEL_EPSILON && Math.abs(sumY) < PARALLEL_EPSILON) {
    // A true parallelogram — the floor viewed square-on. No perspective term.
    return {
      a: topRight.x - topLeft.x,
      b: bottomRight.x - topRight.x,
      c: topLeft.x,
      d: topRight.y - topLeft.y,
      e: bottomRight.y - topRight.y,
      f: topLeft.y,
      g: 0,
      h: 0,
    };
  }

  const g = (sumX * dy2 - dx2 * sumY) / determinant;
  const h = (dx1 * sumY - sumX * dy1) / determinant;

  return {
    a: topRight.x - topLeft.x + g * topRight.x,
    b: bottomLeft.x - topLeft.x + h * bottomLeft.x,
    c: topLeft.x,
    d: topRight.y - topLeft.y + g * topRight.y,
    e: bottomLeft.y - topLeft.y + h * bottomLeft.y,
    f: topLeft.y,
    g,
    h,
  };
}

/**
 * Where a point on the material lands in the photograph.
 */
export function project(homography: Homography, u: number, v: number): Point {
  const { a, b, c, d, e, f, g, h } = homography;
  const w = g * u + h * v + 1;

  // A point on or beyond the horizon has w ≤ 0 and no image in front of the
  // camera; clamping keeps it off-canvas instead of mirroring it into view.
  const safeW = Math.abs(w) < PARALLEL_EPSILON ? PARALLEL_EPSILON : w;

  return {
    x: (a * u + b * v + c) / safeW,
    y: (d * u + e * v + f) / safeW,
  };
}

/**
 * The reverse mapping: where a pixel in the photograph falls on the material.
 *
 * Obtained by inverting the 3×3 matrix, which for a homography is just its
 * adjugate — any scalar multiple describes the same projective map, so the
 * determinant can be ignored.
 */
export function unproject(homography: Homography): (x: number, y: number) => Point | null {
  const [A, B, C, D, E, F, G, H, I] = inverseMatrix(homography);

  return (x, y) => {
    const w = G * x + H * y + I;

    if (Math.abs(w) < PARALLEL_EPSILON) return null;

    return {
      x: (A * x + B * y + C) / w,
      y: (D * x + E * y + F) / w,
    };
  };
}

/**
 * The inverse as a row-major matrix, photo pixels to homogeneous material
 * coordinates: the adjugate of ⎡a b c; d e f; g h 1⎤.
 */
export function inverseMatrix({ a, b, c, d, e, f, g, h }: Homography): number[] {
  return [
    e - f * h,
    c * h - b,
    b * f - c * e,
    f * g - d,
    a - c * g,
    c * d - a * f,
    d * h - e * g,
    b * g - a * h,
    a * e - b * d,
  ];
}

/**
 * The perspective divisor at a point — how strongly the material is compressed
 * there. Used to decide how finely to subdivide: the far end of a floor needs
 * far more subdivision than the near end to stay smooth.
 */
export function perspectiveWeight(homography: Homography, u: number, v: number): number {
  return homography.g * u + homography.h * v + 1;
}

/**
 * Focal length assumed for a photograph, as a share of its longer side.
 *
 * A phone's main camera is about 26mm full-frame equivalent — roughly 70° across
 * the long side — which puts the focal length near 0.7 of the long side in
 * pixels. Photographs do not carry it reliably (EXIF is stripped by most
 * sharing paths), and the result below is not sensitive to it: ±20% moves the
 * aspect of a typical floor by a few percent.
 */
export const ASSUMED_FOCAL_SHARE = 0.7;

/** Beyond these, the quad is not a rectangle on the floor and 1 is safer. */
const MIN_PLANE_ASPECT = 0.25;
const MAX_PLANE_ASPECT = 4;

/** Where a phone is held to photograph a room, in metres above the floor. */
const ASSUMED_CAMERA_HEIGHT_M = 1.4;

/**
 * The real width of the quad's rectangle, in metres, given how high the camera
 * was held.
 *
 * A photograph has no scale of its own, but a room does: people photograph it
 * from about chest height, and the floor's perspective says how far below the
 * camera it lies, in units of the quad. With the camera's intrinsics removed the
 * homography's columns are λ·A·r₁, λ·B·r₂ and λ·t, so the floor's normal is
 * r₁ × r₂, the camera's height over it is |n·t|, and A follows from the two.
 *
 * Without this every room is taken to be the same width, and a hotel lobby gets
 * planks as long as a car. Null when the quad has no usable perspective.
 */
export function floorWidthFromCamera(
  homography: Homography,
  width: number,
  height: number,
  focalShare = ASSUMED_FOCAL_SHARE,
): number | null {
  const focal = Math.max(width, height) * focalShare;
  const cx = width / 2;
  const cy = height / 2;
  const { a, b, c, d, e, f, g, h } = homography;

  const camera = (x: number, y: number, w: number) => [
    (x - cx * w) / focal,
    (y - cy * w) / focal,
    w,
  ];
  const across = camera(a, d, g);
  const along = camera(b, e, h);
  const origin = camera(c, f, 1);

  const normal = [
    across[1] * along[2] - across[2] * along[1],
    across[2] * along[0] - across[0] * along[2],
    across[0] * along[1] - across[1] * along[0],
  ];
  const normalLength = Math.hypot(normal[0], normal[1], normal[2]);
  const drop = Math.abs(
    (normal[0] * origin[0] + normal[1] * origin[1] + normal[2] * origin[2]) / normalLength,
  );
  const metres = (ASSUMED_CAMERA_HEIGHT_M * Math.hypot(across[0], across[1], across[2])) / drop;

  return Number.isFinite(metres) && metres > 0 ? metres : null;
}

/**
 * How deep the quad's rectangle is on the real floor, relative to its width.
 *
 * The unit square maps to a rectangle on the floor plane, but nothing says it is
 * a *square* one: a quad marking a floor 4m wide and 6m deep is drawn exactly
 * like one 4m by 4m, only foreshortened differently. Laying the material in
 * unit-square coordinates therefore squashes or stretches every plank along the
 * depth of the room.
 *
 * A camera maps the floor by H = K [A·r₁, B·r₂, t], where A and B are the
 * rectangle's real sides and r₁, r₂ unit vectors. Undoing the intrinsics K
 * leaves columns proportional to A·r₁ and B·r₂, so B / A is the ratio of their
 * lengths — exact for a pinhole camera, given its focal length.
 *
 * `homography` maps the unit square to *pixels* in a photograph of the given
 * size, with the principal point assumed at its centre.
 */
export function planeAspect(
  homography: Homography,
  width: number,
  height: number,
  focalShare = ASSUMED_FOCAL_SHARE,
): number {
  const focal = Math.max(width, height) * focalShare;
  const cx = width / 2;
  const cy = height / 2;

  if (!(focal > 0)) return 1;

  const { a, b, d, e, g, h } = homography;

  const across = Math.hypot((a - cx * g) / focal, (d - cy * g) / focal, g);
  const along = Math.hypot((b - cx * h) / focal, (e - cy * h) / focal, h);

  const aspect = along / across;

  if (!Number.isFinite(aspect) || aspect <= 0) return 1;

  return Math.min(MAX_PLANE_ASPECT, Math.max(MIN_PLANE_ASPECT, aspect));
}
