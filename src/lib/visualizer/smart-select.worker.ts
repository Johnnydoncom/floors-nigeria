/// <reference lib="webworker" />
import { prepareSmartSelect, smartSelectAt } from "./smart-select";
import type { Rgb } from "./refine-mask";
import type { Point } from "./types";

/**
 * Smart select, off the main thread. Reading a photo is seconds of work on a
 * phone; here the page stays responsive while it happens.
 */

type Request =
  | { id: number; type: "prepare"; key: string; photo: Rgb }
  | { id: number; type: "select"; key: string; point: Point };

const scope = self as unknown as DedicatedWorkerGlobalScope;

// One request at a time: a tap waits for the photo it is on to be read.
let queue = Promise.resolve();

scope.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data;

  queue = queue.then(async () => {
    try {
      if (request.type === "prepare") {
        await prepareSmartSelect(request.key, request.photo, (progress) =>
          scope.postMessage({ id: request.id, type: "progress", progress }),
        );
        scope.postMessage({ id: request.id, type: "done", result: null });
      } else {
        const result = await smartSelectAt(request.key, request.point);
        scope.postMessage({ id: request.id, type: "done", result });
      }
    } catch (error) {
      scope.postMessage({
        id: request.id,
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
};
