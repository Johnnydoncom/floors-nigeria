import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ArrowUpRight, CalendarClock, Check, MapPin } from "lucide-react";
import { formatDate, formatDateTime, naira } from "@/lib/format";
import { stateLabel } from "@/lib/nigeria";
import { cn } from "@/lib/utils";
import type { AccountProject, Appointment, Quote } from "@/lib/api/types";

/**
 * Read-only building blocks shared by the account pages.
 */

const TONES = {
  progress: "bg-gold/15 text-[#7a5d12]",
  success: "bg-emerald-500/12 text-emerald-800",
  neutral: "bg-muted text-muted-foreground",
  danger: "bg-destructive/10 text-destructive",
} as const;

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  // Quotes
  submitted: "progress",
  contacted: "progress",
  survey_scheduled: "progress",
  measured: "progress",
  prepared: "progress",
  sent: "progress",
  negotiation: "progress",
  won: "success",
  lost: "danger",
  expired: "neutral",
  draft: "neutral",
  // Projects
  planned: "progress",
  in_progress: "progress",
  on_hold: "neutral",
  completed: "success",
  cancelled: "danger",
  // Appointments
  scheduled: "progress",
  confirmed: "success",
  no_show: "danger",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold",
        TONES[STATUS_TONE[status] ?? "neutral"],
      )}
    >
      {label}
    </span>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
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
  children: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="border border-dashed border-border px-6 py-12 text-center">
      <Icon className="mx-auto h-6 w-6 text-gold" aria-hidden />
      <p className="mt-4 font-display text-lg">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{children}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex h-11 items-center gap-1 bg-charcoal-dark px-5 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:bg-gold hover:text-charcoal-dark"
        >
          {action.label} <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function place(location: {
  address_line?: string | null;
  city: string | null;
  state: string | null;
}): string {
  return [location.address_line, location.city, location.state ? stateLabel(location.state) : null]
    .filter(Boolean)
    .join(", ");
}

/** Progress through the job, as recorded by operations — never projected. */
export function ProjectTimeline({ steps }: { steps: AccountProject["timeline"] }) {
  const current = steps.findIndex((step) => !step.done);

  return (
    <ol className="grid grid-cols-5 gap-2 text-[11px]" aria-label="Progress">
      {steps.map((step, index) => (
        <li key={step.key} aria-current={index === current ? "step" : undefined}>
          <div
            className={cn(
              "h-1.5",
              step.done ? "bg-gold" : index === current ? "bg-gold/35" : "bg-border",
            )}
          />
          <div
            className={cn(
              "mt-2 flex items-start gap-1 leading-tight",
              step.done ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {step.done && (
              <Check className="mt-px hidden h-3 w-3 shrink-0 text-gold sm:block" aria-hidden />
            )}
            <span>
              {step.label}
              <span className="sr-only">
                {step.done ? " — done" : index === current ? " — next" : " — to come"}
              </span>
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ProjectCard({ project }: { project: AccountProject }) {
  const nextInstallation = project.installations.find((installation) => !installation.completed_at);

  return (
    <article className="border border-border">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">{project.reference}</p>
          <h3 className="mt-1 truncate font-display text-xl">{project.name}</h3>
        </div>
        <StatusBadge status={project.status} label={project.status_label} />
      </header>
      <div className="space-y-5 p-5">
        {project.status !== "cancelled" && <ProjectTimeline steps={project.timeline} />}
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Site</dt>
            <dd className="mt-1">{place(project.location) || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {nextInstallation ? "Installation" : "Dates"}
            </dt>
            <dd className="mt-1">
              {nextInstallation
                ? formatDateTime(nextInstallation.scheduled_start)
                : project.start_date
                  ? `${formatDate(project.start_date)} – ${formatDate(project.end_date)}`
                  : "To be scheduled"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Value</dt>
            <dd className="mt-1 font-mono">{project.value > 0 ? naira(project.value) : "—"}</dd>
          </div>
        </dl>
        {project.quote_reference && (
          <Link
            href={`/account/quotes/${encodeURIComponent(project.quote_reference)}`}
            className="inline-flex items-center gap-1 text-sm font-medium hover:text-gold"
          >
            View quote {project.quote_reference} <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}

export function AppointmentItem({ appointment }: { appointment: Appointment }) {
  const where = place(appointment.location);

  return (
    <li className="flex flex-wrap items-start justify-between gap-4 p-5">
      <div className="flex min-w-0 items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center bg-surface text-gold">
          <CalendarClock className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-medium">
            {appointment.type_label}
            {appointment.project_name && (
              <span className="text-muted-foreground"> · {appointment.project_name}</span>
            )}
          </p>
          <p className="mt-0.5 text-sm">
            {formatDateTime(appointment.scheduled_at, appointment.ends_at)}
          </p>
          {where && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden /> {where}
            </p>
          )}
        </div>
      </div>
      <StatusBadge status={appointment.status} label={appointment.status_label} />
    </li>
  );
}

export function quoteSummary(quote: Quote): string {
  const parts = [
    quote.project.type,
    [quote.project.city, quote.project.state].filter(Boolean).join(", "),
  ];
  return parts.filter(Boolean).join(" · ") || "Quote request";
}

export function QuoteRow({ quote }: { quote: Quote }) {
  return (
    <li>
      <Link
        href={`/account/quotes/${encodeURIComponent(quote.reference)}`}
        className="flex flex-wrap items-center justify-between gap-4 p-5 transition hover:bg-surface"
      >
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">
            {quote.reference} · {formatDate(quote.submitted_at ?? quote.created_at)}
          </p>
          <p className="mt-1 truncate font-medium">{quoteSummary(quote)}</p>
        </div>
        <div className="flex items-center gap-5">
          <span className="font-mono text-sm">
            {quote.totals.total > 0 ? naira(quote.totals.total) : "Being priced"}
          </span>
          <StatusBadge status={quote.status} label={quote.status_label} />
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      </Link>
    </li>
  );
}

export function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("divide-y divide-border border border-border", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-4 p-5">
          <div className="space-y-2">
            <div className="h-3 w-32 animate-pulse bg-muted" />
            <div className="h-4 w-56 animate-pulse bg-muted" />
          </div>
          <div className="h-6 w-20 animate-pulse bg-muted" />
        </div>
      ))}
    </div>
  );
}
