/**
 * Every pixel gets material.
 *
 * The bug this guards against is the one a customer sees first: material over
 * the middle of the floor and the rest of the room on its old covering. The
 * renderer answers it by construction — it maps every photo pixel back to the
 * material — and these tests hold it to that, over the quads that used to leave
 * floor bare: ones nowhere near the floor, a camera turned hard to one side, a
 * horizon inside the frame. The fallback path is pure, so it can be run here;
 * the GPU path runs the same matrix.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { floorMap, rasterise, tileCoordinate } from "../src/lib/visualizer/floor-raster.ts";
import {
  floorWidthFromCamera,
  project,
  unitSquareToQuad,
  unproject,
} from "../src/lib/visualizer/homography.ts";

const WIDTH = 320;
const HEIGHT = 240;

const QUADS = {
  "a floor in the lower half": [
    { x: 90, y: 120 },
    { x: 230, y: 120 },
    { x: 320, y: 240 },
    { x: 0, y: 240 },
  ],
  "a small quad far from most of the floor": [
    { x: 150, y: 200 },
    { x: 170, y: 200 },
    { x: 175, y: 215 },
    { x: 145, y: 215 },
  ],
  "camera turned hard to one side": [
    { x: 20, y: 100 },
    { x: 130, y: 118 },
    { x: 310, y: 230 },
    { x: -60, y: 180 },
  ],
  "horizon inside the frame": [
    { x: 150, y: 96 },
    { x: 170, y: 96 },
    { x: 300, y: 200 },
    { x: 20, y: 200 },
  ],
  "seen square-on": [
    { x: 40, y: 30 },
    { x: 280, y: 30 },
    { x: 280, y: 210 },
    { x: 40, y: 210 },
  ],
  "corners dragged out of order": [
    { x: 230, y: 120 },
    { x: 90, y: 120 },
    { x: 0, y: 240 },
    { x: 320, y: 240 },
  ],
};

/** A 4×4 tile in mid tones, so a missing pixel (0,0,0) cannot pass as material. */
function levels() {
  const data = new Uint8ClampedArray(4 * 4 * 4);

  for (let index = 0; index < 16; index++) {
    data[index * 4] = 90 + index * 4;
    data[index * 4 + 1] = 120;
    data[index * 4 + 2] = 150;
    data[index * 4 + 3] = 255;
  }

  return [{ data, width: 4, height: 4 }];
}

function mapFor(quad, angle = 0) {
  const homography = unitSquareToQuad(quad);

  return {
    homography,
    map: floorMap(
      homography,
      { metres: { width: 4, depth: 5 }, angle, tileWidthM: 0.9, tileHeightM: 0.9, anchor: 0.5 },
      project(homography, 0.5, 0.5),
    ),
  };
}

test("every pixel of the photograph receives material", async (t) => {
  for (const [name, quad] of Object.entries(QUADS)) {
    await t.test(name, () => {
      const { map } = mapFor(quad, 0.4);
      const pixels = rasterise(map, WIDTH, HEIGHT, levels(), 1);

      for (let at = 0; at < pixels.length; at += 4) {
        assert.equal(pixels[at + 3], 255);
        assert.ok(pixels[at] >= 80 && pixels[at + 1] === 120, `pixel ${at / 4} is bare`);
      }
    });
  }
});

test("the divisor is positive on the floor, however the quad was wound", () => {
  for (const quad of Object.values(QUADS)) {
    const { homography, map } = mapFor(quad);
    const centre = project(homography, 0.5, 0.5);

    assert.ok(tileCoordinate(map, centre.x, centre.y), "the quad's middle must be in front");
  }
});

test("pixels past the horizon are refused rather than mirrored back", () => {
  const { map } = mapFor(QUADS["horizon inside the frame"]);

  assert.equal(tileCoordinate(map, 160, 0), null);
  assert.notEqual(tileCoordinate(map, 160, 200), null);
});

