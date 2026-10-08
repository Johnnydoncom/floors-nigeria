/**
 * Preparing visualizer textures: straightening, even light, seamless repeats.
 *
 * Run with `npm run test:visualizer`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  evenLighting,
  makeSeamless,
  outputSide,
  rectify,
} from "../src/lib/visualizer/texture-prep.ts";

function image(width, height, fill) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fill(x, y);
      data.set([r, g, b, 255], (y * width + x) * 4);
    }
  }
  return { data, width, height };
}

const at = (pixels, x, y, channel = 0) => pixels.data[(y * pixels.width + x) * 4 + channel];

test("straightening an axis-aligned square reproduces it", () => {
  const source = image(100, 100, (x, y) => [x * 2, y * 2, 0]);
  const quad = [
    { x: 20, y: 20 },
    { x: 80, y: 20 },
    { x: 80, y: 80 },
    { x: 20, y: 80 },
  ];
  const out = rectify(source, quad, 60);

  assert.equal(out.width, 60);
  // Output pixel i samples source x = 20 + i (+ the half-pixel centres).
  for (const i of [0, 15, 30, 59]) {
    assert.ok(Math.abs(at(out, i, 30, 0) - (20 + i) * 2) <= 2, `column ${i}: ${at(out, i, 30, 0)}`);
    assert.ok(Math.abs(at(out, 30, i, 1) - (20 + i) * 2) <= 2, `row ${i}`);
  }
});

test("a floor photographed at an angle comes out with straight, evenly spaced lines", () => {
  // Stripes every 10 units on the floor, photographed as a trapezoid: the far
  // edge (top) narrower than the near edge.
  const quad = [
    { x: 30, y: 10 },
    { x: 70, y: 10 },
    { x: 95, y: 90 },
    { x: 5, y: 90 },
  ];
  // Paint the source by mapping each pixel back onto the floor.
  const toFloor = (x, y) => {
    const v = (y - 10) / 80;
    const left = 30 + (5 - 30) * v;
    const right = 70 + (95 - 70) * v;
    return (x - left) / (right - left);
  };
  const source = image(100, 100, (x, y) => {
    const u = toFloor(x, y);
    return [u >= 0 && u <= 1 && Math.floor(u * 10) % 2 === 0 ? 255 : 0, 0, 0];
  });

  const out = rectify(source, quad, 100);

  // The same column is the same stripe in every row: lines are vertical.
  let mismatches = 0;
  for (let x = 2; x < 98; x++) {
    if (x % 10 <= 1 || x % 10 >= 9) continue; // skip stripe edges, at multiples of 10
    const top = at(out, x, 10) > 127;
    const bottom = at(out, x, 90) > 127;
    if (top !== bottom) mismatches++;
  }
  assert.ok(mismatches <= 2, `${mismatches} columns change stripe between top and bottom`);
});

test("even lighting flattens a gradient across the texture", () => {
  // Brighter towards a window on the right, well within the gain limits.
  const lit = image(64, 64, (x) => [100 + x, 100 + x, 100 + x]);
  // The illumination estimate is the gradient itself.
  const out = evenLighting(lit, lit);
  const left = at(out, 2, 32);
  const right = at(out, 61, 32);

  assert.ok(Math.abs(left - right) < 8, `left ${left}, right ${right}`);
});

test("a seamless tile flows from its last column into its first", () => {
  // A ramp has the worst possible seam: its ends are as far apart as it gets.
  const ramp = image(100, 100, (x, y) => [x * 2.5, y * 2.5, 128]);
  const tile = makeSeamless(ramp, 0.2);

  assert.equal(tile.width, 80);
  assert.equal(tile.height, 80);

  // Across the wrap, neighbouring pixels differ no more than inside the tile.
  const wrapX = Math.abs(at(tile, tile.width - 1, 40, 0) - at(tile, 0, 40, 0));
  const wrapY = Math.abs(at(tile, 40, tile.height - 1, 1) - at(tile, 40, 0, 1));
  const inside = Math.abs(at(tile, 41, 40, 0) - at(tile, 40, 40, 0));

  assert.ok(wrapX <= inside + 4, `horizontal seam ${wrapX} against ${inside}`);
  assert.ok(wrapY <= inside + 4, `vertical seam ${wrapY}`);

  // Whereas the untreated ramp jumps the whole range.
  assert.ok(Math.abs(at(ramp, 99, 40) - at(ramp, 0, 40)) > 200);
});

test("the export size follows the marked patch, within the API's limits", () => {
  const small = [
    { x: 0, y: 0 },
    { x: 300, y: 0 },
    { x: 300, y: 300 },
    { x: 0, y: 300 },
  ];
  const large = small.map((point) => ({ x: point.x * 10, y: point.y * 10 }));

  assert.equal(outputSide(small), 768);
  assert.equal(outputSide(large), 2048);
});
