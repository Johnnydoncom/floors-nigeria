/**
 * Laying patterns and true plank proportions.
 *
 * Two guarantees, both pure geometry:
 *
 * 1. **Every layout tiles.** Each period, repeated by plain translation, must
 *    cover the floor exactly once — a gap shows the old floor through the new
 *    one, an overlap draws a plank over its neighbour. Checked by sampling the
 *    period and counting the planks over each point, wrap-around included.
 *
 * 2. **Planks keep their shape in perspective.** The quad maps the unit square
 *    to a rectangle on the floor that is rarely square; `planeAspect` recovers
 *    how deep it really is so a plank is not squashed along the room. Checked
 *    against a synthetic pinhole camera photographing floors of known size.
 *
 * Run with `npm run test:visualizer`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { patternPeriod, wrapOffsets } from "../src/lib/visualizer/patterns.ts";
import {
  planeAspect,
  unitSquareToQuad,
  ASSUMED_FOCAL_SHARE,
} from "../src/lib/visualizer/homography.ts";

/** How many planks cover a point, counting each plank's wrapped copies. */
function coverAt(period, x, y) {
  let count = 0;

  for (const plank of period.planks) {
    for (const { dx, dy } of wrapOffsets(plank, period)) {
      const left = plank.x + dx;
      const top = plank.y + dy;

      if (x > left && x < left + plank.w && y > top && y < top + plank.h) count++;
    }
  }

  return count;
}

const CASES = [
  ["staggered", "plank", 1.22, 0.183],
  ["straight", "plank", 1.22, 0.183],
  ["straight", "plank", 0.9, 0.15],
  ["herringbone", "plank", 0.6, 0.12],
  ["herringbone", "plank", 0.61, 0.1],
  ["diagonal", "plank", 1.22, 0.183],
  ["diagonal", "tile", 0.6, 0.6],
  ["grid", "tile", 0.6, 0.6],
  ["grid", "tile", 0.6, 0.3],
];

for (const [layout, kind, length, width] of CASES) {
  test(`${layout} ${kind} ${length}×${width}m covers every point exactly once`, () => {
    const period = patternPeriod(layout, kind, length, width);
    const steps = 97; // prime, so samples do not line up with joints

    assert.ok(period.planks.length > 0);

    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < steps; j++) {
        const x = ((i + 0.5) / steps) * period.width;
        const y = ((j + 0.5) / steps) * period.height;
        const count = coverAt(period, x, y);

        // A sample landing exactly on a joint is covered by neither side.
        if (count === 0 && onJoint(period, x, y)) continue;

        assert.equal(count, 1, `point (${x.toFixed(3)}, ${y.toFixed(3)}) covered ${count} times`);
      }
    }
  });
}

function onJoint(period, x, y) {
  const epsilon = 1e-9;

  return period.planks.some((plank) =>
    wrapOffsets(plank, period).some(({ dx, dy }) => {
      const left = plank.x + dx;
      const top = plank.y + dy;
      return (
        Math.abs(x - left) < epsilon ||
        Math.abs(x - left - plank.w) < epsilon ||
        Math.abs(y - top) < epsilon ||
        Math.abs(y - top - plank.h) < epsilon
      );
    }),
  );
}

test("herringbone is laid with planks of the requested width and a whole-number length", () => {
  const period = patternPeriod("herringbone", "plank", 0.61, 0.1);
  const horizontal = period.planks.find((plank) => !plank.vertical);

  assert.equal(horizontal.h, 0.1);
  assert.ok(Math.abs(horizontal.w - 0.6) < 1e-9, "0.61 rounds to six widths");
  assert.equal(period.baseRotation, 45);
});

test("the natural layout lays no joints", () => {
  assert.equal(patternPeriod("natural", "plank", 1.22, 0.183).planks.length, 0);
});