test("a tile coordinate is the material position, in repeats, about the anchor", () => {
  const { homography, map } = mapFor(QUADS["a floor in the lower half"]);
  const toMaterial = unproject(homography);

  for (const [x, y] of [
    [160, 200],
    [40, 230],
    [250, 150],
  ]) {
    const material = toMaterial(x, y);
    const tile = tileCoordinate(map, x, y);

    assert.ok(Math.abs(tile.x - ((material.x - 0.5) * 4) / 0.9) < 1e-6);
    assert.ok(Math.abs(tile.y - ((material.y - 0.5) * 5) / 0.9) < 1e-6);
  }
});

test("the lay angle turns the pattern in metres, not in the quad's own shape", () => {
  const { homography, map } = mapFor(QUADS["seen square-on"], Math.PI / 2);
  const toMaterial = unproject(homography);
  const material = toMaterial(100, 60);
  const tile = tileCoordinate(map, 100, 60);

  // A quarter turn swaps the axes in metres: 5m of depth along s, 4m of width along t.
  assert.ok(Math.abs(tile.x - ((material.y - 0.5) * 5) / 0.9) < 1e-6);
  assert.ok(Math.abs(tile.y - (-(material.x - 0.5) * 4) / 0.9) < 1e-6);
});

test("a straight line on the material stays straight in the photograph", () => {
  const { homography, map } = mapFor(QUADS["camera turned hard to one side"]);

  // Three collinear photo points map to three collinear tile points: a real
  // homography cannot bend a plank, a per-row approximation would.
  const points = [
    project(homography, 0.2, 0.3),
    project(homography, 0.5, 0.3),
    project(homography, 0.8, 0.3),
  ].map((point) => tileCoordinate(map, point.x, point.y));

  const [a, b, c] = points;
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

  assert.ok(Math.abs(cross) < 1e-6);
});

test("the far floor reads the coarse mip, so it averages instead of shimmering", () => {
  const coarse = { data: new Uint8ClampedArray([200, 120, 150, 255]), width: 1, height: 1 };
  const { map } = mapFor(QUADS["horizon inside the frame"]);
  const pixels = rasterise(map, WIDTH, HEIGHT, [...levels(), coarse], 1);

  // Just below the horizon, a pixel spans many repeats of the tile.
  const at = (98 * WIDTH + 160) * 4;

  assert.equal(pixels[at], 200);
});

test("a floor's real width is recovered from how high the camera was", () => {
  // A pinhole camera 1.4m up with the assumed focal length, looking down a
  // little, photographing a rectangle of known width lying on the floor.
  const width = 1600;
  const height = 1000;
  const focal = width * 0.7;

  for (const { tilt, turn, floorWidth, depth, near } of [
    { tilt: 0.08, turn: 0, floorWidth: 3, depth: 4, near: 2 },
    { tilt: 0.22, turn: 0.3, floorWidth: 6, depth: 5, near: 2.5 },
    { tilt: 0.3, turn: -0.5, floorWidth: 12, depth: 9, near: 3 },
  ]) {
    const photograph = (x, z) => {
      // World: x across, z away from the camera, y up, the camera at height 1.4.
      const cx = x * Math.cos(turn) - z * Math.sin(turn);
      const cz = x * Math.sin(turn) + z * Math.cos(turn);
      const cy = -1.4 * Math.cos(tilt) + cz * Math.sin(tilt);
      const forward = cz * Math.cos(tilt) + 1.4 * Math.sin(tilt);

      return {
        x: width / 2 + (focal * cx) / forward,
        y: height / 2 - (focal * cy) / forward,
      };
    };

    const half = floorWidth / 2;
    const quad = [
      photograph(-half, near + depth),
      photograph(half, near + depth),
      photograph(half, near),
      photograph(-half, near),
    ];
    const estimated = floorWidthFromCamera(unitSquareToQuad(quad), width, height);

    assert.ok(
      Math.abs(estimated - floorWidth) < floorWidth * 0.01,
      `expected ${floorWidth}m, got ${estimated}`,
    );
  }
});
