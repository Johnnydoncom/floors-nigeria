"use client";

import dynamic from "next/dynamic";

/**
 * The panorama viewer pulls in three.js, so it is only downloaded when a
 * product actually has a 360° room photo and someone opens it.
 */
export const LazyPanoramaViewer = dynamic(() => import("./PanoramaViewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full select-none place-items-center bg-charcoal-dark text-sm text-white/80">
      Loading 360° room view…
    </div>
  ),
});
