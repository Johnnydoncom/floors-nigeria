/**
 * The room a customer is designing (§11).
 *
 * Everything is metres, because that is what a tape measure gives you in
 * Nigeria and what the calculator and the quote already speak. The 3D scene,
 * the plan drawing and the material estimate all read these same numbers, so a
 * room measured once is priced, drawn and walked through consistently.
 */

export type RoomShape = "rectangle" | "l_shape";

export type RoomPlan = {
  shape: RoomShape;
  /** Left-to-right, in metres. */
  width: number;
  /** Front-to-back, in metres. */
  length: number;
  /** Floor to ceiling, in metres. */
  wallHeight: number;
  /** For an L-shape: the bite taken out of the far-right corner. */
  notchWidth: number;
  notchLength: number;
};

export type Point2 = { x: number; y: number };

export const ROOM_LIMITS = {
  width: { min: 1.5, max: 30 },
  length: { min: 1.5, max: 30 },
  wallHeight: { min: 2, max: 6 },
} as const;

export const DEFAULT_PLAN: RoomPlan = {
  shape: "rectangle",
  width: 4.5,
  length: 6,
  wallHeight: 2.7,
  notchWidth: 1.6,
  notchLength: 2,
};

/**
 * The floor outline, anticlockwise from the near-left corner.
 *
 * An L-shape is a rectangle with a bite out of the far-right corner, which is
 * the common case — a chimney breast, a staircase, or a kitchen that opens off
 * a living room.
 */
export function floorOutline(plan: RoomPlan): Point2[] {
  const { width, length } = plan;

  if (plan.shape === "rectangle") {
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: length },
      { x: 0, y: length },
    ];
  }

  const notchWidth = clamp(plan.notchWidth, 0.1, width - 0.5);
  const notchLength = clamp(plan.notchLength, 0.1, length - 0.5);

  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: length - notchLength },
    { x: width - notchWidth, y: length - notchLength },
    { x: width - notchWidth, y: length },
    { x: 0, y: length },
  ];
}

/**
 * Floor area in square metres, by the shoelace formula — correct for any
 * simple polygon, so new room shapes need no new arithmetic here.
 */
export function floorArea(plan: RoomPlan): number {
  const points = floorOutline(plan);

  let twiceArea = 0;

  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }

  return Math.abs(twiceArea) / 2;
}

/**
 * Total wall length, for skirting and beading estimates.
 */
export function perimeter(plan: RoomPlan): number {
  const points = floorOutline(plan);

  return points.reduce((total, point, index) => {
    const next = points[(index + 1) % points.length];
    return total + Math.hypot(next.x - point.x, next.y - point.y);
  }, 0);
}

/**
 * The walls, as segments to be raised from the floor outline.
 */
export function wallSegments(plan: RoomPlan): { from: Point2; to: Point2; length: number }[] {
  const points = floorOutline(plan);

  return points.map((from, index) => {
    const to = points[(index + 1) % points.length];
    return { from, to, length: Math.hypot(to.x - from.x, to.y - from.y) };
  });
}

/**
 * A plan with every dimension inside the range the editor allows, so a typed
 * or dragged value can never produce a room that cannot be drawn.
 */
export function normalisePlan(plan: RoomPlan): RoomPlan {
  const width = clamp(plan.width, ROOM_LIMITS.width.min, ROOM_LIMITS.width.max);
  const length = clamp(plan.length, ROOM_LIMITS.length.min, ROOM_LIMITS.length.max);

  return {
    ...plan,
    width,
    length,
    wallHeight: clamp(plan.wallHeight, ROOM_LIMITS.wallHeight.min, ROOM_LIMITS.wallHeight.max),
    // The bite must leave a room behind it.
    notchWidth: clamp(plan.notchWidth, 0.3, Math.max(0.3, width - 0.5)),
    notchLength: clamp(plan.notchLength, 0.3, Math.max(0.3, length - 0.5)),
  };
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
