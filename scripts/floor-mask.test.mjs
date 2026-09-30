/**
 * Turning a label map into a floor mask worth rendering.
 *
 * Two faults are visible in any photograph of a real room, and both were
 * reported from one: material running up a wall and over a staircase, and bare
 * patches left in the middle of the floor. Neither is a coverage problem —
 * material reaches everywhere the mask says — so both are checked here, against
 * the mistakes a segmentation model actually makes.
 *
 * Run with `npm run test:visualizer`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyScene,
  cleanFloorMask,
  isFloorLabel,
  isOccluderLabel,
  isStructureLabel,
} from "../src/lib/visualizer/floor-mask.ts";
import {
  perspectiveWeight,
  unitSquareToQuad,
  unproject,
} from "../src/lib/visualizer/homography.ts";
import { floorGeometryFromMask } from "../src/lib/visualizer/detect-floor.ts";

const WIDTH = 240;
const HEIGHT = 180;

/**
 * One class mask, as the model returns them.
 *
 * `holes` are cut back out, because a semantic segmentation gives every pixel
 * exactly one label: what the sofa owns, the floor does not.
 */
function segment(label, boxes, holes = []) {
  const data = new Uint8Array(WIDTH * HEIGHT);

  const paint = (rects, value) => {
    for (const [x0, y0, x1, y1] of rects) {
      for (let y = Math.round(y0 * HEIGHT); y < Math.round(y1 * HEIGHT); y++) {
        for (let x = Math.round(x0 * WIDTH); x < Math.round(x1 * WIDTH); x++) {
          data[y * WIDTH + x] = value;
        }
      }
    }
  };

  paint(boxes, 255);
  paint(holes, 0);

  return { label, mask: { data, width: WIDTH, height: HEIGHT } };
}

function count(mask) {
  return mask.data.reduce((total, value) => total + value, 0);
}

function at(mask, x, y) {
  return mask.data[Math.round(y * HEIGHT) * WIDTH + Math.round(x * WIDTH)];
}

test("labels are matched through either naming convention", () => {
  for (const label of ["floor", "Floor", "floor;flooring", "rug;carpet;carpeting"]) {
    assert.ok(isFloorLabel(label), label);
  }

  for (const label of ["wall", "stairs;steps", "windowpane;window", "painting;picture"]) {
    assert.ok(isStructureLabel(label), label);
  }

  // Everything that is neither is something in the room, whatever it is
  // called. Listing furniture instead was tried and lays floor over whatever
  // the list happens to miss.
  for (const label of ["sofa;couch;lounge", "table", "pot;flowerpot", "sand", "blanket;cover"]) {
    assert.ok(isOccluderLabel(label), label);
    assert.ok(!isFloorLabel(label) && !isStructureLabel(label), label);
  }
});

test("a scene with no floor class is not a floor", () => {
  assert.equal(classifyScene([segment("wall", [[0, 0, 1, 1]])]), null);
});

test("the floor stands clear of the wall rather than stopping exactly at it", () => {
  const scene = classifyScene([
    segment("floor", [[0, 0.5, 1, 1]]),
    segment("wall", [[0, 0, 1, 0.5]]),
  ]);

  assert.ok(scene);

  const clean = cleanFloorMask(scene);

  // A hairline of the old floor along the skirting is invisible; material a
  // hairline up the wall is the first thing anyone sees.
  assert.equal(at(clean, 0.5, 0.502), 0, "material laid right against the wall");
  assert.equal(at(clean, 0.5, 0.7), 1);
  assert.equal(at(clean, 0.5, 0.99), 1);
});

test("a class that cannot be a floor wins where the two overlap", () => {
  // Semantic segmentation gives each pixel one label, so this does not arise
  // from the model — but a mask that arrives overlapping must not put material
  // on a staircase.
  const scene = classifyScene([
    segment("floor", [[0, 0.35, 1, 1]]),
    segment("stairs", [[0, 0.35, 0.2, 0.75]]),
  ]);

  assert.ok(scene);
  assert.equal(at(cleanFloorMask(scene), 0.08, 0.5), 0, "material left on the staircase");
});

test("a hole the model could not place is filled back in", () => {
  // A rug, a pool of sunlight, a reflection: labelled something that cannot lie
  // in a floor, ringed by floor, and left bare in the middle of the room.
  const hole = [0.35, 0.6, 0.6, 0.8];
  const scene = classifyScene([
    segment("floor", [[0, 0.4, 1, 1]], [hole]),
    segment("wall", [[0, 0, 1, 0.4], hole]),
  ]);

  assert.ok(scene);
  assert.equal(at(cleanFloorMask(scene), 0.47, 0.7), 1, "hole not filled");
});

test("a hole with something standing in it is left alone", () => {
  const sofa = [0.35, 0.6, 0.6, 0.8];
  const scene = classifyScene([
    segment("floor", [[0, 0.4, 1, 1]], [sofa]),
    segment("wall", [[0, 0, 1, 0.4]]),
    segment("sofa", [sofa]),
  ]);

  assert.ok(scene);
  assert.equal(at(cleanFloorMask(scene), 0.47, 0.7), 0, "material laid over the sofa");
});

