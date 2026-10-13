import { encodeRuns, type AreaRuns } from "./area-runs";
import { pointAtSelfHostedRuntime, type OnnxEnv } from "./onnx-runtime";
import { refineMask, type Rgb } from "./refine-mask";
import type { Point } from "./types";

/**
 * Smart select: tap a spot, and the surface there is selected to its edges.
 *
 * Automatic detection is very good and never perfect — a pocket of floor under
 * a table that the models call table, a chair leg they call floor. Painting
 * those out by hand is fiddly on a phone. Segment Anything (SAM) is built for
 * exactly this: given one point it returns the whole object or surface that
 * point is on, whatever it is, so one tap fixes what a brush needed a minute
 * for.
 *
 * SlimSAM is SAM pruned to about 14MB, small enough to fetch on mobile data. Its
 * slow half — reading the photograph — runs once per photo; every tap after
 * that is the fast half alone, a fraction of a second.
 *
 * Runs in a Web Worker (`smart-select.worker.ts`), like detection.
 */

const MODEL_ID = "Xenova/slimsam-77-uniform";

/** Longest side of the photo handed to SAM, which works at 1024 regardless. */
export const SMART_SELECT_SIDE = 1024;

export type SmartSelectProgress = {
  /** `downloading` the model (with a percentage), `preparing` it, `reading` the photo. */
  stage: "downloading" | "preparing" | "reading";
  percent?: number;
};

type Tensor = { data: ArrayLike<number>; dims: number[] };

type Embeddings = Record<string, unknown>;

type Loaded = {
  /** Read a photo: its embeddings, and the size SAM resized it to. */
  read: (photo: Rgb) => Promise<{ embeddings: Embeddings; reshaped: [number, number] }>;
  /** Decode one point against embeddings already made. */
  decode: (
    embeddings: Embeddings,
    x: number,
    y: number,
  ) => Promise<{ pred_masks: Tensor; iou_scores: Tensor }>;
};

let loading: Promise<Loaded> | null = null;

/** The photo SAM last read, and what it made of it. */
let current: {
  key: string;
  photo: Rgb;
  read: Promise<{ embeddings: Embeddings; reshaped: [number, number] }>;
} | null = null;

/** SAM's mask decoder works on the 1024px square the photo was padded into, at a quarter of it. */
const SAM_SIDE = 1024;
const MASK_SIDE = 256;

async function load(onProgress?: (progress: SmartSelectProgress) => void): Promise<Loaded> {
  loading ??= (async () => {
    const { SamModel, AutoProcessor, RawImage, Tensor, env } =
      await import("@huggingface/transformers");

    await pointAtSelfHostedRuntime(env.backends.onnx as OnnxEnv);

    // Two weight files, encoder and decoder; progress is measured across both.
    const weights = new Map<string, { loaded: number; total: number }>();
    const progress_callback = (event: {
      status?: string;
      file?: string;
      loaded?: number;
      total?: number;
    }) => {
      if (!event.file?.endsWith(".onnx")) return;

      if (event.status === "progress" && event.total) {
        weights.set(event.file, { loaded: event.loaded ?? 0, total: event.total });
        const loaded = [...weights.values()].reduce((sum, file) => sum + file.loaded, 0);
        const total = [...weights.values()].reduce((sum, file) => sum + file.total, 0);
        onProgress?.({ stage: "downloading", percent: Math.round((loaded / total) * 100) });
      } else if (event.status === "done") {
        onProgress?.({ stage: "preparing" });
      }
    };

    const [model, processor] = await Promise.all([
      SamModel.from_pretrained(MODEL_ID, { dtype: "q8", device: "wasm", progress_callback }),
      AutoProcessor.from_pretrained(MODEL_ID, { progress_callback }),
    ]);

    const sam = model as unknown as {
      get_image_embeddings: (inputs: Record<string, unknown>) => Promise<Embeddings>;
      (inputs: Record<string, unknown>): Promise<{ pred_masks: Tensor; iou_scores: Tensor }>;
    };
    const samProcessor = processor as unknown as (
      image: unknown,
    ) => Promise<Record<string, unknown> & { reshaped_input_sizes: number[][] }>;

    // The point is built by hand rather than through the processor, which
    // would resize and normalise the whole photo again on every tap.
    const decode: Loaded["decode"] = (embeddings, x, y) =>
      sam({
        ...embeddings,
        input_points: new Tensor("float32", Float32Array.of(x, y), [1, 1, 1, 2]),
        input_labels: new Tensor("int64", BigInt64Array.of(BigInt(1)), [1, 1, 1]),
      });

    return {
      read: async (photo) => {
        const image = new RawImage(photo.data, photo.width, photo.height, 4).rgb();
        const inputs = await samProcessor(image);
        const [height, width] = inputs.reshaped_input_sizes[0];
        const embeddings = await sam.get_image_embeddings(inputs);
        // The decoder's first run is many times slower than the rest; spend it
        // here, while the visitor is still choosing where to tap.
        await decode(embeddings, width / 2, height / 2);
        return { embeddings, reshaped: [height, width] };
      },
      decode,
    } satisfies Loaded;
  })();

  try {
    return await loading;
  } catch (error) {
    // A failed download must not poison every later attempt.
    loading = null;
    throw error;
  }
}

