import { perspectiveWeight, project, unproject, type Homography } from "./homography";
import type { Point, Quad } from "./types";

/**
 * Making the material reach every floor pixel.
 *
 * The quad and the mask answer different questions — the quad says *how*
 * perspective runs, the mask says *where* material belongs — and the renderer
 * lays material over the unit square of the quad. That is only enough when the
 * quad happens to contain the whole mask, and it usually does not: a quad
 * fitted to the open middle of a floor stops short of the skirting, a visitor
 * drags a corner inwards, a second patch of floor shows past a doorway. What is
 * left over keeps its old covering, which is the first thing a customer sees.
 *
 * The fix is to stop treating the quad as the edge of the material. The quad
 * fixes the plane; a *domain* — a rectangle in the material's own coordinates,
 * `[u0,u1] × [v0,v1]`, which may reach well outside the unit square — fixes how
 * much of that plane is laid. Choose the domain so its image contains every
 * floor pixel, and the mask alone decides the outline.
 *
 * A domain's image under the homography is a quad on the same plane with the
 * same perspective, so the renderer needs no new maths: it draws the domain
 * quad exactly as it drew the unit quad before.
 */

export type MaterialDomain = { u0: number; v0: number; u1: number; v1: number };

/** The quad itself — what the material covered before, and still does with no mask. */
export const UNIT_DOMAIN: MaterialDomain = { u0: 0, v0: 0, u1: 1, v1: 1 };

/**
 * How far past the quad the domain may reach, in quad widths and depths.
 *
 * Generous, because an oversized domain costs only mesh cells — the mask trims
 * the result either way — while an undersized one costs bare floor. The bound
 * exists so a pathological quad cannot ask for an unbounded mesh.
 */
const MAX_DOMAIN = { u: 3, v: 12 };

/**
 * A domain corner must stay this far in front of the horizon.
 *
 * `w = g·u + h·v + 1` is the perspective divisor; at `w = 0` the point is on the
 * horizon and its image is at infinity. `w` is linear in `(u, v)`, so keeping
 * all four corners in front of the horizon keeps the whole rectangle there.
 */
const HORIZON_EPSILON = 0.05;

/** Bisection steps when pulling a domain back in front of the horizon. */
const HORIZON_STEPS = 18;

/**
 * The outline of a floor mask, in normalised photo coordinates.
 *
 * Every extreme of the mask lies on its convex hull, and the extremes are all
 * the domain needs: `u` and `v` are linear-fractional in `(x, y)`, and such a
 * function attains its extremes over a convex region at a vertex. Taking the
 * hull rather than every boundary pixel turns the per-render cost from a
 * megapixel scan into a few dozen points.
 *
 * The hull is built from per-row and per-column extents, which is where the
 * boundary of any mask must lie, and covers disconnected patches too — a strip
 * of floor through a doorway is as much floor as the room it opens onto.
 */
export function maskHull(
  width: number,
  height: number,
  isFloor: (index: number) => boolean,
): Point[] {
  // Row and column extents in one pass: rows come out naturally, and columns
  // do too because y only ever increases, so the first hit on a column is its
  // top and the last is its bottom. A megapixel mask is walked once.
  const rowLeft = new Int32Array(height).fill(-1);
  const rowRight = new Int32Array(height).fill(-1);
  const columnTop = new Int32Array(width).fill(-1);
  const columnBottom = new Int32Array(width).fill(-1);

  for (let y = 0; y < height; y++) {
    const row = y * width;

    for (let x = 0; x < width; x++) {
      if (!isFloor(row + x)) continue;

      if (rowLeft[y] === -1) rowLeft[y] = x;
      rowRight[y] = x;

      if (columnTop[x] === -1) columnTop[x] = y;
      columnBottom[x] = y;
    }
  }

  // A pixel is a square, not a point. Taking its four corners is what makes the
  // domain cover the whole of the outermost row rather than stopping at its
  // centre — half a pixel of bare floor along a wall is still bare floor.
  const corners: Point[] = [];

  const add = (x: number, y: number) => {
    corners.push(
      { x: x / width, y: y / height },
      { x: (x + 1) / width, y: y / height },
      { x: x / width, y: (y + 1) / height },
      { x: (x + 1) / width, y: (y + 1) / height },
    );
  };

  for (let y = 0; y < height; y++) {
    if (rowLeft[y] === -1) continue;
    add(rowLeft[y], y);
    add(rowRight[y], y);
  }

  for (let x = 0; x < width; x++) {
    if (columnTop[x] === -1) continue;
    add(x, columnTop[x]);
    add(x, columnBottom[x]);
  }

  return convexHull(corners);
}

/**
 * Convex hull by monotone chain — sort by x then y, then sweep the lower and
 * upper chains, discarding any point that does not turn the right way.
 */
export function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return [...points];

  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const build = (source: Point[]): Point[] => {
    const chain: Point[] = [];

    for (const point of source) {
      while (
        chain.length >= 2 &&
        cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0
      ) {
        chain.pop();
      }
      chain.push(point);
    }

    chain.pop();
    return chain;
  };

  return [...build(sorted), ...build([...sorted].reverse())];
}

function cross(origin: Point, a: Point, b: Point): number {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}

/**
 * The smallest safe domain whose image contains every given point.
 *
 * Points are given in normalised photo coordinates and the homography maps the
 * unit square to the quad in pixels, so they are scaled on the way in.
 *
 * Two things are refused rather than trusted. A point that unprojects to behind
 * the camera is not on the visible floor plane at all — a scrap of mask above
 * the horizon — and would drag the domain through infinity. A point beyond
 * `MAX_DOMAIN` is clamped rather than dropped: dropping it silently leaves that
 * floor bare, which is the failure this whole module exists to prevent.
 */
