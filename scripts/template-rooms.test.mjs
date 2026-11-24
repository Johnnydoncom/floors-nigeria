/**
 * Template rooms: the registry the studio reads, the files `bake-room.py`
 * wrote, and the specs they were baked from must agree — a room whose quad or
 * width drifts from its bake lays floors at the wrong size, and a missing file
 * is a room that never finishes loading.
 *
 * Run with `npm run test:visualizer`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TEMPLATE_ROOMS,
  isBundledRoom,
  templateRoom,
} from "../src/lib/visualizer/template-rooms.ts";
import { PAINTS, paintName, parsePaint } from "../src/lib/visualizer/paints.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = (url) => path.join(ROOT, "public", url);

test("every template room ships every file it names", () => {
  assert.ok(TEMPLATE_ROOMS.length >= 4);
  for (const room of TEMPLATE_ROOMS) {
    const files = [
      room.src,
      room.thumb,
      room.floor.mask,
      room.floor.shading,
      room.floor.highlights,
    ];
    if (room.floor.rug) files.push(room.floor.rug);
    if (room.floor.walls) files.push(room.floor.walls);
    for (const file of files) assert.ok(existsSync(pub(file)), `${room.id}: ${file} is missing`);
  }
});

test("the registry matches what was baked", () => {
  for (const room of TEMPLATE_ROOMS) {
    const meta = JSON.parse(readFileSync(pub(`/rooms/${room.id}/meta.json`), "utf8"));
    assert.deepEqual(room.floor.quad, meta.quad, `${room.id}: quad`);
    assert.equal(room.floor.widthM, meta.widthM, `${room.id}: widthM`);
    assert.equal(room.width, meta.size.width, `${room.id}: width`);
    assert.equal(room.height, meta.size.height, `${room.id}: height`);
    assert.equal(Boolean(room.floor.walls), Boolean(meta.walls), `${room.id}: walls`);
    assert.equal(Boolean(room.floor.rug), Boolean(meta.rug), `${room.id}: rug`);
  }
});

test("masks carry the floor in alpha, as the renderer's destination-in reads it", () => {
  for (const room of TEMPLATE_ROOMS) {
    const png = readFileSync(pub(room.floor.mask));
    // IHDR colour type at byte 25: 4 = grey + alpha, 6 = RGBA.
    assert.ok([4, 6].includes(png[25]), `${room.id}: floor mask has no alpha channel`);
  }
});

test("rooms are found by photo or id, and saved by path", () => {
  const first = TEMPLATE_ROOMS[0];
  assert.equal(templateRoom(first.src), first);
  assert.equal(templateRoom(first.id), first);
  assert.equal(templateRoom("/uploads/x.jpg"), undefined);
  assert.ok(isBundledRoom(first.src));
  assert.ok(isBundledRoom("/images/hero-living.jpg"), "designs saved before template rooms");
  assert.ok(!isBundledRoom("blob:https://floornigeria.com/1"));
});

test("only a plain hex colour is accepted as paint", () => {
  assert.equal(parsePaint("#A9B59B"), "#a9b59b");
  for (const bad of ["red", "#fff", "url(x)", "#12345g", null, 7])
    assert.equal(parsePaint(bad), null);
  assert.equal(paintName(PAINTS[0].color), PAINTS[0].name);
  assert.equal(paintName("#123456"), "#123456");
  assert.equal(new Set(PAINTS.map((paint) => paint.color)).size, PAINTS.length, "duplicate paint");
});
