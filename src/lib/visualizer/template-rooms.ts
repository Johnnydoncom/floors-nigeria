import type { FloorPreset, Quad } from "./types";

/**
 * Template rooms: photographs prepared once, with everything the visualizer
 * would otherwise work out in the browser baked alongside them.
 *
 * Each lives in `public/rooms/<id>/` — the photograph (WebP, 1920 wide), a
 * thumbnail, the floor mask, the floor's own light as shading and highlights,
 * and where the room has them, its walls and a rug. `scripts/bake-room.py`
 * makes them from a spec in `scripts/rooms/<id>.json`; see
 * `docs/room-visualizer.md` for adding a room.
 *
 * Because nothing is measured at runtime, a template room is on screen as soon
 * as its photograph and one texture arrive, and changing the floor is a single
 * redraw — the speed that makes trying twenty floors feel like flicking
 * through a catalogue.
 */

export type RoomKind = "living" | "dining" | "bedroom" | "kitchen" | "office" | "commercial";

export type TemplateRoom = {
  id: string;
  label: string;
  kind: RoomKind;
  /** The photograph the studio renders into. */
  src: string;
  thumb: string;
  width: number;
  height: number;
  floor: FloorPreset;
};

type Spec = {
  id: string;
  label: string;
  kind: RoomKind;
  width: number;
  height: number;
  quad: [number, number][];
  widthM: number;
  walls?: boolean;
  rug?: boolean;
};

/** Kept in step with `public/rooms/<id>/meta.json` by hand: four rooms, read on every visit. */
const SPECS: Spec[] = [
  {
    id: "loft-lounge",
    label: "Modern lounge",
    kind: "living",
    width: 1920,
    height: 1280,
    quad: [
      [0.34, 0.66],
      [0.68, 0.66],
      [1.12, 1.0],
      [-0.05, 1.0],
    ],
    widthM: 5.2,
    walls: true,
  },
  {
    id: "scandi-lounge",
    label: "Family lounge",
    kind: "living",
    width: 1920,
    height: 1280,
    quad: [
      [0.33, 0.665],
      [0.695, 0.665],
      [0.9, 0.88],
      [0.115, 0.88],
    ],
    widthM: 2.4,
    walls: true,
    rug: true,
  },
  {
    id: "classic-lounge",
    label: "Classic living",
    kind: "living",
    width: 1920,
    height: 1280,
    quad: [
      [0.12, 0.66],
      [0.86, 0.66],
      [1.3, 1.0],
      [-0.35, 1.0],
    ],
    widthM: 6.5,
  },
  {
    id: "office",
    label: "Office",
    kind: "office",
    width: 1920,
    height: 1320,
    quad: [
      [0.2558, 0.6398],
      [0.6379, 0.6398],
      [0.9992, 0.9989],
      [0, 0.9989],
    ],
    widthM: 5.5,
    walls: true,
  },
];

const base = (id: string) => `/rooms/${id}`;

export const TEMPLATE_ROOMS: TemplateRoom[] = SPECS.map((spec) => ({
  id: spec.id,
  label: spec.label,
  kind: spec.kind,
  src: `${base(spec.id)}/photo.webp`,
  thumb: `${base(spec.id)}/thumb.webp`,
  width: spec.width,
  height: spec.height,
  floor: {
    mask: `${base(spec.id)}/floor.png`,
    quad: spec.quad.map(([x, y]) => ({ x, y })) as Quad,
    widthM: spec.widthM,
    shading: `${base(spec.id)}/shading.png`,
    highlights: `${base(spec.id)}/highlights.png`,
    ...(spec.rug ? { rug: `${base(spec.id)}/rug.png` } : {}),
    ...(spec.walls ? { walls: `${base(spec.id)}/walls.webp` } : {}),
  },
}));

export function templateRoom(src: string): TemplateRoom | undefined {
  return TEMPLATE_ROOMS.find((room) => room.src === src || room.id === src);
}

/** A room photograph that may be saved by path rather than uploaded with a design. */
export function isBundledRoom(src: string): boolean {
  return src.startsWith("/rooms/") || src.startsWith("/images/");
}