export function domainCovering(
  homography: Homography,
  points: Point[],
  width: number,
  height: number,
  reach: { u: number; v: number } = MAX_DOMAIN,
): MaterialDomain {
  const toMaterial = unproject(homography);

  let domain: MaterialDomain = { ...UNIT_DOMAIN };

  for (const point of points) {
    const material = toMaterial(point.x * width, point.y * height);

    if (!material || !Number.isFinite(material.x) || !Number.isFinite(material.y)) continue;
    if (perspectiveWeight(homography, material.x, material.y) <= 0) continue;

    const u = clamp(material.x, -reach.u, 1 + reach.u);
    const v = clamp(material.y, -reach.v, 1 + reach.v);

    domain = {
      u0: Math.min(domain.u0, u),
      u1: Math.max(domain.u1, u),
      v0: Math.min(domain.v0, v),
      v1: Math.max(domain.v1, v),
    };
  }

  return clampToHorizon(homography, domain);
}

/**
 * Pull a domain back until all four corners are in front of the horizon.
 *
 * The unit square always is — it is the quad, which the camera saw — so
 * bisecting between it and the requested domain always terminates on something
 * drawable, keeping as much of the requested reach as the geometry allows.
 */
export function clampToHorizon(homography: Homography, domain: MaterialDomain): MaterialDomain {
  if (isInFront(homography, domain)) return domain;

  let safe = 0;
  let unsafe = 1;

  for (let step = 0; step < HORIZON_STEPS; step++) {
    const middle = (safe + unsafe) / 2;

    if (isInFront(homography, blend(domain, middle))) {
      safe = middle;
    } else {
      unsafe = middle;
    }
  }

  return blend(domain, safe);
}

function blend(domain: MaterialDomain, amount: number): MaterialDomain {
  return {
    u0: UNIT_DOMAIN.u0 + (domain.u0 - UNIT_DOMAIN.u0) * amount,
    u1: UNIT_DOMAIN.u1 + (domain.u1 - UNIT_DOMAIN.u1) * amount,
    v0: UNIT_DOMAIN.v0 + (domain.v0 - UNIT_DOMAIN.v0) * amount,
    v1: UNIT_DOMAIN.v1 + (domain.v1 - UNIT_DOMAIN.v1) * amount,
  };
}

function isInFront(homography: Homography, domain: MaterialDomain): boolean {
  return domainCorners(domain).every(
    ([u, v]) => perspectiveWeight(homography, u, v) > HORIZON_EPSILON,
  );
}

function domainCorners(domain: MaterialDomain): [number, number][] {
  return [
    [domain.u0, domain.v0],
    [domain.u1, domain.v0],
    [domain.u1, domain.v1],
    [domain.u0, domain.v1],
  ];
}

/**
 * Where a domain lands in the photograph — a quad on the floor plane, with the
 * same perspective as the one it was derived from.
 */
export function domainQuad(homography: Homography, domain: MaterialDomain): Quad {
  return domainCorners(domain).map(([u, v]) => project(homography, u, v)) as Quad;
}

/**
 * Shrink a domain until its image stays within reach of the photograph.
 *
 * Only the *displayed* floor outline needs this: its corners carry the drag
 * handles, and a handle projected somewhere off in the margins is a handle the
 * visitor cannot reach. What the renderer lays is bounded by the mask, not by
 * this, so trimming here costs no coverage.
 */
export function fitDomainToFrame(
  homography: Homography,
  domain: MaterialDomain,
  width: number,
  height: number,
  margin: number,
): MaterialDomain {
  const fits = (candidate: MaterialDomain) =>
    domainQuad(homography, candidate).every(
      (point) =>
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.x >= -margin * width &&
        point.x <= (1 + margin) * width &&
        point.y >= -margin * height &&
        point.y <= (1 + margin) * height,
    );

  if (fits(domain)) return domain;

  let safe = 0;
  let unsafe = 1;

  for (let step = 0; step < HORIZON_STEPS; step++) {
    const middle = (safe + unsafe) / 2;

    if (fits(blend(domain, middle))) {
      safe = middle;
    } else {
      unsafe = middle;
    }
  }

  return blend(domain, safe);
}

export function domainSpan(domain: MaterialDomain): { u: number; v: number } {
  return { u: domain.u1 - domain.u0, v: domain.v1 - domain.v0 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Material depths covered by one off-screen plane.
 *
 * A domain that runs towards the horizon is deep in material terms and shallow
 * on screen, so laying it from a single plane would spend the plane's rows on
 * floor that occupies a dozen pixels and starve the floor underfoot. Splitting
 * it into bands of bounded depth gives every band the same material resolution.
 */
const BAND_DEPTH = 2;

/** Enough for the deepest domain allowed; a guard, not a working limit. */
const MAX_BANDS = 8;

/**
 * A domain cut into bands of bounded depth, near to far.
 *
 * Bands abut exactly and every plane is anchored to the material's origin, so
 * the pattern runs continuously across the joins.
 */
export function domainBands(domain: MaterialDomain): MaterialDomain[] {
  const bands: MaterialDomain[] = [];

  let far = domain.v1;

  while (far > domain.v0 && bands.length < MAX_BANDS) {
    const next = Math.max(domain.v0, far - BAND_DEPTH);
    bands.push({ u0: domain.u0, u1: domain.u1, v0: next, v1: far });
    far = next;
  }

  return bands.length > 0 ? bands : [domain];
}
