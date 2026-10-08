import { patternPeriod, wrapOffsets, type PatternPeriod, type PlankRect } from "./patterns";
import type { LayoutPattern, MaterialKind } from "./types";

/**
 * A product texture, prepared for laying (§10, §24).
 *
 * The renderer repeats one image across the floor. For the natural layout that
 * is the texture itself; for every other layout it is one *period* of the
 * pattern, baked here: planks cut from different parts of the texture, each
 * turned and toned slightly differently, with bevelled joints or grout lines
 * between them. Baking is the expensive part, so results are cached per
 * material, layout, plank size and resolution — moving a slider re-uses them.
 *
 * The same bake also yields a height map of the joints, from which the AR and
 * 3D views derive a normal map: real geometry for the grooves between planks,
 * where the photo view has to paint them.
 */

export type MaterialTile = {
  /** Repeats across the floor, or is drawn once for a rug. */
  image: HTMLCanvasElement;
  /** Physical size of one image pixel, in metres. */
  metresPerPx: number;
  /** Turn the pattern by this much on top of the visitor's rotation. */
  baseRotation: number;
  /** A rug is placed once, not tiled. */
  repeat: boolean;
  /** Joints as a height map — white surface, dark grooves — when asked for. */
  height?: HTMLCanvasElement;
};

export type TileRequest = {
  texture: CanvasImageSource;
  /** Identifies the texture across renders, for the cache. */
  textureKey: string;
  kind: MaterialKind;
  layout: LayoutPattern;
  lengthM: number;
  widthM: number;
  /** A dedicated seamless texture is used whole; a photograph is cropped. */
  isSeamless: boolean;
  /** Resolution the tile will be drawn at, so joints stay crisp but not aliased. */
  pxPerM: number;
  withHeight?: boolean;
};

/**
 * Share of a product photograph kept when it is not a dedicated texture.
 *
 * Catalogue photography is staged: a plank propped on a pallet, a sprig of
 * greenery for scale. Taking a square from the middle gets closer to the
 * material itself, which is where photographers put it. Damage limitation —
 * a seamless texture uploaded against the product always looks better.
 */
const PHOTO_CROP = 0.62;

/** Physical size the natural layout assumes one repeat of the texture covers. */
const NATURAL_REPEAT_M: Record<MaterialKind, number> = {
  plank: 0.9,
  tile: 1.2,
  carpet: 1,
  rug: 1,
};

/** Bakes larger than this on either side cost memory for detail nobody sees. */
const MAX_BAKE_PX = 2048;
const MIN_PX_PER_M = 96;

/** Joint width, in metres. A micro-bevel reads as about this wide. */
const BEVEL_M = 0.0016;
const GROUT_M = 0.003;

/** How far apart neighbouring planks may sit in tone: ±this share. */
const TONE_JITTER = 0.07;

const CACHE_LIMIT = 10;
const cache = new Map<string, MaterialTile>();
const sourceCache = new WeakMap<object, Map<string, HTMLCanvasElement>>();

export function materialTile(request: TileRequest): MaterialTile | null {
  const pxPerM = bucket(request.pxPerM);
  const key = [
    request.textureKey,
    request.kind,
    request.layout,
    request.lengthM.toFixed(4),
    request.widthM.toFixed(4),
    request.isSeamless ? "s" : "p",
    pxPerM,
    request.withHeight ? "h" : "",
  ].join("|");

  const cached = cache.get(key);

  if (cached) {
    // Re-insert to keep the most recently used at the end.
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }

  const tile = bake({ ...request, pxPerM });

  if (tile) {
    cache.set(key, tile);
    while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  }

  return tile;
}

/** Release every baked tile — for when a page holding many materials unmounts. */
export function clearMaterialTiles(): void {
  cache.clear();
}

/** Round to a power of √2 so nearby resolutions share a bake. */
function bucket(pxPerM: number): number {
  const clamped = Math.max(MIN_PX_PER_M, Number.isFinite(pxPerM) ? pxPerM : MIN_PX_PER_M);
  return Math.round(Math.SQRT2 ** Math.round(Math.log(clamped) / Math.log(Math.SQRT2)));
}

