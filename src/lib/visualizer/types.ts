/**
 * Room visualizer types (§10).
 *
 * Geometry is stored in normalised coordinates (0–1 of the photo's width and
 * height) so a placement survives resizing, a different preview size, and a
 * round trip through the API.
 */

export type Point = { x: number; y: number };

/**
 * The floor area, clockwise from the far-left corner:
 * far-left, far-right, near-right, near-left.
 */
export type Quad = [Point, Point, Point, Point];

export type Placement = {
  /** Planks across the near edge of the floor — the practical "zoom". */
  tiles: number;
  /** Degrees the material is turned by, for diagonal or herringbone lays. */
  rotation: number;
  /** How strongly the room's own light and shadow show through the material. */
  lighting: number;
  /** Lightens or darkens the material, for matching a room's own exposure. */
  brightness: number;
  /** Material opacity, for judging a subtle finish against the existing floor. */
  opacity: number;
};

export type RoomSource = {
  /** Object URL for an upload, or a path for a demo room. */
  src: string;
  label: string;
  /** Present when the visitor uploaded the photo, for saving it alongside. */
  file?: File;
};

export type TextureChoice = {
  productSlug: string;
  productName: string;
  variantId: number | null;
  variantName: string | null;
  textureUrl: string;
  swatchUrl: string | null;
  price: number | null;
};

export const DEFAULT_PLACEMENT: Placement = {
  tiles: 6,
  rotation: 0,
  lighting: 0.75,
  brightness: 1,
  opacity: 1,
};

/**
 * A sensible starting floor for a photo taken standing up in a room: the far
 * edge around two thirds down, widening to the bottom corners.
 */
export const DEFAULT_QUAD: Quad = [
  { x: 0.2, y: 0.62 },
  { x: 0.8, y: 0.62 },
  { x: 1.02, y: 1.0 },
  { x: -0.02, y: 1.0 },
];

export const QUAD_CORNER_LABELS = [
  "Far left corner",
  "Far right corner",
  "Near right corner",
  "Near left corner",
] as const;
