import {
  MODEL_INPUT_SIDE,
  REFINE_WIDTH,
  type DetectionInput,
  type DetectionProgress,
  type FloorDetection,
} from "./detect-floor";
import { loadImage } from "./images";

/**
 * Floor detection from the main thread's side (§10).
 *
 * The photograph is read into two small pixel buffers here — the only part that
 * needs the DOM — and handed to a Web Worker that runs the model and the mask
 * analysis (`detect-floor.worker.ts`). Where module workers are unavailable the
 * same analysis runs inline, slower to the touch but identical in result.
 */

type WorkerMessage =
  | { id: number; type: "progress"; progress: DetectionProgress }
  | { id: number; type: "done"; result: FloorDetection | null }
  | { id: number; type: "error"; message: string };

let worker: Worker | null = null;
let workerFailed = false;
let nextId = 0;
const pending = new Map<
  number,
  {
    resolve: (result: FloorDetection | null) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: DetectionProgress) => void;
  }
>();

function getWorker(): Worker | null {
  if (workerFailed || typeof Worker === "undefined") return null;

  if (!worker) {
    try {
      worker = new Worker(new URL("./detect-floor.worker.ts", import.meta.url), {
        type: "module",
        name: "floor-detection",
      });
    } catch {
      workerFailed = true;
      return null;
    }

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      const request = pending.get(message.id);

      if (!request) return;

      if (message.type === "progress") {
        request.onProgress?.(message.progress);
        return;
      }

      pending.delete(message.id);

      if (message.type === "done") request.resolve(message.result);
      else request.reject(new Error(message.message));
    };

    // A worker that cannot start (blocked, or the script failed to load) fails
    // every request in flight; later ones run inline instead.
    worker.onerror = (event) => {
      event.preventDefault();
      workerFailed = true;
      worker?.terminate();
      worker = null;
      for (const [id, request] of pending) {
        pending.delete(id);
        request.reject(new Error("Floor detection worker failed"));
      }
    };
  }

  return worker;
}

/**
 * Find the floor in a room photograph: its mask and perspective quad, or null
 * when the model finds nothing convincing.
 */
export async function detectFloor(
  imageSrc: string,
  onProgress?: (progress: DetectionProgress) => void,
): Promise<FloorDetection | null> {
  const input = await prepareInput(imageSrc);
  const target = getWorker();

  if (target) {
    try {
      return await new Promise<FloorDetection | null>((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject, onProgress });
        target.postMessage({ id, input }, [
          input.modelInput.data.buffer as ArrayBuffer,
          input.photo.data.buffer as ArrayBuffer,
        ]);
      });
    } catch (error) {
      if (!workerFailed) throw error;
      // The worker could not run at all: fall through and work inline, with
      // fresh buffers since the first ones were transferred away.
      return analyseInline(await prepareInput(imageSrc), onProgress);
    }
  }

  return analyseInline(input, onProgress);
}

async function analyseInline(
  input: DetectionInput,
  onProgress?: (progress: DetectionProgress) => void,
): Promise<FloorDetection | null> {
  const { analyseRoom } = await import("./detect-floor");
  return analyseRoom(input, onProgress);
}

async function prepareInput(imageSrc: string): Promise<DetectionInput> {
  const image = await loadImage(imageSrc);

  return {
    modelInput: readPixels(image, MODEL_INPUT_SIDE, true),
    photo: readPixels(image, REFINE_WIDTH, false),
  };
}

/**
 * The photograph's pixels, scaled down to fit `limit` — along its longer side,
 * or its width. Never scaled up.
 */
function readPixels(image: HTMLImageElement, limit: number, longestSide: boolean): ImageData {
  const reference = longestSide
    ? Math.max(image.naturalWidth, image.naturalHeight)
    : image.naturalWidth;
  const scale = Math.min(1, limit / reference);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) throw new Error("Canvas unavailable");

  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  return context.getImageData(0, 0, width, height);
}