test("neighbouring rows of a random lay keep their end joints apart", () => {
  const period = patternPeriod("straight", "plank", 1, 0.2);
  const rows = new Map();

  for (const plank of period.planks) {
    const row = Math.round(plank.y / 0.2);
    const joint = ((plank.x % 1) + 1) % 1;
    rows.set(row, joint);
  }

  const count = rows.size;

  for (let row = 0; row < count; row++) {
    const a = rows.get(row);
    const b = rows.get((row + 1) % count);
    const gap = Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
    assert.ok(gap >= 0.15, `rows ${row} and ${row + 1} share a joint line (${gap.toFixed(2)})`);
  }
});

// --- True proportions ---------------------------------------------------------

const PHOTO = { width: 1600, height: 1200 };

/**
 * Photograph a floor rectangle `widthM` × `depthM` with a pinhole camera.
 * Returns the quad in pixels, clockwise from far-left, as the visualizer
 * stores it.
 */
function photographFloor({
  widthM,
  depthM,
  nearM = 1.2,
  offsetM = 0,
  heightM = 1.5,
  pitchDeg = 32,
  yawDeg = 0,
  focalShare = ASSUMED_FOCAL_SHARE,
}) {
  const focal = Math.max(PHOTO.width, PHOTO.height) * focalShare;
  const pitch = (pitchDeg * Math.PI) / 180;
  const yaw = (yawDeg * Math.PI) / 180;

  const toPixel = (X, Z) => {
    // Turn the world about the vertical axis for yaw, then pitch the camera down.
    const x = X * Math.cos(yaw) - Z * Math.sin(yaw);
    const z = X * Math.sin(yaw) + Z * Math.cos(yaw);
    const down = heightM * Math.cos(pitch) - z * Math.sin(pitch);
    const forward = heightM * Math.sin(pitch) + z * Math.cos(pitch);

    return {
      x: (focal * x) / forward + PHOTO.width / 2,
      y: (focal * down) / forward + PHOTO.height / 2,
    };
  };

  const left = offsetM - widthM / 2;
  const right = offsetM + widthM / 2;
  const near = nearM;
  const far = nearM + depthM;

  return [toPixel(left, far), toPixel(right, far), toPixel(right, near), toPixel(left, near)];
}

const aspectOf = (quad) => planeAspect(unitSquareToQuad(quad), PHOTO.width, PHOTO.height);

test("a square floor photographed straight on measures square", () => {
  const aspect = aspectOf(photographFloor({ widthM: 4, depthM: 4 }));
  assert.ok(Math.abs(aspect - 1) < 1e-6, `got ${aspect}`);
});

test("a deep floor measures deeper than it is wide, though it is drawn shorter", () => {
  const quad = photographFloor({ widthM: 4, depthM: 6 });
  const aspect = aspectOf(quad);

  // On screen the floor is far shorter than it is wide — foreshortening —
  // which is exactly why the unit square cannot be trusted to be square.
  const screenDepth = quad[3].y - quad[0].y;
  const screenWidth = quad[2].x - quad[3].x;
  assert.ok(screenDepth < screenWidth);

  assert.ok(Math.abs(aspect - 1.5) < 1e-6, `got ${aspect}`);
});

test("an angled, off-centre shot still recovers the floor's proportions", () => {
  const aspect = aspectOf(
    photographFloor({ widthM: 3, depthM: 5, offsetM: 0.8, yawDeg: 25, pitchDeg: 40 }),
  );
  assert.ok(Math.abs(aspect - 5 / 3) < 1e-6, `got ${aspect}`);
});

test("a wrong guess at the focal length only nudges the result", () => {
  for (const focalShare of [0.55, 0.85]) {
    const aspect = aspectOf(photographFloor({ widthM: 4, depthM: 4, focalShare }));
    assert.ok(Math.abs(aspect - 1) < 0.25, `focal ${focalShare}: got ${aspect}`);
  }
});

test("a degenerate quad falls back to square rather than to nonsense", () => {
  const collapsed = [
    { x: 100, y: 500 },
    { x: 100, y: 500 },
    { x: 100, y: 500 },
    { x: 100, y: 500 },
  ];
  const aspect = aspectOf(collapsed);
  assert.ok(Number.isFinite(aspect) && aspect >= 0.25 && aspect <= 4);
});
