import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminList } from "@/lib/admin/types";

/**
 * Presentational building blocks for the admin workspace. Server-safe: no
 * state, no handlers — interactive islands live beside them.
 */

export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  eyebrow?: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> {back.label}
          </Link>
        )}
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="font-display text-2xl tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <div className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-background", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="font-display text-base font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}

const TONES = {
  progress: "bg-gold/15 text-[#6b5210] dark:text-gold",
  success: "bg-emerald-600/12 text-emerald-800 dark:text-emerald-300",
  info: "bg-sky-600/12 text-sky-800 dark:text-sky-300",
  neutral: "bg-muted text-muted-foreground",
  danger: "bg-destructive/12 text-destructive",
  warning: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
} as const;

export type Tone = keyof typeof TONES;

const STATUS_TONE: Record<string, Tone> = {
  // Shared
  draft: "neutral",
  active: "success",
  archived: "neutral",
  cancelled: "danger",
  completed: "success",
  scheduled: "info",
  // Quotes
  submitted: "progress",
  contacted: "progress",
  survey_scheduled: "info",
  measured: "info",
  prepared: "progress",
  sent: "progress",
  negotiation: "warning",
  won: "success",
  lost: "danger",
  expired: "neutral",
  // Leads
  new: "info",
  qualified: "progress",
  unqualified: "neutral",
  converted: "success",
  // Projects, installations, surveys, appointments
  planned: "info",
  in_progress: "progress",
  on_hold: "warning",
  assigned: "info",
  issue: "danger",
  requested: "info",
  confirmed: "success",
  no_show: "danger",
  // Stock
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "danger",
  made_to_order: "info",
  discontinued: "neutral",
  // Reviews
  pending: "warning",
  approved: "success",
  rejected: "danger",
  // Tasks
  open: "info",
  urgent: "danger",
  high: "warning",
  normal: "neutral",
  low: "neutral",
};

export function StatusBadge({
  value,
  label,
  tone,
}: {
  value: string;
  label?: string | null;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold",
        TONES[tone ?? STATUS_TONE[value] ?? "neutral"],
      )}
    >
      {label ?? value}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background px-6 py-12 text-center">
      <Icon className="mx-auto h-6 w-6 text-gold" aria-hidden />
      <p className="mt-3 font-display text-base font-semibold">{title}</p>
      {children && (
        <div className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{children}</div>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function NoAccess({ what = "this area" }: { what?: string }) {
  return (
    <EmptyState icon={Lock} title="You don't have access">
      Your role doesn&apos;t include {what}. Ask a super admin if you need it.
    </EmptyState>
  );
}

export function StatTile({
  label,
  value,
  detail,
  href,
  tone,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  href?: string;
  tone?: "default" | "alert";
}) {
  const body = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-2xl font-semibold tabular-nums",
          tone === "alert" && "text-destructive",
        )}
      >
        {value}
      </p>
      {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
    </>
  );

  const className = "block rounded-lg border border-border bg-background p-4";

  return href ? (
    <Link href={href} className={cn(className, "transition-colors hover:border-foreground/30")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** A signed change against a previous period; up is good unless `invert`. */
export function Delta({
  value,
  suffix = "vs last month",
  invert = false,
}: {
  value: number | null;
  suffix?: string;
  invert?: boolean;
}) {
  if (value === null) return <span>{suffix.replace(/^vs/, "No figure for")}</span>;

  const good = invert ? value < 0 : value > 0;

  return (
    <span>
      <span
        className={cn(
          "font-semibold",
          value === 0 ? "" : good ? "text-emerald-700 dark:text-emerald-300" : "text-destructive",
        )}
      >
        {value > 0 ? "▲" : value < 0 ? "▼" : "•"} {Math.abs(value)}%
      </span>{" "}
      {suffix}
    </span>
  );
}

export type Column<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  cell: (row: T) => ReactNode;
};

/**
 * A plain, accessible table that scrolls sideways on phones rather than
 * squashing its columns.
 */
export function DataTable<T extends { id: number | string }>({
  columns,
  rows,
  empty,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
  caption?: string;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-background">
      <table className="w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn("whitespace-nowrap px-4 py-2.5 font-medium", column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              {columns.map((column) => (
                <td key={column.key} className={cn("px-4 py-3 align-middle", column.className)}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type QueryValue = string | string[] | undefined;

export function withQuery(
  path: string,
  current: Record<string, QueryValue>,
  changes: Record<string, string | number | null>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (typeof value === "string" && value !== "") params.set(key, value);
  }

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function Pagination({
  meta,
  path,
  query,
}: {
  meta: AdminList<unknown>["meta"];
  path: string;
  query: Record<string, QueryValue>;
}) {
  if (meta.last_page <= 1) {
    return meta.total > 0 ? (
      <p className="mt-3 text-xs text-muted-foreground">{meta.total} in total</p>
    ) : null;
  }

  const link =
    "inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs hover:bg-muted";

  return (
    <nav
      aria-label="Pages"
      className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground"
    >
      <span>
        {meta.from}–{meta.to} of {meta.total}
      </span>
      <div className="flex items-center gap-2">
        {meta.current_page > 1 ? (
          <Link href={withQuery(path, query, { page: meta.current_page - 1 })} className={link}>
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Previous
          </Link>
        ) : null}
        <span>
          Page {meta.current_page} of {meta.last_page}
        </span>
        {meta.current_page < meta.last_page ? (
          <Link href={withQuery(path, query, { page: meta.current_page + 1 })} className={link}>
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

/** Status tabs that filter a list, each showing how many records it holds. */
export function StatusTabs({
  path,
  query,
  param = "status",
  tabs,
}: {
  path: string;
  query: Record<string, QueryValue>;
  param?: string;
  tabs: { value: string; label: string; count?: number }[];
}) {
  const current = typeof query[param] === "string" ? query[param] : "";

  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const active = current === tab.value;

        return (
          <Link
            key={tab.value || "all"}
            href={withQuery(path, query, { [param]: tab.value || null, page: null })}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded bg-muted px-1.5 text-[11px] tabular-nums">{tab.count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

/** Label/value pairs for record summaries. */
export function Facts({
  items,
  columns = 2,
}: {
  items: { label: string; value: ReactNode }[];
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-3 text-sm",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 break-words">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RecordLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
