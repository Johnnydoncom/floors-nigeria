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
  isRugLabel,
  isStructureLabel,
  sceneFromLogits,
} from "../src/lib/visualizer/floor-mask.ts";
import {
  perspectiveWeight,
  unitSquareToQuad,
  unproject,
} from "../src/lib/visualizer/homography.ts";
import { floorGeometryFromMask, modelInputSize } from "../src/lib/visualizer/detect-floor.ts";

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
  for (const label of ["floor", "Floor", "floor;flooring"]) {
    assert.ok(isFloorLabel(label), label);
  }

  // A rug may be the floor or lie on it, so it is neither until the photo says.
  for (const label of ["rug", "rug;carpet;carpeting", "mat"]) {
    assert.ok(isRugLabel(label), label);
    assert.ok(!isFloorLabel(label) && !isOccluderLabel(label), label);
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

test("an area rug lying on the floor keeps its own surface", () => {
  // The model rarely recognises all of a rug, so covering what it does
  // recognise leaves the rest standing as a remnant in the middle of the room.
  const rug = [0.35, 0.6, 0.65, 0.85];
  const scene = classifyScene([
    segment("floor", [[0, 0.4, 1, 1]], [rug]),
    segment("wall", [[0, 0, 1, 0.4]]),
    segment("rug;carpet;carpeting", [rug]),
  ]);

  assert.ok(scene);

  const clean = cleanFloorMask(scene);

  assert.equal(at(clean, 0.5, 0.72), 0, "material laid over the rug");
  assert.equal(at(clean, 0.2, 0.8), 1);
});

test("a fitted carpet is the floor", () => {
  const scene = classifyScene([
    segment("rug;carpet;carpeting", [[0, 0.4, 1, 1]], [[0.8, 0.9, 1, 1]]),
    segment("floor", [[0.8, 0.9, 1, 1]]),
    segment("wall", [[0, 0, 1, 0.4]]),
  ]);

  assert.ok(scene);
  assert.equal(at(cleanFloorMask(scene), 0.5, 0.7), 1, "the carpet was left uncovered");
});

/**
 * Class scores for a grid of cells, class-major as the model returns them,
 * from each cell's probabilities.
 */
function logits(columns, rows, probabilities) {
  const classes = probabilities(0, 0).length;
  const data = new Float32Array(classes * columns * rows);

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const shares = probabilities(column, row);

      shares.forEach((share, index) => {
        data[index * columns * rows + row * columns + column] = Math.log(share);
      });
    }
  }

  return { data, classes, width: columns, height: rows };
}

test("furniture the model splits between two names still outweighs the floor", () => {
  // Floor is the likeliest single class here, which is how the front of a sofa
  // ended up under new flooring. Together, the furniture is likelier.
  const scene = sceneFromLogits(
    logits(4, 4, (column, row) => (row < 2 ? [0.95, 0.03, 0.02] : [0.45, 0.3, 0.25])),
    ["floor", "sofa", "armchair"],
    16,
    16,
  );

  assert.ok(scene);
  assert.equal(scene.floor[2 * 16 + 8], 1, "open floor lost");
  assert.equal(scene.floor[14 * 16 + 8], 0, "material laid on the sofa");
  assert.equal(scene.occluder[14 * 16 + 8], 1);
});

test("the boundary falls between the model's cells, not on them", () => {
  // Floor on the left two cells, wall on the right two; at four photo pixels
  // per cell the edge lands midway, where the scores cross.
  const scene = sceneFromLogits(
    logits(4, 1, (column) => (column < 2 ? [0.9, 0.1] : [0.1, 0.9])),
    ["floor", "wall"],
    16,
    1,
  );

  assert.ok(scene);
  assert.deepEqual([...scene.floor], [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(scene.structure[12], 1);
});

test("scores decide a rug the same way a label map does", () => {
  const rugCells = (column, row) => column >= 2 && column < 4 && row >= 2 && row < 4;

  const areaRug = sceneFromLogits(
    logits(6, 6, (column, row) => (rugCells(column, row) ? [0.2, 0.7, 0.1] : [0.9, 0.05, 0.05])),
    ["floor", "rug", "wall"],
    6,
    6,
  );

  assert.ok(areaRug);
  assert.equal(areaRug.floor[3 * 6 + 3], 0, "material laid over an area rug");
  assert.equal(areaRug.occluder[3 * 6 + 3], 1);

  const carpet = sceneFromLogits(
    logits(6, 6, () => [0.1, 0.8, 0.1]),
    ["floor", "rug", "wall"],
    6,
    6,
  );

  assert.ok(carpet);
  assert.equal(carpet.floor[3 * 6 + 3], 1, "a fitted carpet left uncovered");
});

test("no floor anywhere is no floor", () => {
  assert.equal(
    sceneFromLogits(
      logits(2, 2, () => [0.1, 0.9]),
      ["floor", "wall"],
      4,
      4,
    ),
    null,
  );
});

test("the model sees the photograph in its own proportions", () => {
  // The stock pipeline squashed every photo to 512 square, narrowing a
  // landscape room by a third before the model saw it.
  for (const [width, height] of [
    [1920, 1200],
    [1600, 1100],
    [3024, 4032],
    [800, 800],
  ]) {
    const size = modelInputSize(width, height);

    assert.equal(Math.max(size.width, size.height), 768, `${width}×${height}`);
    assert.equal(size.width % 32, 0);
    assert.equal(size.height % 32, 0);
    assert.ok(Math.abs(size.width / size.height - width / height) < 0.06, `${width}×${height}`);
  }
});

test("pockets of floor seen between furniture legs are kept", () => {
  // Each is far below the size a separate patch of floor must reach, and the
  // model is sure of every one; dropping them left the old floor under a table.
  const mask = floorMask([
    [0, 0.45, 1, 0.5],
    [0, 0.5, 0.3, 1],
    [0.7, 0.5, 1, 1],
    [0, 0.9, 1, 1],
    [0.4, 0.6, 0.43, 0.64], // between the legs of a table
    [0.55, 0.7, 0.58, 0.74],
  ]);

  const geometry = floorGeometryFromMask(mask);

  assert.ok(geometry);
  assert.equal(at(geometry.mask, 0.415, 0.62), 1, "pocket under the table dropped");
  assert.equal(at(geometry.mask, 0.565, 0.72), 1, "pocket under the table dropped");
});

test("a pocket of floor-coloured wall above the floor is still not floor", () => {
  const mask = floorMask([
    [0, 0.5, 1, 1],
    [0.4, 0.2, 0.43, 0.24], // well above the floor's far edge
  ]);

  const geometry = floorGeometryFromMask(mask);

  assert.ok(geometry);
  assert.equal(at(geometry.mask, 0.415, 0.22), 0);
});
