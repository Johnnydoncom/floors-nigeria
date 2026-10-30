import { inverseMatrix, type Homography } from "./homography";
import type { Point } from "./types";

/**
 * Laying the material, one photo pixel at a time.
 *
 * The floor is not drawn by placing material on the photograph. It is drawn by
 * asking of every pixel *which part of the material lands here* — the inverse
 * homography, then metres, then the lay angle, then the repeating tile. Asked
 * that way there is nothing to reach and nothing to run out of: every pixel has
 * an answer, whatever the quad, and the mask alone decides the outline. A floor
 * pixel past the horizon, which no real floor has but a dragged corner can
 * produce, gets the material's average colour rather than a hole.
 *
 * One 3×3 matrix carries the whole mapping, so a shader needs a matrix multiply
 * and a divide. WebGL2 does this for every pixel on a phone in a frame or two,
 * and filters the far floor properly (mipmaps and anisotropy). Where WebGL2 is
 * missing or its context has been lost, `rasterise` does the same arithmetic in
 * JavaScript at a lower resolution.
 */

/** Row-major: photo pixels to homogeneous tile coordinates (1 = one repeat). */
export type FloorMap = number[];

/** One level of a tile's mipmap chain, as RGBA bytes. */
export type TileLevel = { data: Uint8ClampedArray; width: number; height: number };

/**
 * Below this divisor a pixel is at or past the horizon. The map is normalised to
 * 1 in the middle of the quad, so this is a floor a thousand times further away.
 */
const HORIZON_W = 1e-3;

/** Longest side of the fallback's output. Scaled up, then trimmed by the mask. */
const FALLBACK_MAX_SIDE = 1280;

/**
 * The material's whole mapping: pixel → material (u, v) → metres about the
 * quad's middle → turned by the lay angle → repeats of the tile.
 *
 * Normalised so the divisor is +1 at `centre`, a point known to be on the floor:
 * the sign of a homography's inverse depends on the winding of the quad, and the
 * horizon test only means something when "in front" is positive.
 */
export function floorMap(
  homography: Homography,
  layout: {
    metres: { width: number; depth: number };
    angle: number;
    tileWidthM: number;
    tileHeightM: number;
    anchor: number;
  },
  centre: Point,
): FloorMap {
  const { metres, angle, tileWidthM, tileHeightM, anchor } = layout;
  const inverse = inverseMatrix(homography);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // s = su·u + sv·v + s0, t = tu·u + tv·v + t0.
  const su = (metres.width * cos) / tileWidthM;
  const sv = (metres.depth * sin) / tileWidthM;
  const tu = (-metres.width * sin) / tileHeightM;
  const tv = (metres.depth * cos) / tileHeightM;
  const s0 = -anchor * (su + sv);
  const t0 = -anchor * (tu + tv);

  const row = (u: number, v: number, one: number) => [
    u * inverse[0] + v * inverse[3] + one * inverse[6],
    u * inverse[1] + v * inverse[4] + one * inverse[7],
    u * inverse[2] + v * inverse[5] + one * inverse[8],
  ];

  const map = [...row(su, sv, s0), ...row(tu, tv, t0), ...row(0, 0, 1)];
  const w = map[6] * centre.x + map[7] * centre.y + map[8];
  const scale = Math.abs(w) > 1e-12 ? 1 / w : 1;

  return map.map((value) => value * scale);
}

/** A pixel's place on the tile, in repeats, or null at or past the horizon. */
export function tileCoordinate(map: FloorMap, x: number, y: number): Point | null {
  const w = map[6] * x + map[7] * y + map[8];

  if (!(w > HORIZON_W)) return null;

  return {
    x: (map[0] * x + map[1] * y + map[2]) / w,
    y: (map[3] * x + map[4] * y + map[5]) / w,
  };
}

/**
 * The floor as opaque RGBA, in JavaScript: one mip level per pixel, chosen from
 * how much tile the pixel spans, then bilinear within it. `scale` is output
 * pixels per photo pixel.
 */
