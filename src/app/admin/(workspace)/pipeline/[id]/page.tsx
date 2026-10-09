import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { opportunityFields, staffOptions } from "@/lib/admin/fields";
import { formatDate, formatDateTime, naira } from "@/lib/format";
import { ActivityPanel, TaskList } from "@/components/admin/activity";
import { ConfirmAction } from "@/components/admin/actions";
import { FormDialog } from "@/components/admin/forms";
import { DataTable, Facts, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import type { Activity, Opportunity, Quote, Task } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Deal" };

/** One deal: owner, value, source, products (via its quotes), expected close, next step and notes (§16). */
export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!can(session, "opportunities.view")) return <NoAccess what="the sales pipeline" />;

  const { id } = await params;
  const [{ data: deal, related }, lookups] = await Promise.all([
    adminGet<{
      data: Opportunity;
      related: { quotes: Quote[]; activities: Activity[]; tasks: Task[] };
    }>(`opportunities/${Number(id)}`),
    getLookups(),
  ]);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/pipeline", label: "Pipeline" }}
        eyebrow={`${deal.stage_label} · ${deal.probability}% likely`}
        title={deal.title}
        description={
          deal.customer && (
            <Link href={`/admin/customers/${deal.customer.id}`} className="hover:text-foreground">
              {deal.customer.full_name}
            </Link>
          )
        }
        actions={
          can(session, "opportunities.update") && (
            <FormDialog
              wide
              title="Edit deal"
              trigger={
                <button
                  type="button"
                  className="btn btn-outline h-9 rounded-md bg-background px-4 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                </button>
              }
              fields={[
                ...opportunityFields(lookups, { customerLabel: deal.customer?.full_name }),
                {
                  name: "lost_reason",
                  label: "Lost reason",
                  type: "text",
                  wide: true,
                  help: "Required when the stage is Lost.",
                },
              ]}
              initial={deal}
              endpoint={`opportunities/${deal.id}`}
              method="PATCH"
            />
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel
            title="Quotes"
            padded={false}
            actions={
              can(session, "quotes.create") && (
                <Link
                  href={`/admin/quotes?new=1&customer=${deal.customer_profile_id}`}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  + New quote
                </Link>
              )
            }
          >
            <DataTable
              caption="Quotes for this deal"
              rows={related.quotes}
              empty={
                <p className="p-5 text-sm text-muted-foreground">No quotes on this deal yet.</p>
              }
              columns={[
                {
                  key: "ref",
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
                  key: "items",
                  header: "Lines",
                  className: "tabular-nums",
                  cell: (quote) => quote.items_count ?? 0,
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
          <Panel title="Timeline">
            <ActivityPanel
              subjectType="opportunity"
              subjectId={deal.id}
              activities={related.activities}
              canLog={can(session, "activities.create")}
            />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Deal">
            <Facts
              columns={1}
              items={[
                {
                  label: "Stage",
                  value: <StatusBadge value={deal.stage} label={deal.stage_label} />,
                },
                { label: "Value", value: naira(deal.value) },
                { label: "Weighted", value: naira(deal.weighted_value) },
                { label: "Owner", value: deal.owner?.name ?? "Unassigned" },
                { label: "Source", value: deal.source_label },
                { label: "Company", value: deal.company?.name },
                { label: "Expected to close", value: formatDate(deal.expected_close_date) },
                {
                  label: "Next step",
                  value: deal.next_activity_at ? formatDateTime(deal.next_activity_at) : null,
                },
                ...(deal.lost_reason ? [{ label: "Lost because", value: deal.lost_reason }] : []),
                ...(deal.lead_id
                  ? [
                      {
                        label: "From lead",
                        value: (
                          <Link href={`/admin/leads/${deal.lead_id}`} className="hover:underline">
                            Open the enquiry
                          </Link>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
            {deal.notes && (
              <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm">
                {deal.notes}
              </p>
            )}
          </Panel>
          <Panel title="Follow-ups">
            <TaskList
              tasks={related.tasks}
              subject={{ type: "opportunity", id: deal.id }}
              staff={staffOptions(lookups)}
              canCreate={can(session, "tasks.create")}
              canUpdate={can(session, "tasks.update")}
            />
          </Panel>
          {can(session, "opportunities.delete") && (
            <ConfirmAction
              endpoint={`opportunities/${deal.id}`}
              title="Delete this deal?"
              description="Its quotes are kept but no longer linked to a deal."
              redirectTo="/admin/pipeline"
              success="Deal deleted."
            >
              Delete deal
            </ConfirmAction>
          )}
        </div>
      </div>
    </>
  );
}
