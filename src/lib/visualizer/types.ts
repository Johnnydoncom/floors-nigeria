import type { StockStatus, Variant } from "@/lib/api/types";

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

/**
 * How the material is laid.
 *
 * `natural` repeats the texture as photographed, with no joints of our own —
 * the honest choice for a marketing photograph that already shows a floor, and
 * for broadloom carpet. Every other layout cuts the texture into planks or
 * tiles of the product's real size and lays them in that pattern.
 */
export type LayoutPattern =
  "natural" | "straight" | "staggered" | "herringbone" | "diagonal" | "grid";

/** What sort of floor a product is, which decides its default layout and joints. */
export type MaterialKind = "plank" | "tile" | "carpet" | "rug";

/**
 * The surfaces a room can be dressed on. Only floors are offered today; walls
 * are the same homography on a vertical plane, and the renderer takes a list of
 * surface layers so adding them is a UI change rather than a rewrite.
 */
export type SurfaceKind = "floor" | "wall";

/** Surface finish, which decides how much of the room's own light glints off it. */
export type Finish = "matte" | "satin" | "gloss";

export type Placement = {
  /**
   * Real width, in metres, of the marked floor area — the one measurement a
   * photograph cannot supply. Planks are laid at their true size against it,
   * so this is the control that makes them look the right size.
   */
  widthM: number;
  /** Degrees the material is turned by, on top of the layout's own angle. */
  rotation: number;
  /** How strongly the room's own light and shadow show through the material. */
  lighting: number;
  /** Lightens or darkens the material, for matching a room's own exposure. */
  brightness: number;
  /** Material opacity, for judging a subtle finish against the existing floor. */
  opacity: number;
  layout: LayoutPattern;
  /** Plank or tile length and width in millimetres; for a rug, its size. */
  plankLengthMm: number;
  plankWidthMm: number;
  finish: Finish;
};

/** A sample room's floor, found once ahead of time (`bake-sample-floors.mjs`). */
export type FloorPreset = { mask: string; quad: Quad };

export type RoomSource = {
  /** Object URL for an upload, or a path for a sample room or saved design. */
  src: string;
  label: string;
  /** Known ahead of time, so no model is needed to find this room's floor. */
  floor?: FloorPreset;
  /** Present when the visitor uploaded the photo, for saving it alongside. */
  file?: File;
  /** Where the room came from, for analytics and for what saving should send. */
  origin?: "sample" | "upload" | "camera" | "design";
};

export type TextureChoice = {
  productId?: number;
  productSlug: string;
  productName: string;
  variantId: number | null;
  variantName: string | null;
  textureUrl: string;
  swatchUrl: string | null;
  price: number | null;
  /**
   * The variation this material comes from, when one is known.
   *
   * The room designer needs its real plank size and pack coverage to lay the
   * floor at true scale and price the room; the photo visualizer uses the same
   * size to cut planks, and tolerates it being absent.
   */
  variant: Variant | null;
  /** Waste allowance for this product, for material estimates (§12). */
  wastePercentage: number;
  /** What sort of floor this is, from its category. */
  kind?: MaterialKind;
  /**
   * True when the texture is a dedicated seamless render asset rather than the
   * marketing photograph standing in for one (§24). Decides whether the photo
   * is cropped and whether joints are laid by default.
   */
  isSeamless?: boolean;
  /** Metres of floor a dedicated texture shows across, when recorded. */
  textureSizeM?: number | null;
  imageUrl?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
  skuFamily?: string | null;
  priceUnit?: string | null;
  availability?: { status: StockStatus; label: string; isOrderable: boolean } | null;
};

/**
 * One surface to dress: where it is, how it recedes, and what is laid on it.
 * A room is rendered as a list of these over the photograph.
 */
export type SurfaceLayer = {
  kind: SurfaceKind;
  texture: CanvasImageSource | null;
  /** Identifies the texture for caching its prepared tiles. */
  textureKey: string;
  quad: Quad;
  placement: Placement;
  materialKind: MaterialKind;
  isSeamless: boolean;
  textureSizeM?: number | null;
  /**
   * Pixels of this surface, opaque where material belongs. When present it
   * decides *where* material is drawn and the quad only decides *how*
   * perspective runs. Without it the quad does both.
   */
  mask?: CanvasImageSource | null;
};

/** The range "floor width" can be set to, in metres. */
export const FLOOR_WIDTH_RANGE = { min: 1.5, max: 30 };

export const DEFAULT_PLACEMENT: Placement = {
  widthM: 4,
  rotation: 0,
  lighting: 0.8,
  brightness: 1,
  opacity: 1,
  layout: "natural",
  plankLengthMm: 1220,
  plankWidthMm: 183,
  finish: "satin",
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
