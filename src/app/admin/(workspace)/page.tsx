import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, FileText } from "lucide-react";
import { adminGet, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { compactNaira, percent } from "@/lib/admin/format";
import { formatDateTime, naira, number } from "@/lib/format";
import { BarList, ColumnChart } from "@/components/admin/charts";
import { ActivityPanel, TaskList } from "@/components/admin/activity";
import { DataTable, Delta, PageHeader, Panel, StatTile, StatusBadge } from "@/components/admin/ui";
import type { Dashboard } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The workspace home (§15): each section appears only for roles that may see
 * what it summarises.
 */
export default async function DashboardPage() {
  const session = await requireSession();
  const { data } = await adminGet<{ data: Dashboard; meta: { generated_at: string } }>("dashboard");
  const firstName = session.user.name.split(/\s+/)[0];

  return (
    <>
      <PageHeader
        eyebrow={session.user.roles.map((role) => role.label).join(" · ")}
        title={`Good to see you, ${firstName}`}
        description="What needs attention across sales, operations and the catalogue today."
        actions={
          <>
            {can(session, "quotes.create") && (
              <Link
                href="/admin/quotes?new=1"
                className="btn btn-primary h-9 rounded-md px-4 text-xs"
              >
                New quote
              </Link>
            )}
            {can(session, "products.create") && (
              <Link
                href="/admin/products/new"
                className="btn btn-outline h-9 rounded-md bg-background px-4 text-xs"
              >
                New product
              </Link>
            )}
          </>
        }
      />

      <div className="space-y-6">
        <KpiRow data={data} />

        {data.sales && (
          <div className="grid gap-6 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              title="Revenue won by month"
              description="Quotes marked won, by the month they closed — last 12 months"
              actions={
                <Link
                  href="/admin/reports?report=sales"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Sales report →
                </Link>
              }
            >
              <ColumnChart
                kind="money"
                label="Revenue won by month"
                points={data.sales.by_month.map((month) => ({
                  label: month.label,
                  value: month.revenue,
                  detail: `${month.quotes} quotes requested · ${compactNaira(month.quoted)} quoted`,
                }))}
              />
              <p className="mt-4 text-xs text-muted-foreground">
                {compactNaira(data.sales.revenue_year)} won over the year
                {data.sales.average_won_value !== null &&
                  ` · ${compactNaira(data.sales.average_won_value)} average won quote`}
              </p>
            </Panel>

            {data.pipeline ? (
              <Panel
                title="Open pipeline"
                description={`${data.pipeline.open_count} deals · ${compactNaira(data.pipeline.weighted_value)} weighted`}
                actions={
                  <Link
                    href="/admin/pipeline"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Board →
                  </Link>
                }
              >
                <BarList
                  kind="money"
                  label="Open pipeline value by stage"
                  items={data.pipeline.stages.map((stage) => ({
                    key: stage.stage,
                    label: `${stage.label} (${stage.count})`,
                    value: stage.value,
                    href: `/admin/pipeline?stage=${stage.stage}`,
                  }))}
                />
              </Panel>
            ) : (
              <GeographyPanel data={data} />
            )}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          {data.leads && (
            <Panel
              title="Where leads come from"
              description="Last 90 days, with how many converted"
              actions={
                <Link
                  href="/admin/leads"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Leads →
                </Link>
              }
            >
              <BarList
                kind="count"
                label="Leads by source, last 90 days"
                empty="No leads in the last 90 days."
                items={data.leads.by_source.map((source) => ({
                  key: source.source,
                  label: source.label,
                  value: source.count,
                  detail: `${source.converted} converted`,
                }))}
              />
              <p className="mt-4 text-xs text-muted-foreground">
                Average first response:{" "}
                <span className="font-semibold text-foreground">
                  {data.leads.average_response_hours === null
                    ? "—"
                    : `${data.leads.average_response_hours} hours`}
                </span>
              </p>
            </Panel>
          )}

          {data.sales && data.pipeline && <GeographyPanel data={data} />}

          {data.tasks && (
            <Panel
              title="Your follow-ups"
              description={`${data.tasks.open} open · ${data.tasks.due_today} due today`}
              actions={
                <Link
                  href="/admin/tasks"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  All tasks →
                </Link>
              }
            >
              <TaskList
                tasks={data.tasks.items}
                staff={[]}
                canCreate={false}
                canUpdate={can(session, "tasks.update")}
                showSubject
              />
            </Panel>
          )}
        </div>

        {data.recent_quotes && (
          <Panel
            title="Latest quote requests"
            padded={false}
            actions={
              <Link
                href="/admin/quotes"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                All quotes →
              </Link>
            }
          >
            <DataTable
              caption="Latest quote requests"
              rows={data.recent_quotes}
              empty={<p className="p-5 text-sm text-muted-foreground">No quotes yet.</p>}
              columns={[
                {
                  key: "reference",
                  header: "Quote",
                  cell: (quote) => (
                    <Link
                      href={`/admin/quotes/${quote.id}`}
                      className="font-medium hover:underline"
                    >
                      {quote.reference}
                    </Link>
                  ),
                },
                {
                  key: "customer",
                  header: "Customer",
                  cell: (quote) => quote.customer?.full_name ?? "—",
                },
                {
                  key: "source",
                  header: "Source",
                  className: "max-md:hidden",
                  cell: (quote) => quote.source_label,
                },
                {
                  key: "total",
                  header: "Value",
                  className: "text-right tabular-nums",
                  cell: (quote) => naira(quote.total),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (quote) => <StatusBadge value={quote.status} label={quote.status_label} />,
                },
              ]}
            />
          </Panel>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          {data.installations && (
            <Panel
              title="Installation pipeline"
              description="Jobs in the next two weeks"
              actions={
                <Link
                  href="/admin/installations"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Jobs →
                </Link>
              }
            >
              <div className="mb-4 flex flex-wrap gap-2">
                {data.installations.by_status
                  .filter((status) => status.count > 0)
                  .map((status) => (
                    <Link key={status.status} href={`/admin/installations?status=${status.status}`}>
                      <StatusBadge
                        value={status.status}
                        label={`${status.label} · ${status.count}`}
                      />
                    </Link>
                  ))}
              </div>
              {data.installations.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.installations.upcoming.map((job) => (
                    <li key={job.id} className="py-2.5 text-sm">
                      <Link
                        href={`/admin/installations/${job.id}`}
                        className="font-medium hover:underline"
                      >
                        {job.project?.name ?? `Installation #${job.id}`}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(job.scheduled_start)} ·{" "}
                        {job.lead_installer?.name ?? "No lead installer"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {data.appointments && (
            <Panel
              title="This week's appointments"
              actions={
                <Link
                  href="/admin/appointments"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Calendar →
                </Link>
              }
            >
              {data.appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No appointments in the next 7 days.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.appointments.map((appointment) => (
                    <li key={appointment.id} className="py-2.5 text-sm">
                      <p className="font-medium">
                        {appointment.type_label} · {appointment.customer?.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(appointment.scheduled_at, appointment.ends_at)}
                        {appointment.assignee && ` · ${appointment.assignee.name}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {data.catalogue && <CataloguePanel data={data} />}
        </div>

        {data.catalogue && data.catalogue.top_products.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Most-quoted products" description="By quoted value, last 90 days">
              <BarList
                kind="money"
                label="Most-quoted products"
                items={data.catalogue.top_products.map((product) => ({
                  key: String(product.id ?? product.name),
                  label: product.name,
                  value: product.value,
                  href: product.id ? `/admin/products/${product.id}` : undefined,
                  detail: `${product.lines} quote lines`,
                }))}
              />
            </Panel>
            <Panel title="Top categories" description="By quoted value, last 90 days">
              <BarList
                kind="money"
                label="Top categories"
                items={data.catalogue.top_categories.map((category) => ({
                  key: category.name,
                  label: category.name,
                  value: category.value,
                }))}
              />
            </Panel>
          </div>
        )}

        {data.activity && data.activity.length > 0 && (
          <Panel title="Recent activity">
            <ActivityPanel subjectType="" subjectId={0} activities={data.activity} canLog={false} />
          </Panel>
        )}
      </div>
    </>
  );
}

function KpiRow({ data }: { data: Dashboard }) {
  const tiles = [];

  if (data.sales) {
    tiles.push(
      <StatTile
        key="revenue"
        label="Revenue won this month"
        value={compactNaira(data.sales.revenue_this_month)}
        detail={<Delta value={data.sales.revenue_change} />}
        href="/admin/quotes?status=won"
      />,
      <StatTile
        key="open-quotes"
        label="Open quotes"
        value={number(data.sales.open_quotes, 0)}
        detail={`${compactNaira(data.sales.open_quote_value)} awaiting a decision`}
        href="/admin/quotes?status=open"
      />,
      <StatTile
        key="conversion"
        label="Quote conversion (90 days)"
        value={percent(data.sales.conversion_rate)}
        detail={
          data.sales.conversion_sample > 0
            ? `of ${data.sales.conversion_sample} closed quotes`
            : "No quotes closed yet"
        }
      />,
    );
  }

  if (data.leads) {
    tiles.push(
      <StatTile
        key="leads"
        label="New leads this month"
        value={number(data.leads.new_this_month, 0)}
        detail={
          data.leads.uncontacted > 0 ? (
            <span className="font-semibold text-destructive">
              {data.leads.uncontacted} not yet contacted
            </span>
          ) : (
            <Delta value={data.leads.new_change} />
          )
        }
        href="/admin/leads?status=new"
      />,
    );
  }

  if (data.tasks) {
    tiles.push(
      <StatTile
        key="tasks"
        label="Overdue follow-ups"
        value={number(data.tasks.overdue, 0)}
        detail={`${data.tasks.open} open in total`}
        href="/admin/tasks?status=overdue"
        tone={data.tasks.overdue > 0 ? "alert" : "default"}
      />,
    );
  }

  if (data.engagement) {
    tiles.push(
      <StatTile
        key="visualizer"
        label="Visualizations saved (30 days)"
        value={number(data.engagement.visualizations_30d, 0)}
        detail={`${data.engagement.visualizer_quotes_30d} quotes from the visualizer · ${data.engagement.calculations_30d} calculations`}
      />,
    );
  }

  if (data.catalogue && !data.sales) {
    tiles.push(
      <StatTile
        key="active"
        label="Live products"
        value={number(data.catalogue.active_products, 0)}
        href="/admin/products?status=active"
      />,
      <StatTile
        key="drafts"
        label="Drafts"
        value={number(data.catalogue.draft_products, 0)}
        href="/admin/products?status=draft"
      />,
    );
  }

  if (tiles.length === 0) return null;

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{tiles.slice(0, 8)}</div>;
}

function GeographyPanel({ data }: { data: Dashboard }) {
  if (!data.geography) return null;

  return (
    <Panel title="Demand by state" description="Quotes requested, last 12 months">
      <BarList
        kind="count"
        label="Quotes by state"
        empty="No quotes with a location yet."
        items={data.geography.map((row) => ({
          key: row.state,
          label: row.state,
          value: row.quotes,
          detail: `${compactNaira(row.value)} quoted · ${row.won} won`,
        }))}
      />
    </Panel>
  );
}

function CataloguePanel({ data }: { data: Dashboard }) {
  const catalogue = data.catalogue!;

  return (
    <Panel
      title="Catalogue health"
      actions={
        <Link
          href="/admin/products"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Products →
        </Link>
      }
    >
      <dl className="grid grid-cols-3 gap-3 text-center">
        <div>
          <dt className="text-[11px] text-muted-foreground">Live</dt>
          <dd className="font-display text-lg font-semibold">{catalogue.active_products}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Drafts</dt>
          <dd className="font-display text-lg font-semibold">{catalogue.draft_products}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Live, unpriced</dt>
          <dd className="font-display text-lg font-semibold">{catalogue.unpriced_products}</dd>
        </div>
      </dl>
      <p className="mt-5 flex items-center gap-1.5 text-xs font-semibold">
        <AlertTriangle className="h-3.5 w-3.5 text-gold" aria-hidden /> Stock alerts
      </p>
      {catalogue.stock_alerts.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No low or out-of-stock variations.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {catalogue.stock_alerts.map((alert) => (
            <li
              key={alert.variant_id}
              className="flex items-center justify-between gap-2 py-2 text-sm"
            >
              <Link
                href={`/admin/products/${alert.product_id}`}
                className="min-w-0 truncate hover:underline"
              >
                {alert.product} <span className="text-muted-foreground">· {alert.sku}</span>
              </Link>
              <StatusBadge
                value={alert.stock_status}
                label={
                  alert.stock_quantity === null
                    ? alert.stock_status_label
                    : `${number(alert.stock_quantity)} left`
                }
              />
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/admin/products?stock=any"
        className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <FileText className="h-3.5 w-3.5" aria-hidden /> All stock alerts{" "}
        <ArrowUpRight className="h-3 w-3" aria-hidden />
      </Link>
    </Panel>
  );
}
