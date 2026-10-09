import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Pencil, Phone } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { customerFields, opportunityFields, staffOptions } from "@/lib/admin/fields";
import { formatDate, formatDateTime, naira, toE164, whatsAppLink } from "@/lib/format";
import { ActivityPanel, TaskList } from "@/components/admin/activity";
import { ConfirmAction } from "@/components/admin/actions";
import { FormDialog } from "@/components/admin/forms";
import {
  DataTable,
  Facts,
  NoAccess,
  PageHeader,
  Panel,
  StatTile,
  StatusBadge,
} from "@/components/admin/ui";
import type {
  Activity,
  Appointment,
  Customer,
  Lead,
  Opportunity,
  Project,
  Quote,
  Survey,
  Task,
} from "@/lib/admin/types";

export const metadata: Metadata = { title: "Customer" };

type Related = {
  addresses: {
    id: number;
    label: string;
    address_line: string;
    city: string;
    state: string;
    is_default: boolean;
  }[];
  quotes: Quote[];
  opportunities: Opportunity[];
  leads: Lead[];
  projects: Project[];
  appointments: Appointment[];
  surveys: Survey[];
  tasks: Task[];
  activities: Activity[];
};

type Stats = {
  lifetime_value: number;
  open_quote_value: number;
  open_pipeline_value: number;
  calculations: number;
  visualizations: number;
  favorites: number;
};

