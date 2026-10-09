import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, FolderKanban, Paperclip, Pencil, Send } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { appointmentFields, quoteFields, staffOptions } from "@/lib/admin/fields";
import { bytes } from "@/lib/admin/format";
import { formatDate, formatDateTime, number } from "@/lib/format";
import { ActivityPanel, TaskList } from "@/components/admin/activity";
import { ActionButton, ConfirmAction, InlineSelect } from "@/components/admin/actions";
import { FormDialog } from "@/components/admin/forms";
import { QuoteEditor } from "@/components/admin/QuoteEditor";
import { Facts, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import type { Activity, Appointment, Project, Quote, Survey, Task } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Quote" };

type Related = {
  projects: Project[];
  surveys: Survey[];
  appointments: Appointment[];
  activities: Activity[];
  tasks: Task[];
};

/**
 * One quote (§13): the request as the customer made it, the priced lines,
 * where it is in the funnel, and the survey, appointments and project around
 * it.
 */
export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!can(session, "quotes.view")) return <NoAccess what="quotes" />;

  const { id } = await params;
  const [{ data: quote, related, settings }, lookups] = await Promise.all([
    adminGet<{
      data: Quote;
      related: Related;
      settings: { vat_enabled: boolean; vat_rate: number };
    }>(`quotes/${Number(id)}`),
    getLookups(),
  ]);

  const canUpdate = can(session, "quotes.update");
  const closed = ["won", "lost", "expired"].includes(quote.status);
  const project = related.projects[0];

  return (
    <>
      <PageHeader
        back={{ href: "/admin/quotes", label: "Quotes" }}
        eyebrow={`${quote.source_label} · ${formatDate(quote.submitted_at ?? quote.created_at)}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {quote.reference} <StatusBadge value={quote.status} label={quote.status_label} />
          </span>
        }
        description={
          quote.customer && (
            <Link href={`/admin/customers/${quote.customer.id}`} className="hover:text-foreground">
              {quote.customer.full_name}
              {quote.customer.phone && ` · ${quote.customer.phone}`}
            </Link>
          )
        }
        actions={
          <>
            {canUpdate && (
              <InlineSelect
                endpoint={`quotes/${quote.id}`}
                field="status"
                label="Status"
                value={quote.status}
                options={lookups.enums.quote_status}
              />
            )}
            {canUpdate && !closed && (
              <FormDialog
                title={`Send ${quote.reference}`}
                description={
                  quote.customer?.email
                    ? `Emails the priced quote to ${quote.customer.email} and marks it sent.`
                    : "This customer has no email address — add one to their record first."
                }
                trigger={
                  <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                    <Send className="h-3.5 w-3.5" aria-hidden /> Send to customer
                  </button>
                }
                fields={[
                  {
                    name: "message",
                    label: "Message (optional)",
                    type: "textarea",
                    wide: true,
                    placeholder: "e.g. Prices include delivery within Lagos.",
                  },
                ]}
                endpoint={`quotes/${quote.id}/send`}
                submitLabel="Send quote"
                successMessage="Quote sent."
              />
            )}
            {can(session, "projects.create") &&
              !project &&
              (quote.status === "won" || canUpdate) &&
              quote.status !== "lost" && (
                <ConfirmAction
                  endpoint={`quotes/${quote.id}/convert`}
                  method="POST"
                  variant="outline"
                  confirmLabel="Create project"
                  title="Open a project from this quote?"
                  description={
                    quote.status === "won"
                      ? "Operations can then schedule the installation."
                      : "This also marks the quote as won and closes the deal."
                  }
                  success="Project created."
                >
                  <FolderKanban className="h-3.5 w-3.5" aria-hidden /> Create project
                </ConfirmAction>
              )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel
            title="Pricing"
            description={
              quote.valid_until ? `Valid until ${formatDate(quote.valid_until)}` : undefined
            }
          >
            <QuoteEditor
              key={`${(quote.items ?? []).map((item) => item.id).join(",")}:${quote.total}:${quote.status}`}
              quoteId={quote.id}
              items={quote.items ?? []}
              taxTotal={quote.tax_total}
              vatEnabled={settings.vat_enabled}
              vatRate={settings.vat_rate}
              units={lookups.enums.selling_unit}
              editable={canUpdate && !closed}
            />
          </Panel>

          <Panel
            title="The request"
            actions={
              canUpdate && (
                <FormDialog
                  wide
                  title="Edit quote details"
                  trigger={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                    </button>
                  }
                  fields={quoteFields(lookups)}
                  initial={quote}
                  endpoint={`quotes/${quote.id}`}
                  method="PATCH"
                />
              )
            }
          >
            <Facts
              items={[
                { label: "Project", value: quote.project_type },
                {
                  label: "Site",
                  value:
                    [quote.address_line, quote.city, quote.state].filter(Boolean).join(", ") ||
                    null,
                },
                {
                  label: "Preferred installation",
                  value: quote.preferred_installation_date
                    ? `${formatDate(quote.preferred_installation_date)}${quote.preferred_time_slot ? ` · ${quote.preferred_time_slot}` : ""}`
                    : null,
                },
                { label: "Budget", value: quote.budget_range },
                {
                  label: "Needs",
                  value:
                    [
                      quote.requires_site_survey && "Site survey",
                      quote.requires_delivery && "Delivery",
                      quote.requires_installation && "Installation",
                    ]
                      .filter(Boolean)
                      .join(", ") || "Materials only",
                },
                { label: "Consent to contact", value: quote.consent_given ? "Given" : "Not given" },
              ]}
            />
            {quote.notes && (
              <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm">
                {quote.notes}
              </p>
            )}

            {quote.calculation && (
              <div className="mt-4 rounded-md bg-muted/60 p-3 text-sm">
                <p className="text-xs font-semibold">From the floor calculator</p>
                <p className="mt-1">
                  {number(quote.calculation.total_area_sqm)} m² measured ·{" "}
                  {number(quote.calculation.area_with_waste_sqm)} m² with{" "}
                  {quote.calculation.waste_percentage}% waste
                  {quote.calculation.packs_required
                    ? ` · ${quote.calculation.packs_required} packs`
                    : ""}
                </p>
              </div>
            )}

            {quote.attachments && quote.attachments.length > 0 && (
              <ul className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
                {quote.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      href={`/api/admin/quotes/${quote.id}/attachments/${attachment.id}`}
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5" aria-hidden /> {attachment.original_name}
                      <span className="text-xs text-muted-foreground">
                        ({bytes(attachment.size_bytes)})
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Timeline">
            <ActivityPanel
              subjectType="quote"
              subjectId={quote.id}
              activities={related.activities}
              canLog={can(session, "activities.create")}
            />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Summary">
            <Facts
              columns={1}
              items={[
                {
                  label: "Owner",
                  value:
                    canUpdate && !session.scopes.own_records_only ? (
                      <InlineSelect
                        endpoint={`quotes/${quote.id}`}
                        field="owner_id"
                        label="Owner"
                        value={quote.owner_id}
                        options={staffOptions(lookups)}
                        nullable
                      />
                    ) : (
                      (quote.owner?.name ?? "Unassigned")
                    ),
                },
                { label: "Sent", value: quote.sent_at ? formatDateTime(quote.sent_at) : "Not yet" },
                {
                  label: "Closed",
                  value: quote.closed_at ? formatDateTime(quote.closed_at) : null,
                },
                ...(quote.opportunity_id
                  ? [
                      {
                        label: "Deal",
                        value: (
                          <Link
                            href={`/admin/pipeline/${quote.opportunity_id}`}
                            className="hover:underline"
                          >
                            Open on the pipeline
                          </Link>
                        ),
                      },
                    ]
                  : []),
                ...(project
                  ? [
                      {
                        label: "Project",
                        value: (
                          <Link href={`/admin/projects/${project.id}`} className="hover:underline">
                            {project.reference}
                          </Link>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Panel>

          <Panel
            title="Survey & appointments"
            actions={
              can(session, "appointments.create") && (
                <FormDialog
                  wide
                  title="Book an appointment"
                  description="A site-survey appointment also opens the survey record and moves the quote to Survey scheduled."
                  trigger={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" aria-hidden /> Book
                    </button>
                  }
                  fields={appointmentFields(lookups, {
                    customerLabel: quote.customer?.full_name,
                    creating: true,
                  }).filter((field) => field.name !== "quote_id")}
                  initial={{
                    type: "site_survey",
                    customer_profile_id: quote.customer_profile_id,
                    address_line: quote.address_line,
                    city: quote.city,
                    state: quote.state,
                  }}
                  extra={{ quote_id: quote.id }}
                  endpoint="appointments"
                  successMessage="Appointment booked."
                />
              )
            }
          >
            {related.surveys.length === 0 && related.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {quote.requires_site_survey
                  ? "The customer asked for a site survey — none booked yet."
                  : "Nothing booked."}
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {related.surveys.map((survey) => (
                  <li
                    key={`s${survey.id}`}
                    className="flex items-center justify-between gap-2 py-2.5"
                  >
                    <Link href={`/admin/surveys/${survey.id}`} className="hover:underline">
                      Survey · {survey.total_area_sqm} m²
                    </Link>
                    <StatusBadge value={survey.status} label={survey.status_label} />
                  </li>
                ))}
                {related.appointments.map((appointment) => (
                  <li key={`a${appointment.id}`} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span>{appointment.type_label}</span>
                      <StatusBadge value={appointment.status} label={appointment.status_label} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(appointment.scheduled_at, appointment.ends_at)}
                      {appointment.assignee && ` · ${appointment.assignee.name}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Follow-ups">
            <TaskList
              tasks={related.tasks}
              subject={{ type: "quote", id: quote.id }}
              staff={staffOptions(lookups)}
              canCreate={can(session, "tasks.create")}
              canUpdate={can(session, "tasks.update")}
            />
          </Panel>

          {can(session, "quotes.delete") && ["draft", "lost", "expired"].includes(quote.status) && (
            <ConfirmAction
              endpoint={`quotes/${quote.id}`}
              title={`Delete ${quote.reference}?`}
              description="Its lines and attachments go with it."
              redirectTo="/admin/quotes"
              success="Quote deleted."
            >
              Delete quote
            </ConfirmAction>
          )}
          {canUpdate && quote.status === "draft" && (
            <ActionButton
              endpoint={`quotes/${quote.id}`}
              method="PATCH"
              body={{ status: "prepared" }}
              success="Marked as prepared."
              className="w-full"
            >
              Mark as prepared
            </ActionButton>
          )}
        </div>
      </div>
    </>
  );
}
