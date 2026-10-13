/**
 * Smart-select areas as saved with a design: run lengths that must survive a
 * round trip exactly, and saved data that must never be trusted blindly.
 *
 * Run with `npm run test:visualizer`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { decodeRuns, encodeRuns, isAreaRuns } from "../src/lib/visualizer/area-runs.ts";
import { parseMaskEdits } from "../src/lib/visualizer/mask-edits.ts";

test("an area survives encoding exactly", () => {
  const width = 7;
  const height = 5;
  const mask = Uint8Array.from({ length: width * height }, (_, index) =>
    (index * 7) % 5 < 2 ? 1 : 0,
  );

  const area = encodeRuns(mask, width, height);

  assert.deepEqual(decodeRuns(area), mask);
  assert.equal(
    area.runs.reduce((sum, run) => sum + run, 0),
    width * height,
  );
});

test("a selected first pixel starts with an empty run", () => {
  const area = encodeRuns([1, 1, 0, 0], 2, 2);
  assert.deepEqual(area.runs, [0, 2, 2]);
  assert.deepEqual([...decodeRuns(area)], [1, 1, 0, 0]);
});

test("runs that overshoot the bitmap are cut off rather than overflowing", () => {
  assert.deepEqual([...decodeRuns({ width: 2, height: 1, runs: [1, 50] })], [0, 1]);
});

test("saved areas are checked before they are drawn", () => {
  assert.ok(isAreaRuns({ width: 4, height: 3, runs: [2, 10] }));

  for (const bad of [
    null,
    { width: 0, height: 3, runs: [] },
    { width: 4, height: 3, runs: [-1] },
    { width: 4.5, height: 3, runs: [] },
    { width: 4, height: 3, runs: "12" },
    { width: 100_000, height: 100_000, runs: [] },
  ]) {
    assert.equal(isAreaRuns(bad), false, JSON.stringify(bad));
  }
});

test("a saved design keeps its smart-select areas and drops malformed ones", () => {
  const edits = parseMaskEdits(
    JSON.stringify([
      { type: "area", mode: "erase", width: 4, height: 3, runs: [2, 10] },
      { type: "area", mode: "add", width: -1, height: 3, runs: [1] },
      {
        type: "polygon",
        mode: "add",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      },
    ]),
  );

  assert.equal(edits.length, 2);
  assert.deepEqual(edits[0], { type: "area", mode: "erase", width: 4, height: 3, runs: [2, 10] });
  assert.equal(edits[1].type, "polygon");
});