/**
 * The customer 360 (§15): enquiries, quotes, conversations, projects,
 * measurements, installations and activity in one record.
 */
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!can(session, "customers.view")) return <NoAccess what="customers" />;

  const { id } = await params;
  const [{ data: customer, related, stats }, lookups] = await Promise.all([
    adminGet<{ data: Customer; related: Related; stats: Stats }>(`customers/${Number(id)}`),
    getLookups(),
  ]);

  const contact = [
    customer.phone && { href: `tel:${toE164(customer.phone)}`, icon: Phone, label: customer.phone },
    customer.whatsapp && {
      href: whatsAppLink(customer.whatsapp),
      icon: MessageCircle,
      label: "WhatsApp",
    },
    customer.email && { href: `mailto:${customer.email}`, icon: Mail, label: customer.email },
  ].filter(Boolean) as { href: string; icon: typeof Phone; label: string }[];

  return (
    <>
      <PageHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        eyebrow={customer.customer_type_label}
        title={customer.full_name}
        description={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {contact.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <item.icon className="h-3.5 w-3.5" aria-hidden /> {item.label}
              </a>
            ))}
          </span>
        }
        actions={
          <>
            {can(session, "customers.update") && (
              <FormDialog
                wide
                title="Edit customer"
                trigger={
                  <button
                    type="button"
                    className="btn btn-outline h-9 rounded-md bg-background px-4 text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                  </button>
                }
                fields={customerFields(lookups, { canAssign: !session.scopes.own_records_only })}
                initial={customer}
                endpoint={`customers/${customer.id}`}
                method="PATCH"
              />
            )}
            {can(session, "quotes.create") && (
              <Link
                href={`/admin/quotes?new=1&customer=${customer.id}`}
                className="btn btn-primary h-9 rounded-md px-4 text-xs"
              >
                New quote
              </Link>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Lifetime value" value={naira(stats.lifetime_value)} detail="Quotes won" />
        <StatTile
          label="Open quotes"
          value={naira(stats.open_quote_value)}
          detail={`${related.quotes.filter((quote) => !["won", "lost", "expired"].includes(quote.status)).length} awaiting a decision`}
        />
        <StatTile
          label="Open deals"
          value={naira(stats.open_pipeline_value)}
          detail={`${related.opportunities.filter((deal) => !["won", "lost"].includes(deal.stage)).length} on the pipeline`}
        />
        <StatTile
          label="On the website"
          value={customer.account ? "Registered" : "No account"}
          detail={
            customer.account
              ? `${stats.visualizations} visualizations · ${stats.calculations} calculations · ${stats.favorites} saved`
              : "Guest enquiries only"
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Quotes" padded={false}>
            <DataTable
              caption="Quotes"
              rows={related.quotes}
              empty={<p className="p-5 text-sm text-muted-foreground">No quotes yet.</p>}
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
                  key: "project",
                  header: "Project",
                  className: "max-md:hidden",
                  cell: (quote) => quote.project_type ?? "—",
                },
                {
                  key: "date",
                  header: "Requested",
                  className: "whitespace-nowrap max-sm:hidden",
                  cell: (quote) => formatDate(quote.submitted_at ?? quote.created_at),
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

          <Panel
            title="Deals"
            padded={false}
            actions={
              can(session, "opportunities.create") && (
                <FormDialog
                  title="New deal"
                  trigger={
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      + Add deal
                    </button>
                  }
                  fields={opportunityFields(lookups, { customerLabel: customer.full_name })}
                  initial={{
                    customer_profile_id: customer.id,
                    stage: "qualified",
                    owner_id: customer.owner_id,
                  }}
                  endpoint="opportunities"
                  successMessage="Deal added."
                />
              )
            }
          >
            <DataTable
              caption="Deals"
              rows={related.opportunities}
              empty={<p className="p-5 text-sm text-muted-foreground">No deals on the pipeline.</p>}
              columns={[
                {
                  key: "title",
                  header: "Deal",
                  cell: (deal) => (
                    <Link
                      href={`/admin/pipeline/${deal.id}`}
                      className="font-medium hover:underline"
                    >
                      {deal.title}
                    </Link>
                  ),
                },
                {
                  key: "owner",
                  header: "Owner",
                  className: "max-md:hidden",
                  cell: (deal) => deal.owner?.name ?? "—",
                },
                {
                  key: "value",
                  header: "Value",
                  className: "text-right tabular-nums",
                  cell: (deal) => naira(deal.value),
                },
                {
                  key: "stage",
                  header: "Stage",
                  cell: (deal) => <StatusBadge value={deal.stage} label={deal.stage_label} />,
                },
              ]}
            />
          </Panel>

          {(related.projects.length > 0 || related.surveys.length > 0) && (
            <Panel title="Projects & surveys">
              <ul className="divide-y divide-border text-sm">
                {related.projects.map((project) => (
                  <li
                    key={`p${project.id}`}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="min-w-0 truncate font-medium hover:underline"
                    >
                      {project.reference} · {project.name}
                    </Link>
                    <StatusBadge value={project.status} label={project.status_label} />
                  </li>
                ))}
                {related.surveys.map((survey) => (
                  <li
                    key={`s${survey.id}`}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <Link
                      href={`/admin/surveys/${survey.id}`}
                      className="min-w-0 truncate hover:underline"
                    >
                      Site survey · {survey.total_area_sqm} m² measured ·{" "}
                      {formatDate(survey.scheduled_at)}
                    </Link>
                    <StatusBadge value={survey.status} label={survey.status_label} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel
            title="Timeline"
            description="Calls, notes and changes across this customer's quotes, deals and projects"
          >
            <ActivityPanel
              subjectType="customer_profile"
              subjectId={customer.id}
              activities={related.activities}
              canLog={can(session, "activities.create")}
            />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Details">
            <Facts
              columns={1}
              items={[
                { label: "Owner", value: customer.owner?.name ?? "Unassigned" },
                {
                  label: "Company",
                  value: customer.company ? (
                    <Link
                      href={`/admin/companies/${customer.company.id}`}
                      className="hover:underline"
                    >
                      {customer.company.name}
                    </Link>
                  ) : null,
                },
                {
                  label: "Address",
                  value:
                    [customer.address_line, customer.city, customer.state]
                      .filter(Boolean)
                      .join(", ") || null,
                },
                { label: "First came from", value: customer.lead_source },
                { label: "Prefers", value: customer.preferred_contact_channel },
                {
                  label: "Marketing",
                  value: customer.marketing_opt_in ? "Opted in" : "Not opted in",
                },
                {
                  label: "Last contacted",
                  value: customer.last_contacted_at
                    ? formatDateTime(customer.last_contacted_at)
                    : "Never",
                },
                {
                  label: "Online account",
                  value: customer.account
                    ? `${customer.account.email}${customer.account.email_verified ? "" : " (unverified)"}`
                    : "None",
                },
              ]}
            />
            {customer.notes && (
              <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm">
                {customer.notes}
              </p>
            )}
          </Panel>

          <Panel title="Follow-ups">
            <TaskList
              tasks={related.tasks}
              subject={{ type: "customer_profile", id: customer.id }}
              staff={staffOptions(lookups)}
              canCreate={can(session, "tasks.create")}
              canUpdate={can(session, "tasks.update")}
              showSubject
            />
          </Panel>

          {related.appointments.length > 0 && (
            <Panel title="Appointments">
              <ul className="divide-y divide-border text-sm">
                {related.appointments.map((appointment) => (
                  <li key={appointment.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{appointment.type_label}</span>
                      <StatusBadge value={appointment.status} label={appointment.status_label} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(appointment.scheduled_at, appointment.ends_at)}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {related.addresses.length > 0 && (
            <Panel title="Saved addresses">
              <ul className="space-y-2 text-sm">
                {related.addresses.map((address) => (
                  <li key={address.id}>
                    <span className="font-medium">{address.label}</span>
                    {address.is_default && (
                      <span className="ml-2 text-xs text-muted-foreground">Default</span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {[address.address_line, address.city, address.state].join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {related.leads.length > 0 && (
            <Panel title="Enquiries">
              <ul className="divide-y divide-border text-sm">
                {related.leads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="min-w-0 truncate hover:underline"
                    >
                      {lead.source_label} · {formatDate(lead.created_at)}
                    </Link>
                    <StatusBadge value={lead.status} label={lead.status_label} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {can(session, "customers.delete") &&
            related.quotes.length === 0 &&
            related.projects.length === 0 && (
              <ConfirmAction
                endpoint={`customers/${customer.id}`}
                title={`Delete ${customer.full_name}?`}
                description="This removes the customer and their enquiries. It cannot be undone."
                redirectTo="/admin/customers"
                success="Customer deleted."
              >
                Delete customer
              </ConfirmAction>
            )}
        </div>
      </div>
    </>
  );
}
