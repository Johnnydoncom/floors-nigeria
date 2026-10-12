import { HUBS, type Hub, type HubId } from "@/lib/branches";
import { cn } from "@/lib/utils";

/**
 * The branch network drawn over the Gulf of Guinea coast, Accra to Calabar.
 *
 * Land is a dot-matrix fill clipped by an approximate coastline, so the map
 * reads as a map without the weight (or the licensing) of real cartography.
 * Gold arcs run from the head office in Lagos to every city we trade in.
 *
 * No hooks: the locator passes handlers to make cities clickable, and branch
 * pages render it statically with one city highlighted.
 */

const MIN_LNG = -0.8;
const MAX_LAT = 9.6;
const SCALE = 100;
const WIDTH = 960;
const HEIGHT = 560;

function project([lat, lng]: [number, number]): [number, number] {
  return [(lng - MIN_LNG) * SCALE, (MAX_LAT - lat) * SCALE];
}

function line(points: [number, number][]): string {
  return points
    .map(([lng, lat], index) => {
      const [x, y] = project([lat, lng]);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/** [lng, lat], west to east. Close enough at this scale; not for navigation. */
const COAST: [number, number][] = [
  [-0.8, 5.42],
  [-0.4, 5.5],
  [0, 5.62],
  [0.4, 5.75],
  [0.7, 5.82],
  [1.0, 6.0],
  [1.2, 6.12],
  [1.6, 6.22],
  [2.0, 6.3],
  [2.4, 6.35],
  [2.8, 6.38],
  [3.4, 6.42],
  [4.0, 6.38],
  [4.4, 6.3],
  [4.7, 6.15],
  [5.0, 5.85],
  [5.15, 5.55],
  [5.3, 5.2],
  [5.5, 4.9],
  [5.8, 4.55],
  [6.1, 4.3],
  [6.5, 4.3],
  [7.0, 4.4],
  [7.5, 4.45],
  [8.0, 4.52],
  [8.3, 4.62],
  [8.5, 4.7],
  [8.8, 4.75],
];

const BORDERS: [number, number][][] = [
  // Ghana | Togo
  [
    [1.19, 6.1],
    [0.75, 6.6],
    [0.55, 7.0],
    [0.62, 7.5],
    [0.5, 8.0],
    [0.48, 8.5],
    [0.38, 9.0],
    [0.45, 9.6],
  ],
  // Togo | Benin
  [
    [1.63, 6.23],
    [1.62, 6.9],
    [1.55, 7.5],
    [1.6, 8.5],
    [1.42, 9.3],
    [1.4, 9.6],
  ],
  // Benin | Nigeria
  [
    [2.7, 6.36],
    [2.72, 7.0],
    [2.75, 7.8],
    [2.7, 8.5],
    [2.9, 9.1],
    [3.15, 9.6],
  ],
];

const COUNTRY_LABELS: { label: string; geo: [number, number] }[] = [
  { label: "GHANA", geo: [7.7, 0.0] },
  { label: "TOGO", geo: [8.6, 1.0] },
  { label: "BENIN", geo: [8.9, 2.15] },
  { label: "NIGERIA", geo: [8.2, 5.2] },
];

const LAND = `${line(COAST)} L${WIDTH} 0 L0 0 Z`;

const ORIGIN = project(HUBS.find((hub) => hub.id === "lagos")!.geo);

/** A shallow arc from Lagos, bowed to the north so routes never cross the sea. */
function arc(hub: Hub): string {
  const [x2, y2] = project(hub.geo);
  const [x1, y1] = ORIGIN;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const lift = Math.hypot(x2 - x1, y2 - y1) * 0.22;
  return `M${x1} ${y1} Q${mx} ${my - lift} ${x2} ${y2}`;
}

function radius(count: number): number {
  return count > 1 ? 9 + count * 0.8 : 6;
}

function labelPosition(side: Hub["labelSide"], r: number, x: number, y: number) {
  switch (side) {
    case "left":
      return { x: x - r - 9, y: y + 6, anchor: "end" as const };
    case "right":
      return { x: x + r + 9, y: y + 6, anchor: "start" as const };
    case "above":
      return { x, y: y - r - 10, anchor: "middle" as const };
    default:
      return { x, y: y + r + 24, anchor: "middle" as const };
  }
}

export function NetworkMap({
  counts,
  active,
  dimmed,
  onHubEnter,
  onHubLeave,
  onHubSelect,
  className,
  title = "Floor Nigeria branch network across Nigeria, Ghana, Togo and Benin",
}: {
  /** Locations per city; cities with none are not drawn. */
  counts: Partial<Record<HubId, number>>;
  /** Cities to emphasise: hovered, selected, or the branch being viewed. */
  active?: HubId[];
  /** Cities filtered out of the current view. */
  dimmed?: HubId[];
  onHubEnter?: (hub: HubId) => void;
  onHubLeave?: () => void;
  onHubSelect?: (hub: HubId) => void;
  className?: string;
  title?: string;
}) {
  const hubs = HUBS.filter((hub) => (counts[hub.id] ?? 0) > 0);
  const interactive = Boolean(onHubSelect);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={title}
      className={cn("block h-auto w-full select-none", className)}
    >
      <defs>
        <pattern id="network-dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="1.7" className="fill-primary-foreground/30" />
        </pattern>
        <radialGradient id="network-glow" cx="0.45" cy="0.55" r="0.6">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill="url(#network-glow)" />
      <path d={LAND} fill="url(#network-dots)" />
      <path
        d={line(COAST)}
        fill="none"
        strokeWidth="1.5"
        className="stroke-primary-foreground/30"
      />
      {BORDERS.map((border, index) => (
        <path
          key={index}
          d={line(border)}
          fill="none"
          strokeWidth="1.2"
          strokeDasharray="2 6"
          strokeLinecap="round"
          className="stroke-primary-foreground/30"
        />
      ))}

      {COUNTRY_LABELS.map(({ label, geo }) => {
        const [x, y] = project(geo);
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            letterSpacing="0.3em"
            className="fill-primary-foreground/30 font-display text-[22px] font-semibold sm:text-[15px]"
          >
            {label}
          </text>
        );
      })}
      <text
        x={project([4.45, 3.2])[0]}
        y={project([4.45, 3.2])[1]}
        textAnchor="middle"
        className="fill-primary-foreground/25 font-sans text-[22px] italic sm:text-[15px]"
      >
        Gulf of Guinea
      </text>

      {/* Routes from the head office. */}
      {hubs
        .filter((hub) => hub.id !== "lagos")
        .map((hub) => {
          const on = active?.includes(hub.id);
          const off = dimmed?.includes(hub.id);
          return (
            <path
              key={hub.id}
              d={arc(hub)}
              fill="none"
              strokeWidth={on ? 2 : 1.2}
              strokeLinecap="round"
              className={cn(
                "stroke-gold transition-opacity duration-500",
                on ? "network-flow opacity-100" : off ? "opacity-10" : "opacity-35",
              )}
            />
          );
        })}

      {hubs.map((hub) => {
        const count = counts[hub.id] ?? 0;
        const [x, y] = project(hub.geo);
        const r = radius(count);
        const on = active?.includes(hub.id) ?? false;
        const off = !on && (dimmed?.includes(hub.id) ?? false);
        // Two labels when phones need a different side; CSS shows one.
        const labels = [
          { side: hub.labelSide, className: hub.mobileLabelSide ? "hidden sm:inline" : undefined },
          ...(hub.mobileLabelSide ? [{ side: hub.mobileLabelSide, className: "sm:hidden" }] : []),
        ];

        return (
          <g
            key={hub.id}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={
              interactive
                ? `${hub.label}: ${count} location${count === 1 ? "" : "s"}. Show branches`
                : undefined
            }
            aria-pressed={interactive ? on : undefined}
            onClick={onHubSelect ? () => onHubSelect(hub.id) : undefined}
            onKeyDown={
              onHubSelect
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onHubSelect(hub.id);
                    }
                  }
                : undefined
            }
            onMouseEnter={onHubEnter ? () => onHubEnter(hub.id) : undefined}
            onMouseLeave={onHubLeave}
            onFocus={onHubEnter ? () => onHubEnter(hub.id) : undefined}
            onBlur={onHubLeave}
            className={cn(
              "outline-none transition-opacity duration-500",
              interactive && "cursor-pointer",
              off && "opacity-30",
            )}
          >
            {/* Generous invisible hit area, so small cities are easy to tap. */}
            <circle cx={x} cy={y} r={Math.max(r + 14, 26)} fill="transparent" />
            {on && <circle cx={x} cy={y} r={r} className="network-pulse fill-gold" />}
            <circle
              cx={x}
              cy={y}
              r={r + 5}
              className={cn(
                "fill-gold/15 stroke-gold/60 transition-all",
                on && "fill-gold/30 stroke-gold",
              )}
              strokeWidth="1"
            />
            <circle cx={x} cy={y} r={r} className="fill-gold" />
            {count > 1 && (
              <text
                x={x}
                y={y + 4.5}
                textAnchor="middle"
                className="fill-charcoal-dark font-display text-[13px] font-bold"
              >
                {count}
              </text>
            )}
            {labels.map(({ side, className: visibility }) => {
              const label = labelPosition(side, r, x, y);
              return (
                <text
                  key={side}
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                  strokeWidth="6"
                  strokeLinejoin="round"
                  style={{ paintOrder: "stroke" }}
                  className={cn(
                    "stroke-charcoal-dark font-display text-[34px] font-semibold transition-colors sm:text-[24px] lg:text-[24px] xl:text-[21px]",
                    on ? "fill-gold-light" : "fill-primary-foreground/85",
                    hub.minor && !on && "hidden sm:inline",
                    visibility,
                  )}
                >
                  {hub.label}
                </text>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
