/**
 * Deciding the floor around and under furniture by colour, where chair legs
 * and the floor between them are finer than the model's cells.
 *
 * Run with `npm run test:visualizer`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { settleFurniture } from "../src/lib/visualizer/settle-furniture.ts";

const WIDTH = 600;
const HEIGHT = 200;

const WOOD = [170, 115, 70];
const SHADED_WOOD = [95, 62, 36];
// A neutral grey close to the shell's, as polished chrome reflecting a white chair is.
const CHROME = [175, 177, 180];
const SHELL = [225, 225, 222];

/**
 * A wooden floor with a white chair shell standing on it, a chrome leg below
 * the shell, and a patch of floor in the shade beside the leg.
 */
const SHELL_BOX = [100, 40, 200, 110];
const LEG_BOX = [148, 110, 153, 160];
// Touching the shell, as the model draws it: one piece with the chair.
const SHADE_BOX = [160, 110, 190, 135];

const inside = ([x0, y0, x1, y1], x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;

function photograph() {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const colour = inside(SHELL_BOX, x, y)
        ? SHELL
        : inside(LEG_BOX, x, y)
          ? CHROME
          : inside(SHADE_BOX, x, y)
            ? SHADED_WOOD
            : WOOD;
      data.set([...colour, 255], (y * WIDTH + x) * 4);
    }
  }

  return { data, width: WIDTH, height: HEIGHT };
}

/**
 * The model's view: it called the leg floor, and the shaded floor beside it
 * part of the chair.
 */
function scene() {
  const floor = new Uint8Array(WIDTH * HEIGHT);
  const occluder = new Uint8Array(WIDTH * HEIGHT);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const index = y * WIDTH + x;
      if (inside(SHELL_BOX, x, y) || inside(SHADE_BOX, x, y)) occluder[index] = 1;
      else floor[index] = 1;
    }
  }

  return { width: WIDTH, height: HEIGHT, floor, occluder };
}

const at = (mask, x, y) => mask[y * WIDTH + x];

test("a chrome leg the model called floor is given back to the chair", () => {
  const settled = settleFurniture(scene(), photograph());

  assert.equal(at(settled.floor, 150, 125), 0, "material laid on the leg");
  assert.equal(at(settled.occluder, 150, 125), 1);
});

test("shaded floor the model called chair is given to the floor", () => {
  const settled = settleFurniture(scene(), photograph());

  assert.equal(at(settled.floor, 175, 125), 1, "floor under the chair left bare");
});

test("the furniture itself and the open floor are left alone", () => {
  const settled = settleFurniture(scene(), photograph());

  assert.equal(at(settled.occluder, 150, 60), 1);
  assert.equal(at(settled.floor, 40, 180), 1);
});

test("wood furniture on a wood floor is left to the model", () => {
  // Same colour either side: nothing the colours can decide.
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let index = 0; index < WIDTH * HEIGHT; index++) data.set([...WOOD, 255], index * 4);

  const input = scene();
  const settled = settleFurniture(input, { data, width: WIDTH, height: HEIGHT });

  assert.deepEqual(settled.floor, input.floor);
});