test("a pocket that reaches the frame is the rest of the room, not a hole", () => {
  const scene = classifyScene([
    segment("floor", [[0.3, 0.4, 1, 1]]),
    segment("wall", [
      [0, 0, 1, 0.4],
      [0, 0.4, 0.3, 1],
    ]),
  ]);

  assert.ok(scene);
  assert.equal(at(cleanFloorMask(scene), 0.1, 0.7), 0);
});

/** A binary floor mask straight from rectangles, for the patch tests. */
function floorMask(boxes) {
  const data = new Uint8Array(WIDTH * HEIGHT);

  for (const [x0, y0, x1, y1] of boxes) {
    for (let y = Math.round(y0 * HEIGHT); y < Math.round(y1 * HEIGHT); y++) {
      for (let x = Math.round(x0 * WIDTH); x < Math.round(x1 * WIDTH); x++) {
        data[y * WIDTH + x] = 1;
      }
    }
  }

  return { data, width: WIDTH, height: HEIGHT };
}

test("a wood-toned door or picture high on the wall is not a second floor", () => {
  // Both are large enough to pass any size threshold, and both begin further
  // away than the floor ever reaches.
  const mask = floorMask([
    [0, 0.45, 1, 1], // the floor
    [0.3, 0.03, 0.45, 0.3], // a panelled door
    [0.6, 0.02, 0.85, 0.22], // a framed picture
  ]);

  const geometry = floorGeometryFromMask(mask);

  assert.ok(geometry);
  assert.equal(at(geometry.mask, 0.37, 0.15), 0, "door taken for floor");
  assert.equal(at(geometry.mask, 0.72, 0.1), 0, "picture taken for floor");
  assert.equal(at(geometry.mask, 0.5, 0.8), 1);
});

test("a floor cut in two at floor level keeps both halves", () => {
  const mask = floorMask([
    [0, 0.45, 0.44, 1],
    [0.56, 0.45, 1, 1],
  ]);

  const geometry = floorGeometryFromMask(mask);

  assert.ok(geometry);
  assert.equal(at(geometry.mask, 0.2, 0.8), 1);
  assert.equal(at(geometry.mask, 0.8, 0.8), 1, "second half of the floor lost");
  assert.ok(count(geometry.mask) > 0.35 * WIDTH * HEIGHT);
});

test("a patch just past an obstruction is still the same floor", () => {
  // Slightly further away than the main floor reaches, but only slightly, and
  // it comes down into it — a strip of floor beyond a kitchen island.
  const mask = floorMask([
    [0, 0.5, 1, 1],
    [0.3, 0.47, 0.7, 0.5],
  ]);

  const geometry = floorGeometryFromMask(mask);

  assert.ok(geometry);
  assert.equal(at(geometry.mask, 0.5, 0.485), 1, "floor past an obstruction lost");
});

test("a silhouette does not say whether a thing is lying down", () => {
  // Why the pile of things in the room is a denylist and not a list of
  // furniture: over the same floor plane, a rug and a footstool measure the
  // same. Mapping a thing back onto the floor and keeping what could be lying
  // in it was tried, and this is the measurement that retired it.
  const quad = [
    { x: 0.2, y: 0.42 },
    { x: 0.8, y: 0.42 },
    { x: 1.05, y: 1 },
    { x: -0.05, y: 1 },
  ];
  const homography = unitSquareToQuad(
    quad.map((point) => ({ x: point.x * WIDTH, y: point.y * HEIGHT })),
  );
  const toMaterial = unproject(homography);

  const depthToWidth = (belongs) => {
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;

    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        if (!belongs(x, y)) continue;
        const m = toMaterial(x + 0.5, y + 0.5);
        if (!m || perspectiveWeight(homography, m.x, m.y) <= 0) continue;
        minU = Math.min(minU, m.x);
        maxU = Math.max(maxU, m.x);
        minV = Math.min(minV, m.y);
        maxV = Math.max(maxV, m.y);
      }
    }

    return (maxV - minV) / (maxU - minU);
  };

  // A rug: a rectangle of the floor plane itself.
  const rug = depthToWidth((x, y) => {
    const m = toMaterial(x + 0.5, y + 0.5);
    return (
      m &&
      perspectiveWeight(homography, m.x, m.y) > 0 &&
      m.x > 0.2 &&
      m.x < 0.8 &&
      m.y > 0.45 &&
      m.y < 0.95
    );
  });

  // A footstool: base on that floor, body rising out of it.
  const stool = depthToWidth(
    (x, y) =>
      x >= WIDTH * 0.55 && x < WIDTH * 0.75 && y >= HEIGHT * 0.5 && y <= Math.round(HEIGHT * 0.7),
  );

  assert.ok(rug > 0.7 && rug < 1, `rug measured ${rug}`);
  assert.ok(stool > 1 && stool < 1.6, `footstool measured ${stool}`);
  assert.ok(stool - rug < 0.6, "the two are too close to separate on geometry alone");
});

test("a gap inside a piece of furniture is not floor", () => {
  // Nothing here reaches the floor, so nothing here is given back to it.
  const sofa = [0.3, 0.5, 0.75, 0.8];
  const gap = [0.45, 0.6, 0.55, 0.7];

  const scene = classifyScene([
    segment("floor", [[0, 0.4, 1, 1]], [sofa]),
    segment("wall", [[0, 0, 1, 0.4]]),
    segment("sofa", [sofa], [gap]),
  ]);

  assert.ok(scene);
  assert.equal(at(cleanFloorMask(scene), 0.5, 0.65), 0, "material laid inside the sofa");
});
