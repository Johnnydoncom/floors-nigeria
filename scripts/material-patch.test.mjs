/**
 * Finding the material in a product photograph, against the shots the catalogue
 * actually has: a tile cut out on white, a floor with a prop stood on it, and a
 * deck beside a swimming pool.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { findMaterialPatch } from "../src/lib/visualizer/material-patch.ts";

const SIZE = 96;

function photo(paint) {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b] = paint(x, y);
      const at = (y * SIZE + x) * 4;
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
      data[at + 3] = 255;
    }
  }

  return { data, width: SIZE, height: SIZE };
}

/** Whether every painted cell of a patch satisfies `isMaterial`. */
function patchHolds(patch, isMaterial) {
  for (let y = Math.ceil(patch.y * SIZE); y < (patch.y + patch.height) * SIZE - 1; y++) {
    for (let x = Math.ceil(patch.x * SIZE); x < (patch.x + patch.width) * SIZE - 1; x++) {
      if (!isMaterial(x, y)) return false;
    }
  }

  return true;
}

const OAK = [168, 124, 82];

/** A little grain, so the tests are not on flat colour. */
const grained = ([r, g, b], y) => {
  const tone = Math.sin(y * 1.7) * 9;
  return [r + tone, g + tone, b + tone];
};

test("a tile cut out on white stays inside the tile", () => {
  const inTile = (x, y) => Math.abs(x - 48) + Math.abs(y - 48) < 40;
  const patch = findMaterialPatch(
    photo((x, y) => (inTile(x, y) ? [214, 60, 52] : [255, 255, 255])),
  );

  assert.ok(patch, "expected a patch");
  assert.ok(patchHolds(patch, inTile), "the patch must not include the backdrop");
  assert.ok(patch.width * patch.height > 0.15);
});

test("a prop stood on the floor is stepped around", () => {
  const inVase = (x, y) => x > 30 && x < 52 && y > 6 && y < 38;
  const patch = findMaterialPatch(photo((x, y) => (inVase(x, y) ? [30, 40, 70] : grained(OAK, y))));

  assert.ok(patch);
  assert.ok(
    patchHolds(patch, (x, y) => !inVase(x, y)),
    "the patch must avoid the prop",
  );
  assert.ok(patch.width * patch.height > 0.3);
});

test("a deck beside a pool takes the deck, not the water", () => {
  const isDeck = (_, y) => y >= 42;
  const patch = findMaterialPatch(
    photo((x, y) => (isDeck(x, y) ? grained([120, 96, 76], y) : [40, 150, 225])),
  );

  assert.ok(patch);
  assert.ok(patchHolds(patch, isDeck), "the patch must be on the deck");
});

test("a whole-frame floor uses nearly all of it, within a sensible shape", () => {
  const patch = findMaterialPatch(photo((_, y) => grained(OAK, y)));

  assert.ok(patch);
  assert.ok(patch.width * patch.height > 0.8);
});

test("an oblong result is trimmed so it does not repeat as stripes", () => {
  const isStrip = (_, y) => y >= 76;
  const patch = findMaterialPatch(
    photo((x, y) => (isStrip(x, y) ? [120, 96, 76] : [255, 255, 255])),
  );

  if (patch) assert.ok(patch.width / patch.height <= 1.75);
});

test("a blank frame has no material to find", () => {
  assert.equal(findMaterialPatch(photo(() => [255, 255, 255])), null);
});
