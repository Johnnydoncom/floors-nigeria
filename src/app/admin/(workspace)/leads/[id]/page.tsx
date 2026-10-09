import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightLeft, MessageCircle, Pencil, Phone } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { leadFields, staffOptions } from "@/lib/admin/fields";
import { formatDateTime, toE164, whatsAppLink } from "@/lib/format";
import { ActivityPanel, TaskList } from "@/components/admin/activity";
import { ConfirmAction, InlineSelect } from "@/components/admin/actions";
import { FormDialog } from "@/components/admin/forms";
import { Facts, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import type { Activity, Lead, Task } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!can(session, "leads.view")) return <NoAccess what="leads" />;

  const { id } = await params;
  const [{ data: lead, related }, lookups] = await Promise.all([
    adminGet<{ data: Lead; related: { activities: Activity[]; tasks: Task[] } }>(
      `leads/${Number(id)}`,
    ),
    getLookups(),
  ]);

  const canUpdate = can(session, "leads.update");
  const ownOnly = session.scopes.own_records_only;
  const attribution =
    lead.attribution &&
    Object.entries(lead.attribution).filter(([, value]) => value !== null && value !== "");

  return (
    <>
      <PageHeader
        back={{ href: "/admin/leads", label: "Leads" }}
        eyebrow={`${lead.source_label} lead`}
        title={lead.name}
        description={`Received ${formatDateTime(lead.created_at)}`}
        actions={
          <>
            {canUpdate && (
              <InlineSelect
                endpoint={`leads/${lead.id}`}
                field="status"
                label="Status"
                value={lead.status}
                options={lookups.enums.lead_status}
              />
            )}
            {canUpdate && (
              <FormDialog
                wide
                title="Edit lead"
                trigger={
                  <button
                    type="button"
                    className="btn btn-outline h-9 rounded-md bg-background px-4 text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                  </button>
                }
                fields={leadFields(lookups, { canAssign: !ownOnly })}
                initial={lead}
                endpoint={`leads/${lead.id}`}
                method="PATCH"
              />
            )}
            {lead.status !== "converted" && canUpdate && can(session, "opportunities.create") && (
              <FormDialog
                title="Convert to a deal"
                description="Creates (or links) the customer record and opens a deal on the pipeline at Qualified."
                trigger={
                  <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                    <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden /> Convert
                  </button>
                }
                fields={[
                  {
                    name: "title",
                    label: "Deal name",
                    type: "text",
                    placeholder: lead.project_type
                      ? `${lead.project_type} — ${lead.name}`
                      : `Flooring — ${lead.name}`,
                    wide: true,
                  },
                  {
                    name: "value",
                    label: "Estimated value (₦)",
                    type: "number",
                    min: 0,
                    step: "any",
                  },
                  { name: "expected_close_date", label: "Expected to close", type: "date" },
                ]}
                endpoint={`leads/${lead.id}/convert`}
                submitLabel="Convert"
                successMessage="Converted — the deal is on the pipeline."
              />
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Enquiry">
            {lead.message ? (
              <p className="whitespace-pre-line text-sm">{lead.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No message left.</p>
            )}
          </Panel>
          <Panel title="Timeline">
            <ActivityPanel
              subjectType="lead"
              subjectId={lead.id}
              activities={related.activities}
              canLog={can(session, "activities.create")}
            />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Contact">
            <div className="mb-4 flex flex-wrap gap-2">
              {lead.phone && (
                <a
                  href={`tel:${toE164(lead.phone)}`}
                  className="btn btn-outline h-9 rounded-md bg-background px-3 text-xs"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden /> Call
                </a>
              )}
              {lead.phone && (
                <a
                  href={whatsAppLink(
                    lead.phone,
                    `Hello ${lead.name.split(" ")[0]}, thank you for contacting Floor Nigeria.`,
                  )}
                  target="_blank"
                  rel="noopener"
                  className="btn btn-outline h-9 rounded-md bg-background px-3 text-xs"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
                </a>
              )}
            </div>
            <Facts
              columns={1}
              items={[
                {
                  label: "Status",
                  value: <StatusBadge value={lead.status} label={lead.status_label} />,
                },
                { label: "Phone", value: lead.phone },
                { label: "Email", value: lead.email },
                { label: "Project", value: lead.project_type },
                { label: "Budget", value: lead.budget_range },
                {
                  label: "Location",
                  value: [lead.city, lead.state].filter(Boolean).join(", ") || null,
                },
                {
                  label: "Assigned to",
                  value:
                    canUpdate && !ownOnly ? (
                      <InlineSelect
                        endpoint={`leads/${lead.id}`}
                        field="assigned_to"
                        label="Assigned to"
                        value={lead.assigned_to}
                        options={staffOptions(lookups)}
                        nullable
                      />
                    ) : (
                      (lead.assignee?.name ?? "Unassigned")
                    ),
                },
                {
                  label: "First contacted",
                  value: lead.contacted_at ? formatDateTime(lead.contacted_at) : "Not yet",
                },
                {
                  label: "Customer record",
                  value: lead.customer ? (
                    <Link href={`/admin/customers/${lead.customer.id}`} className="hover:underline">
                      {lead.customer.full_name}
                    </Link>
                  ) : (
                    "None yet"
                  ),
                },
                ...(lead.opportunity_id
                  ? [
                      {
                        label: "Deal",
                        value: (
                          <Link
                            href={`/admin/pipeline/${lead.opportunity_id}`}
                            className="hover:underline"
                          >
                            Open the deal
                          </Link>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Panel>

          {attribution && attribution.length > 0 && (
            <Panel title="Attribution">
              <Facts
                columns={1}
                items={attribution.map(([key, value]) => ({
                  label: key.replace(/_/g, " "),
                  value: String(value),
                }))}
              />
            </Panel>
          )}

          <Panel title="Follow-ups">
            <TaskList
              tasks={related.tasks}
              subject={{ type: "lead", id: lead.id }}
              staff={staffOptions(lookups)}
              canCreate={can(session, "tasks.create")}
              canUpdate={can(session, "tasks.update")}
            />
          </Panel>

          {can(session, "leads.delete") && (
            <ConfirmAction
              endpoint={`leads/${lead.id}`}
              title="Delete this lead?"
              description="Its timeline goes with it. Customer records and deals are kept."
              redirectTo="/admin/leads"
              success="Lead deleted."
            >
              Delete lead
            </ConfirmAction>
          )}
        </div>
      </div>
    </>
  );
}
