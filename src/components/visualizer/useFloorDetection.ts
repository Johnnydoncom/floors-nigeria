"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DetectionProgress } from "@/lib/visualizer/detect-floor";
import type { Quad } from "@/lib/visualizer/types";

export type DetectionState =
  | { status: "running"; progress: DetectionProgress }
  | { status: "done" }
  | { status: "unavailable" };

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

  const detect = useCallback(async () => {
    if (!photoSrc) return;

    const run = ++runRef.current;

    try {
      const { detectFloor } = await import("@/lib/visualizer/detect-floor");

      const detection = await detectFloor(photoSrc, (progress) => {
        if (run === runRef.current) setState({ status: "running", progress });
      });

      if (run !== runRef.current) return;

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
      if (run === runRef.current) setState({ status: "unavailable" });
    }
  }, [photoSrc, onDetected]);

  const retry = useCallback(() => {
    setState(STARTING);
    void detect();
  }, [detect]);

  // Detect whenever the room changes, so the common path needs no button.
  useEffect(() => {
    // Deferred to a microtask: detection is a long background job reporting
    // through state, and starting it in the effect body would commit a render
    // only to re-render immediately.
    void Promise.resolve().then(detect);

    return () => {
      // Abandon an in-flight run rather than letting it apply to a new room.
      runRef.current++;
    };
  }, [detect]);

  return { state, retry };
}
