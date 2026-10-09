import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import {
  appointmentFields,
  installationFields,
  projectFields,
  staffOptions,
} from "@/lib/admin/fields";
import { formatDate, formatDateTime, naira, number } from "@/lib/format";
import { ActivityPanel, TaskList } from "@/components/admin/activity";
import { ConfirmAction } from "@/components/admin/actions";
import { FormDialog } from "@/components/admin/forms";
import { PhotoUploader } from "@/components/admin/operations";
import { Facts, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import type {
  Activity,
  Appointment,
  Installation,
  Measurement,
  Project,
  Survey,
  Task,
} from "@/lib/admin/types";

export const metadata: Metadata = { title: "Project" };

type Related = {
  installations: Installation[];
  surveys: Survey[];
  measurements: Measurement[];
  appointments: Appointment[];
  activities: Activity[];
  tasks: Task[];
};

/** The job file: installations, surveys, measurements, photos and history. */
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!can(session, "projects.view")) return <NoAccess what="projects" />;

  const { id } = await params;
  const [{ data: project, related }, lookups] = await Promise.all([
    adminGet<{ data: Project; related: Related }>(`projects/${Number(id)}`),
    getLookups(),
  ]);

  const measured = related.surveys.reduce((sum, survey) => sum + survey.total_area_sqm, 0);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/projects", label: "Projects" }}
        eyebrow={project.reference}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {project.name} <StatusBadge value={project.status} label={project.status_label} />
          </span>
        }
        description={
          project.customer &&
          (can(session, "customers.view") ? (
            <Link
              href={`/admin/customers/${project.customer.id}`}
              className="hover:text-foreground"
            >
              {project.customer.full_name}
            </Link>
          ) : (
            project.customer.full_name
          ))
        }
        actions={
          can(session, "projects.update") && (
            <FormDialog
              wide
              title="Edit project"
              trigger={
                <button
                  type="button"
                  className="btn btn-outline h-9 rounded-md bg-background px-4 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                </button>
              }
              fields={projectFields(lookups)}
              initial={project}
              endpoint={`projects/${project.id}`}
              method="PATCH"
            />
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel
            title="Installations"
            actions={
              can(session, "installations.create") && (
                <FormDialog
                  wide
                  title="Schedule an installation"
                  description="Starts with the standard sign-off checklist."
                  trigger={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden /> Schedule
                    </button>
                  }
                  fields={installationFields(lookups).filter((field) => field.name !== "status")}
                  initial={{
                    scheduled_start: project.start_date
                      ? `${project.start_date}T08:00:00`
                      : undefined,
                  }}
                  extra={{ project_id: project.id, quote_id: project.quote_id }}
                  endpoint="installations"
                  successMessage="Installation scheduled."
                />
              )
            }
          >
            {related.installations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No installation scheduled yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {related.installations.map((installation) => (
                  <li
                    key={installation.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div>
                      <Link
                        href={`/admin/installations/${installation.id}`}
                        className="font-medium hover:underline"
                      >
                        Installation #{installation.id}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(installation.scheduled_start)} ·{" "}
                        {installation.lead_installer?.name ?? "No lead installer"}
                        {installation.crew.length > 0 && ` + ${installation.crew.length} crew`}
                      </p>
                    </div>
                    <StatusBadge value={installation.status} label={installation.status_label} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Measurements"
            description={
              measured > 0
                ? `${number(measured)} m² measured across ${related.surveys.length} survey(s)`
                : undefined
            }
          >
            {related.surveys.length === 0 && related.measurements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No survey on this project.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {related.surveys.map((survey) => (
                  <li key={survey.id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link href={`/admin/surveys/${survey.id}`} className="hover:underline">
                      Survey · {formatDate(survey.scheduled_at)} · {number(survey.total_area_sqm)}{" "}
                      m²
                    </Link>
                    <StatusBadge value={survey.status} label={survey.status_label} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Photos"
            description="Before, after and progress shots — also used for the portfolio."
          >
            <PhotoUploader
              type="project"
              id={project.id}
              photos={project.photos ?? []}
              collections={[
                { value: "before", label: "Before" },
                { value: "after", label: "After" },
                { value: "gallery", label: "Progress" },
              ]}
              editable={can(session, "projects.update")}
            />
          </Panel>

          <Panel title="Timeline">
            <ActivityPanel
              subjectType="project"
              subjectId={project.id}
              activities={related.activities}
              canLog={can(session, "activities.create")}
            />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Job">
            <Facts
              columns={1}
              items={[
                { label: "Value", value: naira(project.value) },
                {
                  label: "Quote",
                  value:
                    project.quote &&
                    (can(session, "quotes.view") ? (
                      <Link href={`/admin/quotes/${project.quote.id}`} className="hover:underline">
                        {project.quote.reference}
                      </Link>
                    ) : (
                      project.quote.reference
                    )),
                },
                { label: "Owner", value: project.owner?.name ?? "Unassigned" },
                {
                  label: "Site",
                  value:
                    [project.address_line, project.city, project.state]
                      .filter(Boolean)
                      .join(", ") || null,
                },
                { label: "Start", value: formatDate(project.start_date) },
                { label: "Finish", value: formatDate(project.end_date) },
              ]}
            />
            {project.notes && (
              <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm">
                {project.notes}
              </p>
            )}
          </Panel>

          <Panel
            title="Appointments"
            actions={
              can(session, "appointments.create") && (
                <FormDialog
                  wide
                  title="Book an appointment"
                  trigger={
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      + Book
                    </button>
                  }
                  fields={appointmentFields(lookups, {
                    customerLabel: project.customer?.full_name,
                    creating: true,
                  }).filter((field) => field.name !== "quote_id")}
                  initial={{
                    type: "delivery",
                    customer_profile_id: project.customer_profile_id,
                    address_line: project.address_line,
                    city: project.city,
                    state: project.state,
                  }}
                  extra={{ project_id: project.id, quote_id: project.quote_id }}
                  endpoint="appointments"
                  successMessage="Appointment booked."
                />
              )
            }
          >
            {related.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing booked.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {related.appointments.map((appointment) => (
                  <li key={appointment.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span>{appointment.type_label}</span>
                      <StatusBadge value={appointment.status} label={appointment.status_label} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(appointment.scheduled_at, appointment.ends_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Follow-ups">
            <TaskList
              tasks={related.tasks}
              subject={{ type: "project", id: project.id }}
              staff={staffOptions(lookups)}
              canCreate={can(session, "tasks.create")}
              canUpdate={can(session, "tasks.update")}
            />
          </Panel>

          {can(session, "projects.delete") && (
            <ConfirmAction
              endpoint={`projects/${project.id}`}
              title={`Delete ${project.reference}?`}
              description="Its installations go with it. The quote is kept."
              redirectTo="/admin/projects"
              success="Project deleted."
            >
              Delete project
            </ConfirmAction>
          )}
        </div>
      </div>
    </>
  );
}
