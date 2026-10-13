/**
 * The ONNX runtime both in-browser models run on — floor detection and smart
 * select — served from this site where possible.
 */

/**
 * Where the ONNX runtime is served from. `scripts/vendor-ort.mjs` copies it out
 * of node_modules at build time, into a folder named for its version so it can
 * be cached forever; same-origin, so it is cached at all — the default CDN copy
 * was refused by the browser's cache and downloaded again on every visit.
 */
const SELF_HOSTED_RUNTIME = "/vendor/ort";

export type OnnxEnv = {
  versions?: { web?: string };
  wasm?: { wasmPaths?: unknown };
};

/**
 * Point the runtime at the self-hosted copy when this deployment has one, and
 * leave the CDN default in place when it does not — a model must never fail
 * to load because a build step was skipped.
 *
 * The plain SIMD build is chosen on every browser. Transformers.js picks the
 * "asyncify" build outside Safari, which only WebGPU needs; it is 23MB against
 * 13MB, and these models run on the CPU.
 */
export async function pointAtSelfHostedRuntime(onnx: OnnxEnv): Promise<void> {
  const version = onnx.versions?.web;

  if (!version || !onnx.wasm) return;

  const base = `${SELF_HOSTED_RUNTIME}/${version}`;

  try {
    const probe = await fetch(`${base}/ort-wasm-simd-threaded.mjs`, { method: "HEAD" });
    if (!probe.ok) return;
  } catch {
    return;
  }

  onnx.wasm.wasmPaths = {
    mjs: `${base}/ort-wasm-simd-threaded.mjs`,
    wasm: `${base}/ort-wasm-simd-threaded.wasm`,
  };
}
