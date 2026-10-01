import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, FileText, Sparkles, Truck } from "lucide-react";
import { getAccountSummary } from "@/lib/api/account";
import {
  AppointmentItem,
  EmptyState,
  ProjectCard,
  QuoteRow,
  SectionHeading,
} from "@/components/account/display";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountOverviewPage() {
  const { stats, active_project, next_appointment, recent_quotes } = await getAccountSummary();

  const tiles = [
    { value: stats.open_quotes, label: "Open quotes", href: "/account/quotes" },
    { value: stats.active_projects, label: "Active projects", href: "/account/projects" },
    {
      value: stats.upcoming_appointments,
      label: "Upcoming visits",
      href: "/account/projects#visits",
    },
    {
      value: stats.saved_products + stats.saved_visualizations,
      label: "Saved items",
      href: "/account/saved",
    },
  ];

  const isNew = stats.quotes === 0 && stats.active_projects === 0 && stats.completed_projects === 0;

  return (
    <div className="space-y-10">
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link
              href={tile.href}
              className="block border border-border p-5 transition hover:border-gold"
            >
              <span className="block font-display text-3xl">{tile.value}</span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {tile.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {active_project ? (
        <section>
          <SectionHeading
            title="Active project"
            action={
              <Link
                href="/account/projects"
                className="inline-flex items-center gap-1 text-sm font-medium hover:text-gold"
              >
                All projects <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            }
          />
          <ProjectCard project={active_project} />
        </section>
      ) : (
        isNew && (
          <EmptyState
            icon={Truck}
            title="Nothing on order yet"
            action={{ href: "/products", label: "Browse floors" }}
          >
            When you request a quote it appears here, and once it&apos;s accepted you can follow the
            survey, delivery and installation step by step.
          </EmptyState>
        )
      )}

      {next_appointment && (
        <section>
          <SectionHeading title="Next visit" />
          <ul className="border border-border">
            <AppointmentItem appointment={next_appointment} />
          </ul>
        </section>
      )}

      {recent_quotes.length > 0 && (
        <section>
          <SectionHeading
            title="Recent quotes"
            action={
              <Link
                href="/account/quotes"
                className="inline-flex items-center gap-1 text-sm font-medium hover:text-gold"
              >
                All quotes <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            }
          />
          <ul className="divide-y divide-border border border-border">
            {recent_quotes.map((quote) => (
              <QuoteRow key={quote.id} quote={quote} />
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-5 sm:grid-cols-2 print:hidden">
        <ToolLink
          href="/visualizer"
          icon={Sparkles}
          title="Visualise your next room"
          description="Upload a photo and preview any floor in seconds."
          cta="Open the visualiser"
        />
        <ToolLink
          href="/calculator"
          icon={FileText}
          title="Estimate a new area"
          description="Work out packs, wastage and an indicative cost."
          cta="Open the calculator"
        />
      </section>

      {!next_appointment && !isNew && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4 text-gold" aria-hidden /> No visits booked. Your
          consultant will arrange the next one with you.
        </p>
      )}
    </div>
  );
}

function ToolLink({
  href,
  icon: Icon,
  title,
  description,
  cta,
}: {
  href: string;
  icon: typeof Sparkles;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link href={href} className="group border border-border p-6 transition hover:border-gold">
      <Icon className="h-5 w-5 text-gold" aria-hidden />
      <span className="mt-4 block font-display text-xl">{title}</span>
      <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium group-hover:text-gold">
        {cta} <ArrowUpRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
}
