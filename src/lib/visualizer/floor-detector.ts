import {
  modelInputSize,
  REFINE_WIDTH,
  type DetectionInput,
  type DetectionProgress,
  type DetectionQuality,
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
 *
 * The precise model only ever runs in the worker; where there is none it
 * reports nothing rather than freeze the page (`canAffordPreciseDetection`).
 */
export async function detectFloor(
  imageSrc: string,
  onProgress?: (progress: DetectionProgress) => void,
  quality: DetectionQuality = "fast",
): Promise<FloorDetection | null> {
  const target = getWorker();

  if (!target && quality === "precise") return null;

  const input = await prepareInput(imageSrc);

  if (target) {
    try {
      return await new Promise<FloorDetection | null>((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject, onProgress });
        target.postMessage({ id, input, quality }, [
          input.modelInput.data.buffer as ArrayBuffer,
          input.photo.data.buffer as ArrayBuffer,
        ]);
      });
    } catch (error) {
      if (!workerFailed || quality === "precise") throw error;
      // The worker could not run at all: fall through and work inline, with
      // fresh buffers since the first ones were transferred away.
      return analyseInline(await prepareInput(imageSrc), onProgress, quality);
    }
  }

  return analyseInline(input, onProgress, quality);
}

async function analyseInline(
  input: DetectionInput,
  onProgress: ((progress: DetectionProgress) => void) | undefined,
  quality: DetectionQuality,
): Promise<FloorDetection | null> {
  const { analyseRoom } = await import("./detect-floor");
  return analyseRoom(input, onProgress, quality);
}

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/**
 * Whether this visit can afford the precise model on top of the fast one: a
 * 28MB download, and three times the work on the device.
 *
 * Asked of the browser rather than guessed. A visitor who has asked for less
 * data, is on a slow connection, or is on a device with little memory or few
 * cores keeps the fast result — which is still a good floor, and can be
 * corrected by hand. So does anyone on a touch screen: a phone reports "4g" on
 * metered data, and 28MB is not a cost to impose unasked. Browsers that do not
 * say (Safari reports none of these) are given the benefit of the doubt; the
 * download is cached after the first visit.
 *
 * Never run inline: without a worker the precise model's seconds of work would
 * freeze the page, which is worse than a rougher edge.
 */
export function canAffordPreciseDetection(): boolean {
  if (typeof navigator === "undefined" || workerFailed || typeof Worker === "undefined") {
    return false;
  }

  if (window.matchMedia("(pointer: coarse)").matches) return false;

  const device = navigator as Navigator & {
    connection?: NetworkInformation;
    deviceMemory?: number;
  };
  const connection = device.connection;

  if (connection?.saveData) return false;
  if (connection?.effectiveType && connection.effectiveType !== "4g") return false;
  if (device.deviceMemory !== undefined && device.deviceMemory < 4) return false;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return false;

  return true;
}

async function prepareInput(imageSrc: string): Promise<DetectionInput> {
  const image = await loadImage(imageSrc);

  const scale = Math.min(1, REFINE_WIDTH / image.naturalWidth);

  return {
    modelInput: readPixels(image, modelInputSize(image.naturalWidth, image.naturalHeight)),
    photo: readPixels(image, {
      width: Math.max(1, Math.round(image.naturalWidth * scale)),
      height: Math.max(1, Math.round(image.naturalHeight * scale)),
    }),
  };
}

/** The photograph's pixels at the given size. */
function readPixels(
  image: HTMLImageElement,
  { width, height }: { width: number; height: number },
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) throw new Error("Canvas unavailable");

  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  return context.getImageData(0, 0, width, height);
}