function bake(request: TileRequest): MaterialTile | null {
  const { kind, layout } = request;

  if (kind === "rug") {
    const image = toCanvas(request.texture);
    if (!image) return null;
    return {
      image: resample(image, Math.min(MAX_BAKE_PX, Math.round(request.lengthM * request.pxPerM))),
      // Unused: a rug is drawn once, stretched to the rug's own size.
      metresPerPx: request.lengthM / Math.max(1, image.width),
      baseRotation: 0,
      repeat: false,
    };
  }

  const source = preparedSource(request.texture, request.isSeamless, layout !== "natural");

  if (!source) return null;

  if (layout === "natural" || kind === "carpet") {
    const repeatM = NATURAL_REPEAT_M[kind];
    const target = Math.min(MAX_BAKE_PX, Math.max(64, Math.round(repeatM * request.pxPerM)));
    const image = resample(source, Math.min(source.width, target));

    return { image, metresPerPx: repeatM / image.width, baseRotation: 0, repeat: true };
  }

  const period = patternPeriod(layout, kind, request.lengthM, request.widthM);

  if (period.planks.length === 0) return null;

  // Never bake finer than the texture can supply, nor bigger than a phone
  // will thank us for.
  const sourceDetail = sampleWidth(source, period.planks[0]) / Math.max(request.lengthM, 0.01);
  const pxPerM = Math.max(
    MIN_PX_PER_M / 2,
    Math.min(
      request.pxPerM,
      sourceDetail * 1.25,
      MAX_BAKE_PX / Math.max(period.width, period.height),
    ),
  );

  return bakePeriod(source, period, kind, pxPerM, request.withHeight ?? false, request.textureKey);
}

/**
 * The texture ready to cut planks from: cropped when it is a photograph, and
 * turned so its grain runs across rather than down.
 */
function preparedSource(
  texture: CanvasImageSource,
  isSeamless: boolean,
  alignGrain: boolean,
): HTMLCanvasElement | null {
  const width = sizeOf(texture).width;
  const height = sizeOf(texture).height;

  if (width === 0 || height === 0) return null;

  const cacheKey = `${isSeamless}|${alignGrain}`;
  const byTexture = sourceCache.get(texture as object) ?? new Map<string, HTMLCanvasElement>();
  const cached = byTexture.get(cacheKey);

  if (cached) return cached;

  const side = Math.min(width, height);
  const cropW = isSeamless ? width : Math.round(side * PHOTO_CROP);
  const cropH = isSeamless ? height : Math.round(side * PHOTO_CROP);

  const crop = document.createElement("canvas");
  crop.width = cropW;
  crop.height = cropH;
  crop
    .getContext("2d")
    ?.drawImage(
      texture,
      Math.round((width - cropW) / 2),
      Math.round((height - cropH) / 2),
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH,
    );

  const result = alignGrain && grainRunsDown(crop) ? rotateQuarter(crop) : crop;

  byTexture.set(cacheKey, result);
  sourceCache.set(texture as object, byTexture);

  return result;
}

/**
 * Whether the texture's grain — or the joints of a floor photographed whole —
 * runs vertically.
 *
 * Planks are cut along x, so a texture whose grain runs down would give planks
 * striped across their width. Wood changes tone far more across its grain than
 * along it, so comparing horizontal and vertical gradient energy on a small
 * copy says which way it runs.
 */
function grainRunsDown(source: HTMLCanvasElement): boolean {
  const size = 64;
  const probe = document.createElement("canvas");
  probe.width = size;
  probe.height = size;

  const context = probe.getContext("2d", { willReadFrequently: true });

  if (!context) return false;

  context.drawImage(source, 0, 0, size, size);

  let data: Uint8ClampedArray;

  try {
    data = context.getImageData(0, 0, size, size).data;
  } catch {
    return false;
  }

  const luminance = (index: number) =>
    0.299 * data[index * 4] + 0.587 * data[index * 4 + 1] + 0.114 * data[index * 4 + 2];

  let acrossX = 0;
  let acrossY = 0;

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const here = luminance(y * size + x);
      acrossX += Math.abs(luminance(y * size + x + 1) - here);
      acrossY += Math.abs(luminance((y + 1) * size + x) - here);
    }
  }

  // Tone changing along x means stripes running down. A clear margin is asked
  // for: a stone or a speckled vinyl has no grain, and is left as it is.
  return acrossX > acrossY * 1.3;
}

