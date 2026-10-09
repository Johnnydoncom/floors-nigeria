import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Pencil, Plus } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { appointmentFields, staffOptions } from "@/lib/admin/fields";
import { clock } from "@/lib/admin/format";
import { InlineSelect } from "@/components/admin/actions";
import { FilterBar } from "@/components/admin/FilterBar";
import { FormDialog } from "@/components/admin/forms";
import { EmptyState, NoAccess, PageHeader, StatusBadge, withQuery } from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, Appointment } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Appointments" };

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayLabel = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const rangeLabel = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function shift(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/**
 * Consultations, site surveys, deliveries, installations and showroom visits
 * for a four-week window, in Lagos time.
 */
export default async function AppointmentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "appointments.view")) return <NoAccess what="appointments" />;

  const query = await searchParams;
  const [list, lookups] = await Promise.all([
    adminGet<AdminList<Appointment> & { range: { from: string; to: string } }>(
      "appointments",
      query,
    ),
    getLookups(),
  ]);

  const days = new Map<string, Appointment[]>();
  for (const appointment of list.data) {
    if (!appointment.scheduled_at) continue;
    const key = dayKey.format(new Date(appointment.scheduled_at));
    days.set(key, [...(days.get(key) ?? []), appointment]);
  }

  const span = 28;
  const canUpdate = can(session, "appointments.update");
  const scoped = session.scopes.own_records_only || session.scopes.assigned_jobs_only;

  return (
    <>
      <PageHeader
        title="Appointments"
        description={`${rangeLabel.format(new Date(`${list.range.from}T00:00:00Z`))} – ${rangeLabel.format(new Date(`${list.range.to}T00:00:00Z`))}`}
        actions={
          <>
            <Link
              href={withQuery("/admin/appointments", query, {
                from: shift(list.range.from, -span),
                to: shift(list.range.from, -1),
              })}
              className="btn btn-outline h-9 rounded-md bg-background px-3 text-xs"
              aria-label="Earlier"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={withQuery("/admin/appointments", query, { from: null, to: null })}
              className="btn btn-outline h-9 rounded-md bg-background px-3 text-xs"
            >
              This week
            </Link>
            <Link
              href={withQuery("/admin/appointments", query, {
                from: shift(list.range.to, 1),
                to: shift(list.range.to, span),
              })}
              className="btn btn-outline h-9 rounded-md bg-background px-3 text-xs"
              aria-label="Later"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
            {can(session, "appointments.create") && (
              <FormDialog
                wide
                title="Book an appointment"
                description="A site-survey appointment also opens the survey record."
                trigger={
                  <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                    <Plus className="h-4 w-4" aria-hidden /> Book
                  </button>
                }
                fields={appointmentFields(lookups, { creating: true })}
                initial={{ type: "consultation", assigned_to: session.user.id }}
                endpoint="appointments"
                successMessage="Appointment booked."
              />
            )}
          </>
        }
      />

      <FilterBar
        search={false}
        filters={[
          { type: "select", name: "type", label: "Kinds", options: lookups.enums.appointment_type },
          {
            type: "select",
            name: "status",
            label: "Statuses",
            options: lookups.enums.appointment_status,
          },
          ...(scoped
            ? []
            : [
                {
                  type: "select" as const,
                  name: "assigned",
                  label: "Staff",
                  options: [{ value: "me", label: "Mine" }, ...staffOptions(lookups)],
                },
              ]),
        ]}
      />

      {days.size === 0 ? (
        <EmptyState icon={CalendarDays} title="Nothing booked in this window" />
      ) : (
        <div className="space-y-6">
          {[...days.entries()].map(([key, appointments]) => (
            <section key={key}>
              <h2 className="mb-2 text-sm font-semibold">
                {dayLabel.format(new Date(appointments[0].scheduled_at!))}
              </h2>
              <ul className="divide-y divide-border rounded-lg border border-border bg-background">
                {appointments.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="grid gap-2 p-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <p className="text-sm font-semibold tabular-nums">
                      {clock(appointment.scheduled_at)}
                      {appointment.ends_at && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          to {clock(appointment.ends_at)}
                        </span>
                      )}
                    </p>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium">
                        {appointment.type_label} ·{" "}
                        {appointment.customer ? (
                          <Link
                            href={`/admin/customers/${appointment.customer.id}`}
                            className="hover:underline"
                          >
                            {appointment.customer.full_name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </p>
                      <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {appointment.assignee && <span>With {appointment.assignee.name}</span>}
                        {(appointment.city || appointment.address_line) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" aria-hidden />{" "}
                            {[appointment.address_line, appointment.city, appointment.state]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                        {appointment.quote && (
                          <Link
                            href={`/admin/quotes/${appointment.quote.id}`}
                            className="hover:underline"
                          >
                            {appointment.quote.reference}
                          </Link>
                        )}
                        {appointment.customer?.phone && (
                          <a href={`tel:${appointment.customer.phone}`}>
                            {appointment.customer.phone}
                          </a>
                        )}
                      </p>
                      {appointment.notes && <p className="mt-1 text-xs">{appointment.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {canUpdate ? (
                        <InlineSelect
                          endpoint={`appointments/${appointment.id}`}
                          field="status"
                          label="Status"
                          value={appointment.status}
                          options={lookups.enums.appointment_status}
                        />
                      ) : (
                        <StatusBadge value={appointment.status} label={appointment.status_label} />
                      )}
                      {canUpdate && (
                        <FormDialog
                          wide
                          title="Edit appointment"
                          trigger={
                            <button
                              type="button"
                              aria-label="Edit appointment"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          }
                          fields={appointmentFields(lookups, {
                            customerLabel: appointment.customer?.full_name,
                          }).map((field) =>
                            field.name === "quote_id"
                              ? { ...field, searchLabel: appointment.quote?.reference }
                              : field,
                          )}
                          initial={appointment}
                          endpoint={`appointments/${appointment.id}`}
                          method="PATCH"
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