export function rasterise(
  map: FloorMap,
  width: number,
  height: number,
  levels: TileLevel[],
  brightness: number,
  scale = 1,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height * 4);
  const coarsest = levels[levels.length - 1];
  const finest = levels[0];
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = map;

  let at = 0;

  for (let row = 0; row < height; row++) {
    const y = (row + 0.5) / scale;

    for (let column = 0; column < width; column++, at += 4) {
      const x = (column + 0.5) / scale;
      const w = m6 * x + m7 * y + m8;

      output[at + 3] = 255;

      if (!(w > HORIZON_W)) {
        writeTexel(output, at, coarsest, 0.5, 0.5, brightness);
        continue;
      }

      const s = (m0 * x + m1 * y + m2) / w;
      const t = (m3 * x + m4 * y + m5) / w;

      // The Jacobian of a projective map, in finest-level texels per photo pixel.
      const sx = ((m0 - s * m6) / w) * finest.width;
      const sy = ((m1 - s * m7) / w) * finest.width;
      const tx = ((m3 - t * m6) / w) * finest.height;
      const ty = ((m4 - t * m7) / w) * finest.height;
      const footprint = Math.max(sx * sx + tx * tx, sy * sy + ty * ty) / (scale * scale);
      const level =
        footprint > 1 ? Math.min(levels.length - 1, Math.round(Math.log2(footprint) / 2)) : 0;

      writeTexel(output, at, levels[level], s, t, brightness);
    }
  }

  return output;
}

function writeTexel(
  output: Uint8ClampedArray,
  at: number,
  level: TileLevel,
  s: number,
  t: number,
  brightness: number,
): void {
  const { data, width, height } = level;
  const px = (s - Math.floor(s)) * width - 0.5;
  const py = (t - Math.floor(t)) * height - 0.5;
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const fx = px - x0;
  const fy = py - y0;
  const left = (x0 + width) % width;
  const right = (x0 + 1 + width) % width;
  const top = (y0 + height) % height;
  const bottom = (y0 + 1 + height) % height;

  for (let channel = 0; channel < 3; channel++) {
    const upper =
      data[(top * width + left) * 4 + channel] * (1 - fx) +
      data[(top * width + right) * 4 + channel] * fx;
    const lower =
      data[(bottom * width + left) * 4 + channel] * (1 - fx) +
      data[(bottom * width + right) * 4 + channel] * fx;

    output[at + channel] = (upper * (1 - fy) + lower * fy) * brightness;
  }
}

/** What `drawFloor` needs; the tile is a canvas so both paths can read it. */
export type FloorDraw = {
  map: FloorMap;
  tile: HTMLCanvasElement;
  brightness: number;
  width: number;
  height: number;
};

/**
 * Paint the floor over the whole of `target`, by the GPU where there is one.
 * Coverage is the same either way: every pixel, trimmed afterwards by the mask.
 */
export function drawFloor(target: CanvasRenderingContext2D, draw: FloorDraw): void {
  const gl = gpu();

  if (gl?.render(draw)) {
    target.drawImage(gl.canvas, 0, 0);
    return;
  }

  drawInJavaScript(target, draw);
}

// --- The fallback ------------------------------------------------------------

const fallbackLevels = new WeakMap<HTMLCanvasElement, TileLevel[]>();

