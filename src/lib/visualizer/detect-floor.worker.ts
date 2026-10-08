/// <reference lib="webworker" />
import { analyseRoom, type DetectionInput } from "./detect-floor";

/**
 * Floor detection, off the main thread.
 *
 * The model's inference and every pass over the masks are seconds of CPU on a
 * mid-range machine. On the main thread that froze the whole page — and on a
 * weaker PC the browser with it. Here it takes as long as it takes while the
 * visitor keeps working.
 */

type Request = { id: number; input: DetectionInput };

const scope = self as unknown as DedicatedWorkerGlobalScope;

// Detections run one at a time; the model is loaded once and shared.
let queue = Promise.resolve();

scope.onmessage = (event: MessageEvent<Request>) => {
  const { id, input } = event.data;

  queue = queue.then(async () => {
    try {
      const result = await analyseRoom(input, (progress) =>
        scope.postMessage({ id, type: "progress", progress }),
      );

      scope.postMessage(
        { id, type: "done", result },
        result ? [result.mask.data.buffer as ArrayBuffer] : [],
      );
    } catch (error) {
      scope.postMessage({
        id,
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
};
