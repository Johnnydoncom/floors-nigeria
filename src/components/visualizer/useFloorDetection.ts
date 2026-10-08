"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DetectionProgress } from "@/lib/visualizer/detect-floor";
import type { Quad } from "@/lib/visualizer/types";

export type DetectionState =
  | { status: "running"; progress: DetectionProgress }
  | { status: "done" }
  | { status: "unavailable" };

/** Shortest gap between progress updates, in milliseconds. */
const PROGRESS_INTERVAL_MS = 250;

const STARTING: DetectionState = { status: "running", progress: { stage: "downloading" } };

/**
 * Runs automatic floor detection for the current room.
 *
 * The model loads only when this runs, and the room is already on screen with
 * a default floor area by then — detection refines what the visitor can see
 * rather than holding up the first render.
 */
export function useFloorDetection({
  photoSrc,
  onDetected,
}: {
  photoSrc: string;
  /** Must be stable, or detection will restart on every render. */
  onDetected: (quad: Quad, mask: CanvasImageSource) => void;
}) {
  const [state, setState] = useState<DetectionState>(STARTING);

  // Reset for a new room during render rather than in an effect, so the
  // previous room's result never flashes against the new photograph.
  const [lastSrc, setLastSrc] = useState(photoSrc);

  if (lastSrc !== photoSrc) {
    setLastSrc(photoSrc);
    setState(STARTING);
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

      try {
        const { detectFloor } = await import("@/lib/visualizer/floor-detector");

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

        const canvas = document.createElement("canvas");
        canvas.width = detection.mask.width;
        canvas.height = detection.mask.height;
        canvas.getContext("2d")?.putImageData(detection.mask, 0, 0);

        onDetected(detection.quad, canvas);
        setState({ status: "done" });
      } catch {
        if (isCurrent()) setState({ status: "unavailable" });
      }
    },
    [photoSrc, onDetected],
  );

  const retry = useCallback(() => {
    setState(STARTING);
    void detect();
  }, [detect]);

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
    const idle = typeof window.requestIdleCallback === "function";
    const handle = idle
      ? window.requestIdleCallback(start, { timeout: 1500 })
      : window.setTimeout(start, 300);

    return () => {
      wanted = false;
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [detect]);

  return { state, retry };
}