function drawInJavaScript(target: CanvasRenderingContext2D, draw: FloorDraw): void {
  const levels = tileLevels(draw.tile);

  if (levels.length === 0) return;

  const scale = Math.min(1, FALLBACK_MAX_SIDE / Math.max(draw.width, draw.height));
  const width = Math.max(1, Math.round(draw.width * scale));
  const height = Math.max(1, Math.round(draw.height * scale));
  const pixels = rasterise(draw.map, width, height, levels, draw.brightness, scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.putImageData(new ImageData(pixels as never, width, height), 0, 0);

  target.imageSmoothingQuality = "high";
  target.drawImage(canvas, 0, 0, draw.width, draw.height);
}

function tileLevels(tile: HTMLCanvasElement): TileLevel[] {
  const cached = fallbackLevels.get(tile);

  if (cached) return cached;

  const levels: TileLevel[] = [];
  let width = tile.width;
  let height = tile.height;
  let source: HTMLCanvasElement = tile;

  try {
    for (;;) {
      const context = source.getContext("2d", { willReadFrequently: true });

      if (!context) break;

      levels.push({ data: context.getImageData(0, 0, width, height).data, width, height });

      if (width === 1 && height === 1) break;

      width = Math.max(1, width >> 1);
      height = Math.max(1, height >> 1);

      const next = document.createElement("canvas");
      next.width = width;
      next.height = height;
      next.getContext("2d")?.drawImage(source, 0, 0, width, height);
      source = next;
    }
  } catch {
    return [];
  }

  fallbackLevels.set(tile, levels);

  return levels;
}

// --- The GPU -----------------------------------------------------------------

const VERTEX_SHADER = `#version 300 es
void main() {
  // One triangle that covers the canvas.
  vec2 corner = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(corner, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform mat3 uMap;
uniform float uHeight;
uniform float uBrightness;
uniform sampler2D uTile;
out vec4 colour;

void main() {
  vec3 p = uMap * vec3(gl_FragCoord.x, uHeight - gl_FragCoord.y, 1.0);
  // Sampled unconditionally: the filter's derivatives need a neighbour.
  vec3 near = texture(uTile, p.xy / max(p.z, ${HORIZON_W.toExponential()})).rgb;
  vec3 far = textureLod(uTile, vec2(0.5), 16.0).rgb;
  colour = vec4((p.z > ${HORIZON_W.toExponential()} ? near : far) * uBrightness, 1.0);
}`;

/** Tiles kept on the GPU, so switching back to a floor re-uploads nothing. */
const GPU_TILE_LIMIT = 6;

/** After this many lost contexts the GPU is left alone for the visit. */
const MAX_CONTEXT_LOSSES = 2;

type Gpu = { canvas: HTMLCanvasElement; render: (draw: FloorDraw) => boolean };

let current: Gpu | null = null;
let contextLosses = 0;
let unavailable = false;

function gpu(): Gpu | null {
  if (unavailable || typeof document === "undefined") return null;
  if (!current) current = createGpu();
  if (!current) unavailable = true;
  return current;
}

function createGpu(): Gpu | null {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });

  if (!gl) return null;

  const program = linkProgram(gl);

  if (!program) return null;

  const tiles = new Map<HTMLCanvasElement, WebGLTexture>();
  const limits = {
    size: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
    anisotropy: gl.getExtension("EXT_texture_filter_anisotropic"),
  };
  const uniforms = {
    map: gl.getUniformLocation(program, "uMap"),
    height: gl.getUniformLocation(program, "uHeight"),
    brightness: gl.getUniformLocation(program, "uBrightness"),
  };
  const vertices = gl.createVertexArray();

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    current = null;
    contextLosses++;
    if (contextLosses >= MAX_CONTEXT_LOSSES) unavailable = true;
  });

  const upload = (tile: HTMLCanvasElement): WebGLTexture | null => {
    const cached = tiles.get(tile);

    if (cached) {
      tiles.delete(tile);
      tiles.set(tile, cached);
      return cached;
    }

    const texture = gl.createTexture();

    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tile);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    if (limits.anisotropy) {
      const { TEXTURE_MAX_ANISOTROPY_EXT, MAX_TEXTURE_MAX_ANISOTROPY_EXT } = limits.anisotropy;
      gl.texParameterf(
        gl.TEXTURE_2D,
        TEXTURE_MAX_ANISOTROPY_EXT,
        Math.min(16, gl.getParameter(MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number),
      );
    }

    tiles.set(tile, texture);

    while (tiles.size > GPU_TILE_LIMIT) {
      const [oldest, stale] = tiles.entries().next().value as [HTMLCanvasElement, WebGLTexture];
      gl.deleteTexture(stale);
      tiles.delete(oldest);
    }

    return texture;
  };

  return {
    canvas,
    render: ({ map, tile, brightness, width, height }) => {
      if (gl.isContextLost() || width > limits.size || height > limits.size) return false;

      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      const texture = upload(tile);

      if (!texture) return false;

      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.bindVertexArray(vertices);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // A mat3 uniform is column-major.
      gl.uniformMatrix3fv(uniforms.map, false, [
        map[0],
        map[3],
        map[6],
        map[1],
        map[4],
        map[7],
        map[2],
        map[5],
        map[8],
      ]);
      gl.uniform1f(uniforms.height, height);
      gl.uniform1f(uniforms.brightness, brightness);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      return gl.getError() === gl.NO_ERROR;
    },
  };
}

function linkProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const program = gl.createProgram();
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

  if (!program || !vertex || !fragment) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);

  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}
