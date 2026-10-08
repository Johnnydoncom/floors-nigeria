/**
 * Getting images into the visualizer at a sensible size (§10, §28).
 */

/** Longest side a room photograph is worked at. A 12MP phone photo is 4032px. */
export const MAX_ROOM_SIDE = 2560;

/** Under this, an upload is used as it is. */
const KEEP_AS_IS_BYTES = 3 * 1024 * 1024;

/** Paths the Next.js image optimizer is configured to serve (next.config.ts). */
const OPTIMIZABLE = /^\/(media|images)\//;

/**
 * A texture through the image optimizer: resized, and served as AVIF or WebP
 * where the browser takes them. Product photography arrives as multi-megabyte
 * JPEGs; the visualizer needs a fraction of that, and a phone on mobile data
 * notices the difference. Same-origin, so the canvas stays exportable.
 */
export function optimizedImageUrl(src: string, width = 1920): string {
  if (!OPTIMIZABLE.test(src) || src.includes("?")) return src;

  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

/**
 * Load an image for canvas use, requesting CORS so the result can still be
 * exported. Same-origin media (everything served through `/media`) is
 * unaffected either way.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}

/** The optimized copy, or the original if the optimizer will not serve it. */
export async function loadTexture(src: string): Promise<HTMLImageElement> {
  const optimized = optimizedImageUrl(src);

  if (optimized === src) return loadImage(src);

  try {
    return await loadImage(optimized);
  } catch {
    return loadImage(src);
  }
}

/**
 * A room photograph sized for working on.
 *
 * Phone photos are 12 megapixels and more. Every canvas the renderer holds is
 * the photo's size, and mobile Safari caps the memory canvases may use, so a
 * full-size photo can fail to render at all; it also exceeds what saving will
 * accept. Downscaled once here, in the browser, before anything else sees it.
 * Orientation is taken from the photo's own metadata by the image decoder.
 */
export async function prepareRoomPhoto(file: File): Promise<{ file: File; url: string }> {
  const originalUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(originalUrl);
    const longest = Math.max(image.naturalWidth, image.naturalHeight);

    if (longest <= MAX_ROOM_SIDE && file.size <= KEEP_AS_IS_BYTES) {
      return { file, url: originalUrl };
    }

    const scale = Math.min(1, MAX_ROOM_SIDE / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);

    const context = canvas.getContext("2d");

    if (!context) return { file, url: originalUrl };

    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );

    if (!blob) return { file, url: originalUrl };

    URL.revokeObjectURL(originalUrl);

    const name = file.name.replace(/\.[^.]+$/, "") || "room";
    const resized = new File([blob], `${name}.jpg`, { type: "image/jpeg" });

    return { file: resized, url: URL.createObjectURL(resized) };
  } catch (error) {
    URL.revokeObjectURL(originalUrl);
    throw error;
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/jpeg" = "image/jpeg",
  quality = 0.9,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Save a blob as a file on the visitor's device. */
export function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick: some browsers start the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/**
 * Textures already decoded this visit, so switching back to a floor is
 * instant. Bounded: each is a decoded bitmap of a megapixel or more.
 */
const TEXTURE_LIMIT = 16;
const textures = new Map<string, Promise<HTMLImageElement>>();

export function getTexture(src: string): Promise<HTMLImageElement> {
  const existing = textures.get(src);

  if (existing) {
    textures.delete(src);
    textures.set(src, existing);
    return existing;
  }

  const loading = loadTexture(src);
  // A failed load must not be cached, or the floor could never be retried.
  loading.catch(() => textures.delete(src));
  textures.set(src, loading);

  while (textures.size > TEXTURE_LIMIT) textures.delete(textures.keys().next().value as string);

  return loading;
}
