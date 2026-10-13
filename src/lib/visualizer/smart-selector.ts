import type { AreaRuns } from "./area-runs";
import { loadImage } from "./images";
import { SMART_SELECT_SIDE, type SmartSelectProgress } from "./smart-select";
import type { Point } from "./types";

/**
 * Smart select from the main thread's side: the photo is read into pixels here
 * — the only part that needs the DOM — and everything else happens in
 * `smart-select.worker.ts`.
 *
 * Unlike detection there is no inline fallback. Without a worker, reading the
 * photo would freeze the page for seconds on every room, and the brush and
 * polygon tools already do the job by hand.
 */

type WorkerMessage =
  | { id: number; type: "progress"; progress: SmartSelectProgress }
  | { id: number; type: "done"; result: AreaRuns | null }
  | { id: number; type: "error"; message: string };

let worker: Worker | null = null;
let workerFailed = false;
let nextId = 0;
const pending = new Map<
  number,
  {
    resolve: (result: AreaRuns | null) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: SmartSelectProgress) => void;
  }
>();

/** Photos already handed to the worker, by source. */
let prepared: { src: string; ready: Promise<void> } | null = null;

export function isSmartSelectAvailable(): boolean {
  return !workerFailed && typeof Worker !== "undefined";
}

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL("./smart-select.worker.ts", import.meta.url), {
    type: "module",
    name: "smart-select",
  });

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

  worker.onerror = (event) => {
    event.preventDefault();
    workerFailed = true;
    worker?.terminate();
    worker = null;
    prepared = null;
    for (const [id, request] of pending) {
      pending.delete(id);
      request.reject(new Error("Smart select worker failed"));
    }
  };

  return worker;
}

function send(
  message: Record<string, unknown>,
  transfer: Transferable[] = [],
  onProgress?: (progress: SmartSelectProgress) => void,
): Promise<AreaRuns | null> {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ id, ...message }, transfer);
  });
}

/**
 * Download the model and read the photo, ahead of the first tap. Safe to call
 * repeatedly; the same photo is read once.
 */
export function prepareSmartSelect(
  src: string,
  onProgress?: (progress: SmartSelectProgress) => void,
): Promise<void> {
  if (prepared?.src === src) return prepared.ready;

  const ready = (async () => {
    const photo = await readPhoto(src);
    await send(
      { type: "prepare", key: src, photo },
      [photo.data.buffer as ArrayBuffer],
      onProgress,
    );
  })();

  prepared = { src, ready };
  ready.catch(() => {
    if (prepared?.ready === ready) prepared = null;
  });

  return ready;
}

/**
 * The area at `point` in the photo at `src`, or null when nothing was found
 * there. Reads the photo first if it has not been.
 */
export async function smartSelect(
  src: string,
  point: Point,
  onProgress?: (progress: SmartSelectProgress) => void,
): Promise<AreaRuns | null> {
  await prepareSmartSelect(src, onProgress);
  return send({ type: "select", key: src, point });
}

async function readPhoto(src: string): Promise<ImageData> {
  const image = await loadImage(src);
  const scale = Math.min(1, SMART_SELECT_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
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
