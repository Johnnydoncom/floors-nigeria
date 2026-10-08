/**
 * AR capability detection, kept apart from the AR session itself so a page can
 * ask "can this device do AR?" without loading three.js to find out.
 */

/**
 * How this device can show AR, if at all.
 *
 * - `webxr` — Android Chrome: a live session with a hit-test (`ar-session.ts`).
 * - `quick-look` — iOS and iPadOS Safari, which have no WebXR but open a USDZ
 *   model in AR Quick Look (`quick-look.ts`). A different pipeline, not a flag.
 * - `unsupported` — desktop browsers and the rest; the 3D room works there.
 * - `insecure` — WebXR is only exposed on https (and localhost).
 */
export type ArSupport = "checking" | "webxr" | "quick-look" | "unsupported" | "insecure";

/** Whether, and how, this device can show AR. */
export async function checkArSupport(): Promise<ArSupport> {
  if (typeof navigator === "undefined" || typeof document === "undefined") return "unsupported";

  // Quick Look announces itself as a link relation the browser understands.
  if (document.createElement("a").relList?.supports?.("ar")) return "quick-look";

  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;

  if (!xr) return "unsupported";

  if (!window.isSecureContext) return "insecure";

  try {
    return (await xr.isSessionSupported("immersive-ar")) ? "webxr" : "unsupported";
  } catch {
    return "unsupported";
  }
}

export type ArHandle = { end: () => void };