/**
 * Read a photo ahead of the first tap, so the tap itself is quick. `key`
 * identifies the photo; reading the same one twice does nothing.
 */
export async function prepareSmartSelect(
  key: string,
  photo: Rgb,
  onProgress?: (progress: SmartSelectProgress) => void,
): Promise<void> {
  const sam = await load(onProgress);

  if (current?.key !== key) {
    onProgress?.({ stage: "reading" });
    current = { key, photo, read: sam.read(photo) };
  }

  await current.read;
}

/**
 * The area at `point` (as a share of the photo's width and height) in the photo
 * last prepared under `key`, edges snapped to the photograph — or null when
 * SAM found nothing there.
 */
export async function smartSelectAt(key: string, point: Point): Promise<AreaRuns | null> {
  if (current?.key !== key) throw new Error("Smart select has not read this photo");

  const sam = await load();
  const { photo } = current;
  const { embeddings, reshaped } = await current.read;
  const [reshapedHeight, reshapedWidth] = reshaped;

  const output = await sam.decode(embeddings, point.x * reshapedWidth, point.y * reshapedHeight);

  // SAM proposes three nested readings of a point — a part, an object, the
  // whole — with its own estimate of how good each is. The best one is taken.
  const scores = Array.from(output.iou_scores.data);
  const best = scores.indexOf(Math.max(...scores));

  const selected = upscaleMask(output.pred_masks, best, photo, reshapedWidth, reshapedHeight);
  if (selected === null) return null;

  // SAM's edges are soft blobs at chair-leg scale; the same colour vote that
  // sharpens detection snaps them to the photograph.
  const { width, height } = photo;
  return encodeRuns(refineMask({ data: selected, width, height }, photo).data, width, height);
}

/**
 * One of SAM's low-resolution mask logits, scaled to the photo and cut at zero,
 * or null when it selects nothing. Only the chosen mask is scaled: the
 * library's post-processing scales all three, which was most of a tap's time.
 */
function upscaleMask(
  masks: Tensor,
  which: number,
  photo: Rgb,
  reshapedWidth: number,
  reshapedHeight: number,
): Uint8Array | null {
  const { width, height } = photo;
  const offset = which * MASK_SIDE * MASK_SIDE;
  const scale = MASK_SIDE / SAM_SIDE;
  const selected = new Uint8Array(width * height);
  let area = 0;

  const columns = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    columns[x] = (((x + 0.5) * reshapedWidth) / width) * scale - 0.5;
  }

  for (let y = 0; y < height; y++) {
    const v = Math.min(
      MASK_SIDE - 1,
      Math.max(0, (((y + 0.5) * reshapedHeight) / height) * scale - 0.5),
    );
    const top = Math.floor(v);
    const bottom = Math.min(MASK_SIDE - 1, top + 1);
    const down = v - top;

    for (let x = 0; x < width; x++) {
      const u = Math.min(MASK_SIDE - 1, Math.max(0, columns[x]));
      const left = Math.floor(u);
      const right = Math.min(MASK_SIDE - 1, left + 1);
      const across = u - left;

      const at = (row: number, column: number) => masks.data[offset + row * MASK_SIDE + column];
      const upper = at(top, left) + (at(top, right) - at(top, left)) * across;
      const lower = at(bottom, left) + (at(bottom, right) - at(bottom, left)) * across;

      if (upper + (lower - upper) * down > 0) {
        selected[y * width + x] = 1;
        area++;
      }
    }
  }

  return area === 0 ? null : selected;
}
