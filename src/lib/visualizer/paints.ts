import type { WallPaint } from "./types";

/**
 * Wall colours to try with a floor (§10).
 *
 * A curated range rather than a free picker first: most people choosing a
 * floor want to see it against a believable wall, and twenty-odd considered
 * colours get them there faster than a colour wheel. The picker is still
 * offered for a colour they already have in mind.
 */
export const PAINT_GROUPS: { name: string; paints: WallPaint[] }[] = [
  {
    name: "Whites & neutrals",
    paints: [
      { name: "Chalk white", color: "#f4f1ea" },
      { name: "Ivory", color: "#efe6d2" },
      { name: "Linen", color: "#e7dccb" },
      { name: "Greige", color: "#cfc6b8" },
      { name: "Stone", color: "#b9b0a2" },
      { name: "Warm grey", color: "#a39d95" },
    ],
  },
  {
    name: "Earth",
    paints: [
      { name: "Sahel sand", color: "#dcc39b" },
      { name: "Terracotta", color: "#c07a55" },
      { name: "Clay", color: "#a86b4e" },
      { name: "Ochre", color: "#d2a24c" },
      { name: "Cocoa", color: "#7a5a48" },
      { name: "Kola", color: "#8a4b3a" },
    ],
  },
  {
    name: "Greens & blues",
    paints: [
      { name: "Sage", color: "#a9b59b" },
      { name: "Olive", color: "#7d8360" },
      { name: "Forest", color: "#3f5a4a" },
      { name: "Duck egg", color: "#b7cdca" },
      { name: "Harbour blue", color: "#6f8ea3" },
      { name: "Navy", color: "#2f3e52" },
    ],
  },
  {
    name: "Deep & bold",
    paints: [
      { name: "Charcoal", color: "#45474a" },
      { name: "Aubergine", color: "#5a3d4b" },
      { name: "Blush", color: "#e3c3bb" },
      { name: "Mustard", color: "#c9a23a" },
      { name: "Teal", color: "#2f6b6a" },
      { name: "Oxblood", color: "#6b2c2c" },
    ],
  },
];

export const PAINTS: WallPaint[] = PAINT_GROUPS.flatMap((group) => group.paints);

/** A #rrggbb colour, or null — the only shape a saved or linked paint may take. */
export function parsePaint(value: unknown): string | null {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}

export function paintName(color: string): string {
  return PAINTS.find((paint) => paint.color === color.toLowerCase())?.name ?? color.toUpperCase();
}
