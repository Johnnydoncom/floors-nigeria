/**
 * Media URL mapping: absolute API/CDN URLs stay absolute for display, and are
 * mapped onto the same-origin `/media/*` proxy only for the canvas-bound
 * visualizer.
 *
 * Run with `npm run test:visualizer`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { mediaProxyPath } from "../src/lib/api/media.ts";

test("an absolute /storage URL maps onto the same-origin proxy", () => {
  assert.equal(
    mediaProxyPath("http://localhost:8000/storage/1/collection-oak.jpg"),
    "/media/1/collection-oak.jpg",
  );
  assert.equal(
    mediaProxyPath("https://api.floornigeria.com/storage/products/x.webp"),
    "/media/products/x.webp",
  );
});

test("a CDN origin maps by path, not by host", () => {
  assert.equal(
    mediaProxyPath("https://cdn.floornigeria.com/storage/12/plank.png"),
    "/media/12/plank.png",
  );
});

test("the rewrite is idempotent — a proxy path is left alone", () => {
  assert.equal(mediaProxyPath("/media/1/collection-oak.jpg"), "/media/1/collection-oak.jpg");
});

test("non-media URLs pass through untouched", () => {
  for (const url of [
    "/images/hero-floor.jpg",
    "https://example.com/photo.jpg",
    "https://api.floornigeria.com/api/v1/products",
  ]) {
    assert.equal(mediaProxyPath(url), url);
  }
});

test("blob and data URLs are not mistaken for media", () => {
  const blob = "blob:http://localhost:3000/9c1f-4e2a";
  const data = "data:image/png;base64,iVBORw0KGgo=";

  assert.equal(mediaProxyPath(blob), blob);
  assert.equal(mediaProxyPath(data), data);
});

test("the media route only serves plain image paths inside the public disk", async () => {
  const { mediaStoragePath } = await import("../src/lib/api/media.ts");
  assert.equal(mediaStoragePath(["44", "oak plank.jpg"]), "/storage/44/oak%20plank.jpg");
  assert.equal(
    mediaStoragePath(["44", "conversions", "oak-thumb.webp"]),
    "/storage/44/conversions/oak-thumb.webp",
  );
  for (const bad of [
    [],
    ["..", "x.jpg"],
    ["44", "x.php"],
    ["44", ""],
    ["a/b.jpg"],
    ["44", "x.jpg?y=1"],
    ["1", "2", "3", "4", "5", "6", "7.jpg"],
  ]) {
    assert.equal(mediaStoragePath(bad), null, JSON.stringify(bad));
  }
});

test("resize widths snap to a short list, and only media URLs gain one", async () => {
  const { mediaWidth, mediaTexturePath } = await import("../src/lib/api/media.ts");
  assert.equal(mediaWidth(null), null);
  assert.equal(mediaWidth("abc"), null);
  assert.equal(mediaWidth("1000"), 1280);
  assert.equal(mediaWidth("99999"), 1920);
  assert.equal(
    mediaTexturePath("https://api.floornigeria.com/storage/44/a.jpg", 1280),
    "/media/44/a.jpg?w=1280",
  );
  assert.equal(mediaTexturePath("/rooms/office/photo.webp", 1280), "/rooms/office/photo.webp");
});
