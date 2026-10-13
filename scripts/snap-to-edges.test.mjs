/**
 * Moving the floor's junction with walls and furniture onto the photograph's
 * own edge. The model's boundary is a blob several pixels either side of the
 * skirting line; these check that the line wins, in both directions, and that
 * a chair leg is not flooded over on the way.
 *
 * Run with `npm run test:visualizer`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { snapToEdges } from "../src/lib/visualizer/snap-to-edges.ts";

const WIDTH = 400;
const HEIGHT = 200;
/** Where the skirting meets the floor in the photograph. */
const SKIRTING = 100;

const WOOD = [140, 95, 60];
const WALL = [235, 232, 226];
const LEG = [25, 25, 28];

/** A wall above a wooden floor, with a few grain lines, and anything painted over it. */
function photograph(paint = () => null) {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const grain = y >= SKIRTING && x % 37 === 0 ? -12 : 0;
      const colour = paint(x, y) ?? (y < SKIRTING ? WALL : WOOD.map((value) => value + grain));
      data.set([...colour, 255], (y * WIDTH + x) * 4);
    }
  }

  return { data, width: WIDTH, height: HEIGHT };
}

/** The model's view: floor below `junction`, wall above, things where `isThing` says. */
function scene(junction, isThing = () => false) {
  const floor = new Uint8Array(WIDTH * HEIGHT);
  const structure = new Uint8Array(WIDTH * HEIGHT);
  const occluder = new Uint8Array(WIDTH * HEIGHT);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const index = y * WIDTH + x;
      if (isThing(x, y)) occluder[index] = 1;
      else if (y >= junction) floor[index] = 1;
      else structure[index] = 1;
    }
  }

  return { width: WIDTH, height: HEIGHT, floor, structure, occluder };
}

/** The first floor row in a column. */
function floorStarts(mask, x) {
  for (let y = 0; y < HEIGHT; y++) if (mask[y * WIDTH + x] === 1) return y;
  return HEIGHT;
}

test("a strip of floor the model gave to the wall is given back", () => {
  // The model stopped six pixels short of the skirting: the old floor showed
  // through as a strip along every wall.
  const snapped = snapToEdges(scene(SKIRTING + 6), photograph());

  for (const x of [20, 200, 380]) {
    assert.ok(Math.abs(floorStarts(snapped.floor, x) - SKIRTING) <= 1, `column ${x}`);
  }

  assert.equal(snapped.structure[(SKIRTING + 3) * WIDTH + 200], 0);
});

test("floor the model ran up the wall is taken back", () => {
  const snapped = snapToEdges(scene(SKIRTING - 6), photograph());

  for (const x of [20, 200, 380]) {
    assert.ok(Math.abs(floorStarts(snapped.floor, x) - SKIRTING) <= 1, `column ${x}`);
  }
});

test("the junction lands on the skirting, not on a plank seam", () => {
  // A seam across the floor near the wall is an edge too, but a far weaker one.
  const seam = SKIRTING + 4;
  const photo = photograph((x, y) => (y === seam ? WOOD.map((value) => value - 20) : null));
  const snapped = snapToEdges(scene(SKIRTING + 8), photo);

  assert.ok(Math.abs(floorStarts(snapped.floor, 200) - SKIRTING) <= 1);
});

test("a chair leg standing in the band is not floored over", () => {
  const isLeg = (x, y) => x >= 200 && x < 204 && y >= SKIRTING + 2 && y < SKIRTING + 40;
  const photo = photograph((x, y) => (isLeg(x, y) ? LEG : null));
  const snapped = snapToEdges(scene(SKIRTING + 6, isLeg), photo);

  assert.equal(snapped.floor[(SKIRTING + 20) * WIDTH + 201], 0, "floor laid over the leg");
  assert.equal(snapped.occluder[(SKIRTING + 20) * WIDTH + 201], 1);
});

test("nothing to snap is left exactly as it was", () => {
  const input = scene(HEIGHT);
  assert.equal(snapToEdges(input, photograph()), input);
});
