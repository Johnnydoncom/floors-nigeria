"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DetectionProgress, DetectionQuality } from "@/lib/visualizer/detect-floor";
import { loadImage } from "@/lib/visualizer/images";
import type { FloorPreset, Quad } from "@/lib/visualizer/types";

export type DetectionState =
  /** Reading a floor found ahead of time: a moment, with nothing to report. */
  | { status: "loading" }
  | { status: "running"; progress: DetectionProgress }
  /** `refining` while the precise model sharpens a floor already on screen. */
  | { status: "done"; refining: boolean }
  | { status: "unavailable" };

/** Shortest gap between progress updates, in milliseconds. */
const PROGRESS_INTERVAL_MS = 250;

const STARTING: DetectionState = { status: "running", progress: { stage: "downloading" } };
const LOADING: DetectionState = { status: "loading" };

/**
 * Finds the floor of the current room.
 *
 * A sample room's floor was found ahead of time, so it is read from a small
 * mask and no model is involved. For a room of the visitor's own the model
 * loads only when this runs, and the room is already on screen by then.
 *
 * Two passes. The fast model puts a floor on screen within seconds; where the
 * visit can afford it, the precise model then runs in the background and its
 * sharper floor — stairs, rugs and furniture edges told apart properly —
 * replaces the first when it lands.
 */
export function useFloorDetection({
  photoSrc,
  preset,
  onDetected,
}: {
  photoSrc: string;
  /** The room's floor, when it is already known. */
  preset?: FloorPreset;
  /** Must be stable, or detection will restart on every render. */
  onDetected: (quad: Quad, mask: CanvasImageSource, pass: DetectionQuality) => void;
}) {
  const [state, setState] = useState<DetectionState>(preset ? LOADING : STARTING);

  // Reset for a new room during render rather than in an effect, so the
  // previous room's result never flashes against the new photograph.
  const [lastSrc, setLastSrc] = useState(photoSrc);

  if (lastSrc !== photoSrc) {
    setLastSrc(photoSrc);
    setState(preset ? LOADING : STARTING);
  }

  // Detection is slow enough that a room can change mid-run; only the newest
  // result may be applied.
  const runRef = useRef(0);

  /**
   * Run detection for the current room.
   *
   * `isWanted` lets the caller withdraw its own run — the effect below uses it
   * to drop a result that arrives after the hook has been torn down, which the
   * newest-run check cannot see because there is no newer run.
   */
  const detect = useCallback(
    async (isWanted: () => boolean = () => true) => {
      if (!photoSrc) return;

      const run = ++runRef.current;
      const isCurrent = () => run === runRef.current && isWanted();

      if (preset) {
        try {
          const image = await loadImage(preset.mask);

          if (!isCurrent()) return;

          onDetected(preset.quad, imageCanvas(image), "fast");
          setState({ status: "done", refining: false });
          return;
        } catch {
          // The mask could not be fetched. The model can still find the floor.
          if (!isCurrent()) return;
          setState(STARTING);
        }
      }

      try {
        const { canAffordPreciseDetection, detectFloor } =
          await import("@/lib/visualizer/floor-detector");

        // Downloads report progress many times a second, and each report
        // re-renders the studio. Pass on a change of stage at once, and a new
        // percentage at most a few times a second.
        let last: DetectionProgress | null = null;
        let lastAt = 0;

        const detection = await detectFloor(photoSrc, (progress) => {
          if (!isCurrent()) return;

          const now = performance.now();
          const sameStage = last?.stage === progress.stage;

          if (
            sameStage &&
            (last?.percent === progress.percent || now - lastAt < PROGRESS_INTERVAL_MS)
          ) {
            return;
          }

          last = progress;
          lastAt = now;
          setState({ status: "running", progress });
        });

        if (!isCurrent()) return;

        if (!detection) {
          setState({ status: "unavailable" });
          return;
        }

        const refine = canAffordPreciseDetection();

        onDetected(detection.quad, maskCanvas(detection.mask), "fast");
        setState({ status: "done", refining: refine });

        if (!refine) return;

        try {
          const precise = await detectFloor(photoSrc, undefined, "precise");

          if (isCurrent() && precise) {
            onDetected(precise.quad, maskCanvas(precise.mask), "precise");
          }
        } catch {
          // The fast floor is already on screen and stays there.
        }

        if (isCurrent()) setState({ status: "done", refining: false });
      } catch {
        if (isCurrent()) setState({ status: "unavailable" });
      }
    },
    [photoSrc, preset, onDetected],
  );

  const retry = useCallback(() => {
    setState(preset ? LOADING : STARTING);
    void detect();
  }, [detect, preset]);

  // Detect whenever the room changes, so the common path needs no button.
  useEffect(() => {
    // Whether this effect's run still has anywhere to put its result. A room
    // can change — or the studio can go away — while detection is running, and
    // a floor painted onto a different photograph is worse than no floor.
    let wanted = true;

    // Started once the browser is idle: the room and its material paint
    // first, and the model download competes with nothing the visitor is
    // waiting for. Detection itself runs in a worker, but loading the photo
    // into it and starting the download still cost the main thread a moment.
    const start = () => {
      if (wanted) void detect(() => wanted);
    };

    // A known floor is only a small image, and the room should open with it.
    if (preset) {
      start();
      return () => {
        wanted = false;
      };
    }

    const idle = typeof window.requestIdleCallback === "function";
    const handle = idle
      ? window.requestIdleCallback(start, { timeout: 1500 })
      : window.setTimeout(start, 300);

    return () => {
      wanted = false;
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [detect, preset]);

  return { state, retry };
}

function imageCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d")?.drawImage(image, 0, 0);
  return canvas;
}

function maskCanvas(mask: ImageData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = mask.width;
  canvas.height = mask.height;
  canvas.getContext("2d")?.putImageData(mask, 0, 0);
  return canvas;
}
