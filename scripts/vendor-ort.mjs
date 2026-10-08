/**
 * Copy the ONNX runtime that floor detection uses out of node_modules and into
 * `public/vendor/ort/<version>/`, so it is served from this site instead of a
 * public CDN.
 *
 * Same-origin, the browser caches it (the CDN copy was refused by the cache and
 * downloaded again on every visit), and it arrives from the same edge as the
 * rest of the site. The folder is named for the runtime's version, which is
 * what lets `next.config.ts` cache it for a year: a new version is a new URL.
 *
 * Runs before `dev` and `build`. The output is generated, and git-ignored.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "onnxruntime-web");
const target = join(root, "public", "vendor", "ort");

// The plain SIMD build: what detection loads (see `pointAtSelfHostedRuntime` in detect-floor.ts).
const FILES = ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"];

if (!existsSync(source)) {
  console.warn("[vendor-ort] onnxruntime-web is not installed; detection will use the CDN.");
  process.exit(0);
}

const { version } = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
const destination = join(target, version);

// Old versions are dead weight in the deployment.
if (existsSync(target)) {
  for (const entry of readdirSync(target)) {
    if (entry !== version) rmSync(join(target, entry), { recursive: true, force: true });
  }
}

mkdirSync(destination, { recursive: true });

for (const file of FILES) {
  const from = join(source, "dist", file);
  const to = join(destination, file);

  if (!existsSync(from)) {
    console.warn(
      `[vendor-ort] ${file} is missing from onnxruntime-web ${version}; detection will use the CDN.`,
    );
    process.exit(0);
  }

  if (!existsSync(to)) copyFileSync(from, to);
}

console.log(`[vendor-ort] onnxruntime-web ${version} → public/vendor/ort/${version}`);
