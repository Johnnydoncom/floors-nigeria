/**
 * A selected area as run lengths: the compact form a smart-select result is
 * kept in, saved with a design, and redrawn at any resolution.
 *
 * Row by row from the top left, alternating runs of unselected and selected
 * pixels, starting with unselected (so a selected first pixel starts with a
 * zero-length run). A floor-sized area over a 1024px bitmap is a few thousand
 * numbers — where its outline as a polygon kept degenerating around chair
 * legs, and a stack of bitmaps would cost a phone megabytes.
 */
export type AreaRuns = {
  width: number;
  height: number;
  runs: number[];
};

/** Encode a 0/1 mask. */
export function encodeRuns(mask: ArrayLike<number>, width: number, height: number): AreaRuns {
  const runs: number[] = [];
  let current = 0;
  let length = 0;

  for (let index = 0; index < width * height; index++) {
    const value = mask[index] ? 1 : 0;

    if (value === current) {
      length++;
    } else {
      runs.push(length);
      current = value;
      length = 1;
    }
  }

  runs.push(length);
  return { width, height, runs };
}

/** Decode to a 0/1 mask; runs that overshoot the bitmap are cut off. */
export function decodeRuns({ width, height, runs }: AreaRuns): Uint8Array {
  const mask = new Uint8Array(width * height);
  let index = 0;

  runs.forEach((length, run) => {
    const end = Math.min(mask.length, index + length);
    if (run % 2 === 1) mask.fill(1, index, end);
    index = end;
  });

  return mask;
}

/** Whether a value is a well-formed `AreaRuns`, as saved designs are checked. */
export function isAreaRuns(value: unknown): value is AreaRuns {
  if (!value || typeof value !== "object") return false;

  const { width, height, runs } = value as Record<string, unknown>;

  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    (width as number) > 0 &&
    (height as number) > 0 &&
    (width as number) * (height as number) <= 4_000_000 &&
    Array.isArray(runs) &&
    runs.every((run) => Number.isInteger(run) && run >= 0)
  );
}
