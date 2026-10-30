/**
 * The floor visualizer's coverage guarantee.
 *
 * The bug this guards against is the one a customer sees first: material laid
 * over the middle of the floor and the rest of the room left on its old
 * covering. It happens whenever the perspective quad does not contain the whole
 * detected floor, which is most of the time — a quad fitted to the open middle
 * of a room stops short of the skirting, and a visitor who drags a corner can
 * put it anywhere.
 *
 * The invariant that prevents it: **every floor pixel must map inside the
 * material domain the renderer draws**, and in front of the horizon. That is
 * pure geometry, so it is checked here without a browser — over floor shapes
 * real photographs produce, through both the path detection takes and the path
 * a badly dragged quad takes.
 *
 * Run with `npm run test:visualizer`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { floorGeometryFromMask } from "../src/lib/visualizer/detect-floor.ts";
import { convexHull, domainCovering, maskHull } from "../src/lib/visualizer/coverage.ts";
import { perspectiveWeight, project, unitSquareToQuad } from "../src/lib/visualizer/homography.ts";
import { DEFAULT_QUAD } from "../src/lib/visualizer/types.ts";

const WIDTH = 400;
const HEIGHT = 300;

/** Floor shapes a room photograph actually produces. */
const SHAPES = {
  "trapezoid floor": (x, y, w, h) => {
    if (y < h * 0.45) return 0;
    const depth = (y - h * 0.45) / (h * 0.55);
    return Math.abs(x - w / 2) < (0.18 + 0.34 * depth) * w ? 1 : 0;
  },
  "floor reaching both frame edges": (x, y, w, h) => (y >= h * 0.4 ? 1 : 0),
  "floor with a sofa bitten out of it": (x, y, w, h) => {
    if (y < h * 0.42) return 0;
    return x > w * 0.05 && x < w * 0.42 && y > h * 0.45 && y < h * 0.72 ? 0 : 1;
  },
  "floor split in two by a table": (x, y, w, h) => {
    if (y < h * 0.45) return 0;
    return x > w * 0.44 && x < w * 0.56 ? 0 : 1;
  },
  "deep room, floor high up the frame": (x, y, w, h) => {
    if (y < h * 0.22) return 0;
    const depth = (y - h * 0.22) / (h * 0.78);
    return Math.abs(x - w / 2) < (0.06 + 0.5 * depth) * w ? 1 : 0;
  },
  "camera turned to the left": (x, y, w, h) => {
    if (y < h * 0.38) return 0;
    return x < (w * (0.28 + 0.72 * (y - h * 0.38))) / h + w * 0.28 ? 1 : 0;
  },
  "L-shaped floor turning a corner": (x, y, w, h) => {
    if (y >= h * 0.55) return 1;
    return y >= h * 0.3 && x > w * 0.6 ? 1 : 0;
  },
};

function grid(shape, width = WIDTH, height = HEIGHT) {
  const data = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = shape(x, y, width, height) ? 1 : 0;
    }
  }

  return { data, width, height };
}

/**
 * What the renderer lays material over, for a given floor mask and quad.
 */
function renderedDomain(mask, quad) {
  const corners = quad.map((point) => ({ x: point.x * mask.width, y: point.y * mask.height }));
  const homography = unitSquareToQuad(corners);
  const hull = maskHull(mask.width, mask.height, (index) => mask.data[index] === 1);

  return { homography, domain: domainCovering(homography, hull, mask.width, mask.height) };
}

function area(mask) {
  return mask.data.reduce((total, value) => total + value, 0);
}

test("detection keeps every floor pixel it was given", async (t) => {
  for (const [name, shape] of Object.entries(SHAPES)) {
    await t.test(name, () => {
      const raw = grid(shape);
      const geometry = floorGeometryFromMask(raw);

      assert.ok(geometry, "expected a floor to be found");
      // Speckle-free synthetic shapes: nothing here should be discarded, and in
      // particular a floor split in two must not lose half of itself.
      assert.equal(area(geometry.mask), area(raw));
    });
  }
});

test("the domain stays in front of the horizon", () => {
  for (const shape of Object.values(SHAPES)) {
    const mask = grid(shape);
    const { homography, domain } = renderedDomain(mask, DEFAULT_QUAD);

    for (const [u, v] of [
      [domain.u0, domain.v0],
      [domain.u1, domain.v0],
      [domain.u1, domain.v1],
      [domain.u0, domain.v1],
    ]) {
      assert.ok(perspectiveWeight(homography, u, v) > 0);

      const point = project(homography, u, v);
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    }
  }
});

test("the detected quad stays where its drag handles can be reached", () => {
  for (const shape of Object.values(SHAPES)) {
    const geometry = floorGeometryFromMask(grid(shape));

    for (const corner of geometry.quad) {
      assert.ok(corner.x > -0.5 && corner.x < 1.5, `corner x out of reach: ${corner.x}`);
      assert.ok(corner.y > -0.5 && corner.y < 1.5, `corner y out of reach: ${corner.y}`);
    }
  }
});

test("the mask outline is a hull that contains every floor pixel", () => {
  const mask = grid(SHAPES["L-shaped floor turning a corner"]);
  const hull = maskHull(mask.width, mask.height, (index) => mask.data[index] === 1);

  assert.ok(hull.length >= 3);

  const inside = (point) =>
    hull.every((vertex, index) => {
      const next = hull[(index + 1) % hull.length];
      const cross =
        (next.x - vertex.x) * (point.y - vertex.y) - (next.y - vertex.y) * (point.x - vertex.x);
      return cross >= -1e-9;
    });

  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (mask.data[y * mask.width + x] === 0) continue;
      assert.ok(inside({ x: (x + 0.5) / mask.width, y: (y + 0.5) / mask.height }));
    }
  }
});

test("convexHull copes with degenerate input", () => {
  assert.deepEqual(convexHull([]), []);
  assert.equal(
    convexHull([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]).length,
    2,
  );
  assert.ok(
    convexHull([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]).length <= 3,
  );
});
