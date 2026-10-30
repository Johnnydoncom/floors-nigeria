/**
 * Bakes the floor of each sample room once, so visitors never pay for it.
 *
 * A sample room is the same photograph for everyone, so running a model in the
 * browser to find its floor is work thrown away: this runs the precise model
 * here and ships the result, a mask of a few kilobytes and four corners.
 *
 *   node --import ./scripts/ts-loader.mjs scripts/bake-sample-floors.mjs
 *
 * Downloads the 28MB model to node_modules on first run. Run again when a sample
 * room is added or replaced, then look at the masks. These are the first floors
 * anyone sees, so `TOUCH_UPS` finishes by hand what the model left: polygons in
 * shares of the photo, drawn against a gridded zoom of it.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { analyseRoom, modelInputSize, REFINE_WIDTH } from "../src/lib/visualizer/detect-floor.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOMS = ["hero-living", "project-residence", "project-office", "project-hotel"];
const OUTPUT = path.join(ROOT, "public/images/rooms");
const PRESETS = path.join(ROOT, "src/lib/visualizer/sample-floors.json");

const TOUCH_UPS = {
  "hero-living": {
    add: [
      // Sunlit floor beside the rug, and in the hallway past the sofa.
      [
        [0.37, 0.668],
        [0.462, 0.668],
        [0.441, 0.755],
        [0.37, 0.755],
      ],
      [
        [0.39, 0.54],
        [0.43, 0.53],
        [0.433, 0.57],
        [0.4, 0.575],
      ],
      // The strip by the window, between the sofa and the armchair.
      [
        [0.895, 0.622],
        [0.955, 0.643],
        [0.948, 0.665],
        [0.9, 0.665],
        [0.888, 0.655],
      ],
    ],
  },
  "project-residence": {
    // The sliding door's threshold, then the foot of the pier.
    add: [
      [
        [0.762, 0.64],
        [0.87, 0.702],
        [0.871, 0.737],
        [0.9, 0.768],
        [0.7, 0.78],
        [0.7, 0.64],
      ],
    ],
    erase: [
      [
        [0.76, 0.6],
        [0.88, 0.6],
        [0.88, 0.7],
        [0.87, 0.7005],
        [0.762, 0.6385],
      ],
      [
        [0.871, 0.7],
        [0.9, 0.7],
        [0.9, 0.767],
        [0.895, 0.767],
        [0.869, 0.736],
      ],
    ],
  },
  "project-office": {
    add: [
      // Round the desk chair.
      [
        [0.095, 0.695],
        [0.095, 0.672],
        [0.13, 0.65],
        [0.154, 0.646],
        [0.154, 0.695],
      ],
      [
        [0.06, 0.683],
        [0.083, 0.68],
        [0.083, 0.69],
        [0.06, 0.69],
      ],
      [
        [0.042, 0.752],
        [0.062, 0.747],
        [0.062, 0.76],
        [0.042, 0.76],
      ],
      // Round the planter, through the glass.
      [
        [0.68, 0.62],
        [0.715, 0.625],
        [0.722, 0.66],
        [0.7, 0.655],
      ],
      [
        [0.722, 0.665],
        [0.738, 0.665],
        [0.742, 0.7],
        [0.748, 0.72],
        [0.725, 0.725],
        [0.722, 0.7],
      ],
      [
        [0.765, 0.738],
        [0.8, 0.737],
        [0.8, 0.755],
        [0.77, 0.755],
      ],
    ],
  },
};

function fillPolygon(data, width, height, polygon, value) {
  const points = polygon.map(([x, y]) => [x * width, y * height]);

  for (let y = 0; y < height; y++) {
    const crossings = [];

    points.forEach(([x0, y0], index) => {
      const [x1, y1] = points[(index + 1) % points.length];
      if (y0 <= y + 0.5 === y1 <= y + 0.5) return;
      crossings.push(x0 + ((y + 0.5 - y0) / (y1 - y0)) * (x1 - x0));
    });

    crossings.sort((a, b) => a - b);

    for (let pair = 0; pair + 1 < crossings.length; pair += 2) {
      for (let x = Math.ceil(crossings[pair]); x < crossings[pair + 1]; x++) {
        data[(y * width + x) * 4 + 3] = value;
      }
    }
  }
}

globalThis.ImageData ??= class ImageData {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
};

async function pixels(file, width, height) {
  const { data, info } = await sharp(file)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

await mkdir(OUTPUT, { recursive: true });

const presets = {};

for (const room of ROOMS) {
  const file = path.join(ROOT, `public/images/${room}.jpg`);
  const { width, height } = await sharp(file).metadata();
  const scale = Math.min(1, REFINE_WIDTH / width);
  const started = Date.now();

  const detection = await analyseRoom(
    {
      modelInput: await pixels(file, ...Object.values(modelInputSize(width, height))),
      photo: await pixels(file, Math.round(width * scale), Math.round(height * scale)),
    },
    undefined,
    "precise",
  );

  if (!detection) throw new Error(`No floor found in ${room}`);

  const { mask, quad } = detection;

  for (const polygon of TOUCH_UPS[room]?.add ?? []) {
    fillPolygon(mask.data, mask.width, mask.height, polygon, 255);
  }
  for (const polygon of TOUCH_UPS[room]?.erase ?? []) {
    fillPolygon(mask.data, mask.width, mask.height, polygon, 0);
  }

  const channel = Buffer.alloc(mask.width * mask.height);
  let floor = 0;

  for (let index = 0; index < channel.length; index++) {
    channel[index] = mask.data[index * 4 + 3];
    if (channel[index] > 0) floor++;
  }

  // Black, with the floor in the alpha channel, which is what the renderer
  // composites against. Quantised, so a two-colour image costs what it should.
  await sharp(Buffer.alloc(mask.width * mask.height * 3), {
    raw: { width: mask.width, height: mask.height, channels: 3 },
  })
    .joinChannel(channel, { raw: { width: mask.width, height: mask.height, channels: 1 } })
    .png({ palette: true, colours: 2, compressionLevel: 9 })
    .toFile(path.join(OUTPUT, `${room}.floor.png`));

  presets[`/images/${room}.jpg`] = {
    mask: `/images/rooms/${room}.floor.png`,
    quad: quad.map(({ x, y }) => ({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) })),
  };

  console.log(
    `${room}: ${Math.round((floor / channel.length) * 100)}% floor, ${Date.now() - started}ms`,
  );
}

await writeFile(PRESETS, `${JSON.stringify(presets, null, 2)}\n`);