function rotateQuarter(source: HTMLCanvasElement): HTMLCanvasElement {
  const turned = document.createElement("canvas");
  turned.width = source.height;
  turned.height = source.width;

  const context = turned.getContext("2d");

  if (!context) return source;

  context.translate(turned.width, 0);
  context.rotate(Math.PI / 2);
  context.drawImage(source, 0, 0);

  return turned;
}

/**
 * Physical width the prepared texture is taken to show, in metres.
 *
 * Pieces sample the texture in proportion to their real length, so a 600mm
 * herringbone block shows the same grain scale as a 1220mm board rather than
 * the whole texture squeezed into half the length.
 */
const SOURCE_SPAN_M = 1.5;

/** Width of texture a plank is sampled from, in source pixels. */
function sampleWidth(source: HTMLCanvasElement, plank: PlankRect): number {
  const along = plank.vertical ? plank.h : plank.w;
  const across = plank.vertical ? plank.w : plank.h;
  const aspect = along / Math.max(across, 1e-6);

  return Math.min(
    source.width * 0.85,
    source.height * aspect,
    source.width * (along / SOURCE_SPAN_M),
  );
}

function bakePeriod(
  source: HTMLCanvasElement,
  period: PatternPeriod,
  kind: MaterialKind,
  pxPerM: number,
  withHeight: boolean,
  seedKey: string,
): MaterialTile | null {
  const width = Math.max(1, Math.round(period.width * pxPerM));
  const height = Math.max(1, Math.round(period.height * pxPerM));
  // The period must repeat exactly, so the scale is taken from the rounded size.
  const scaleX = width / period.width;
  const scaleY = height / period.height;

  const image = document.createElement("canvas");
  image.width = width;
  image.height = height;

  const context = image.getContext("2d");

  if (!context) return null;

  const isTile = kind === "tile";
  const jointPx = Math.max(1, (isTile ? GROUT_M : BEVEL_M) * pxPerM);

  if (isTile) {
    // Grout shows wherever a tile is inset from its neighbour.
    context.fillStyle = groutColour(source);
    context.fillRect(0, 0, width, height);
  }

  const random = seeded(hash(seedKey));
  const looks = period.planks.map(() => ({
    u: random(),
    v: random(),
    flipX: random() < 0.5,
    flipY: random() < 0.5,
    tone: (random() * 2 - 1) * TONE_JITTER,
  }));

  period.planks.forEach((plank, index) => {
    for (const { dx, dy } of wrapOffsets(plank, period)) {
      const x = (plank.x + dx) * scaleX;
      const y = (plank.y + dy) * scaleY;
      const w = plank.w * scaleX;
      const h = plank.h * scaleY;
      const inset = isTile ? jointPx / 2 : 0;

      drawPlank(
        context,
        source,
        plank,
        looks[index],
        x + inset,
        y + inset,
        w - inset * 2,
        h - inset * 2,
      );

      if (!isTile) drawBevel(context, x, y, w, h, jointPx);
    }
  });

  let heightMap: HTMLCanvasElement | undefined;

  if (withHeight) {
    heightMap = document.createElement("canvas");
    heightMap.width = width;
    heightMap.height = height;

    const heightContext = heightMap.getContext("2d");

    if (heightContext) {
      heightContext.fillStyle = "#000";
      heightContext.fillRect(0, 0, width, height);
      heightContext.fillStyle = "#fff";

      for (const plank of period.planks) {
        for (const { dx, dy } of wrapOffsets(plank, period)) {
          const inset = isTile ? jointPx / 2 : jointPx / 2;
          heightContext.fillRect(
            (plank.x + dx) * scaleX + inset,
            (plank.y + dy) * scaleY + inset,
            plank.w * scaleX - inset * 2,
            plank.h * scaleY - inset * 2,
          );
        }
      }
    }
  }

  return {
    image,
    metresPerPx: 1 / scaleX,
    baseRotation: period.baseRotation,
    repeat: true,
    height: heightMap,
  };
}

type PlankLook = { u: number; v: number; flipX: boolean; flipY: boolean; tone: number };

/**
 * One plank: a strip of the texture with the plank's own proportions, from a
 * different place in it than its neighbours, so no two read as copies.
 */
