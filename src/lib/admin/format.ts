/**
 * Formatting for the workspace, on top of the storefront's `lib/format`.
 */

const compact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

/** ₦4.2M style, for KPI tiles and chart axes. */
export function compactNaira(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `₦${compact.format(value)}`;
}

export function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value}%`;
}

const short = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  timeZone: "Africa/Lagos",
});
const time = new Intl.DateTimeFormat("en-NG", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Africa/Lagos",
});

export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : short.format(date);
}

export function clock(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : time.format(date);
}

/** "3 days ago" — computed against a supplied `now` so server renders stay deterministic. */
export function ago(value: string | null | undefined, now: number): string {
  if (!value) return "—";
  const seconds = Math.round((now - new Date(value).getTime()) / 1000);
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let amount = Math.abs(seconds);
  for (const [size, unit] of units) {
    if (amount < size) {
      const rounded = Math.max(1, Math.floor(amount));
      const label = `${rounded} ${unit}${rounded === 1 ? "" : "s"}`;
      return seconds >= 0 ? `${label} ago` : `in ${label}`;
    }
    amount /= size;
  }
  return "—";
}

export function bytes(size: number | null | undefined): string {
  if (!size) return "—";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