function drawPlank(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  plank: PlankRect,
  look: PlankLook,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (w <= 0 || h <= 0) return;

  const along = plank.vertical ? h : w;
  const across = plank.vertical ? w : h;
  const aspect = along / across;

  const sampleW = sampleWidth(source, plank);
  const sampleH = sampleW / aspect;
  const sx = look.u * Math.max(0, source.width - sampleW);
  const sy = look.v * Math.max(0, source.height - sampleH);

  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.translate(x + w / 2, y + h / 2);
  if (plank.vertical) context.rotate(Math.PI / 2);
  context.scale(look.flipX ? -1 : 1, look.flipY ? -1 : 1);
  context.drawImage(source, sx, sy, sampleW, sampleH, -along / 2, -across / 2, along, across);

  // Real boards vary in tone; a uniform field is what makes a render look
  // printed. Lighten or darken each a little.
  context.globalAlpha = Math.abs(look.tone);
  context.fillStyle = look.tone > 0 ? "#fff" : "#000";
  context.fillRect(-along / 2, -across / 2, along, across);
  context.restore();
}

/** A micro-bevel: shadow along the far edges, a catch of light on the near ones. */
function drawBevel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  joint: number,
): void {
  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.42)";
  context.fillRect(x, y + h - joint, w, joint);
  context.fillRect(x + w - joint, y, joint, h);
  context.fillStyle = "rgba(255, 255, 255, 0.10)";
  context.fillRect(x, y, w, Math.max(1, joint * 0.6));
  context.fillRect(x, y, Math.max(1, joint * 0.6), h);
  context.restore();
}

/** Grout a little lighter and greyer than the tile, as a fitter would choose it. */
function groutColour(source: HTMLCanvasElement): string {
  const probe = document.createElement("canvas");
  probe.width = 1;
  probe.height = 1;

  const context = probe.getContext("2d", { willReadFrequently: true });

  try {
    context?.drawImage(source, 0, 0, 1, 1);
    const [r, g, b] = context?.getImageData(0, 0, 1, 1).data ?? [180, 176, 170];
    const grey = (r + g + b) / 3;
    const mix = (channel: number) => Math.round(Math.min(235, channel * 0.35 + grey * 0.45 + 70));
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  } catch {
    return "rgb(196, 192, 184)";
  }
}

/**
 * Halve repeatedly towards a target width. One big downscale through a single
 * bilinear pass skips most of the source and shimmers; halving does not.
 */
export function resample(source: HTMLCanvasElement, targetWidth: number): HTMLCanvasElement {
  let current = source;
  const target = Math.max(1, Math.round(targetWidth));

  while (current.width / 2 >= target) {
    current = scaled(current, Math.round(current.width / 2), Math.round(current.height / 2));
  }

  if (current.width === target) return current;

  return scaled(
    current,
    target,
    Math.max(1, Math.round((current.height * target) / current.width)),
  );
}

function scaled(source: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const context = canvas.getContext("2d");

  if (context) {
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
  }

  return canvas;
}

function toCanvas(texture: CanvasImageSource): HTMLCanvasElement | null {
  const { width, height } = sizeOf(texture);

  if (width === 0 || height === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(texture, 0, 0);

  return canvas;
}

/**
 * A normal map from a height map, for the 3D and AR views: the joints become
 * grooves that catch light the way the real floor's do.
 */
export function normalMapFromHeight(heightMap: HTMLCanvasElement, strength = 2): HTMLCanvasElement {
  const { width, height } = heightMap;
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;

  const input = heightMap.getContext("2d", { willReadFrequently: true });
  const context = output.getContext("2d");

  if (!input || !context) return output;

  const source = input.getImageData(0, 0, width, height).data;
  const result = context.createImageData(width, height);
  const at = (x: number, y: number) =>
    source[(((y + height) % height) * width + ((x + width) % width)) * 4] / 255;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const index = (y * width + x) * 4;

      result.data[index] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
      result.data[index + 1] = Math.round(((dy / length) * 0.5 + 0.5) * 255);
      result.data[index + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
      result.data[index + 3] = 255;
    }
  }

  context.putImageData(result, 0, 0);

  return output;
}

export function sizeOf(source: CanvasImageSource): { width: number; height: number } {
  if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }

  if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
    return { width: source.width, height: source.height };
  }

  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    return { width: source.width, height: source.height };
  }

  return { width: 0, height: 0 };
}

/** Deterministic randomness, so a design looks the same every time it opens. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let value = 2166136261;

  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}
