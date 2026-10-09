import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Pencil, Phone } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { installationFields } from "@/lib/admin/fields";
import { formatDateTime, toE164 } from "@/lib/format";
import { ActivityPanel } from "@/components/admin/activity";
import { FormDialog } from "@/components/admin/forms";
import { InstallationJobSheet, PhotoUploader } from "@/components/admin/operations";
import { Facts, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import type { Activity, Installation } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Installation" };

/**
 * One installation job. Operations plan it here; the crew update progress,
 * tick the checklist, add photos and take the customer's sign-off on site.
 */
export default async function InstallationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!can(session, "installations.view")) return <NoAccess what="installations" />;

  const { id } = await params;
  const [{ data: job, related }, lookups] = await Promise.all([
    adminGet<{ data: Installation; related: { activities: Activity[] } }>(
      `installations/${Number(id)}`,
    ),
    getLookups(),
  ]);

  const canPlan = can(session, "installations.update");
  const canWork = canPlan || can(session, "installations.field-update");
  const address = [job.project?.address_line, job.project?.city, job.project?.state]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        back={{
          href: "/admin/installations",
          label: session.scopes.assigned_jobs_only ? "My jobs" : "Installations",
        }}
        eyebrow={`Installation #${job.id}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {job.project?.name ?? "Installation"}{" "}
            <StatusBadge value={job.status} label={job.status_label} />
          </span>
        }
        description={`${formatDateTime(job.scheduled_start)}${job.scheduled_end ? ` → ${formatDateTime(job.scheduled_end)}` : ""}`}
        actions={
          canPlan && (
            <FormDialog
              wide
              title="Plan this installation"
              trigger={
                <button
                  type="button"
                  className="btn btn-outline h-9 rounded-md bg-background px-4 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Schedule & crew
                </button>
              }
              fields={installationFields(lookups)}
              initial={{ ...job, crew: job.crew.map((member) => member.id) }}
              endpoint={`installations/${job.id}`}
              method="PATCH"
            />
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Job sheet">
            <InstallationJobSheet
              key={`${job.status}:${JSON.stringify(job.checklist)}:${job.signed_off_at}`}
              installationId={job.id}
              status={job.status}
              checklist={job.checklist}
              notes={job.notes}
              signOffName={job.sign_off_name}
              signedOffAt={job.signed_off_at}
              editable={canWork && job.status !== "cancelled"}
            />
          </Panel>
          <Panel title="Photos">
            <PhotoUploader
              type="installation"
              id={job.id}
              photos={job.photos ?? []}
              collections={[
                { value: "before", label: "Before" },
                { value: "after", label: "After" },
                { value: "gallery", label: "Progress" },
              ]}
              editable={canWork}
            />
          </Panel>
          <Panel title="Timeline">
            <ActivityPanel
              subjectType="installation"
              subjectId={job.id}
              activities={related.activities}
              canLog={can(session, "activities.create")}
            />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Site">
            <Facts
              columns={1}
              items={[
                { label: "Customer", value: job.customer?.full_name },
                {
                  label: "Phone",
                  value: job.customer?.phone && (
                    <a
                      href={`tel:${toE164(job.customer.phone)}`}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden /> {job.customer.phone}
                    </a>
                  ),
                },
                {
                  label: "Address",
                  value: address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-start gap-1 hover:underline"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {address}
                    </a>
                  ),
                },
                {
                  label: "Project",
                  value:
                    job.project &&
                    (can(session, "projects.view") ? (
                      <Link href={`/admin/projects/${job.project.id}`} className="hover:underline">
                        {job.project.reference}
                      </Link>
                    ) : (
                      job.project.reference
                    )),
                },
              ]}
            />
          </Panel>
          <Panel title="Crew">
            <Facts
              columns={1}
              items={[
                { label: "Lead installer", value: job.lead_installer?.name ?? "Not assigned" },
                {
                  label: "Crew",
                  value:
                    job.crew.length > 0 ? job.crew.map((member) => member.name).join(", ") : "None",
                },
                {
                  label: "Completed",
                  value: job.completed_at ? formatDateTime(job.completed_at) : "Not yet",
                },
              ]}
            />
            {job.warranty_notes && (
              <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm">
                {job.warranty_notes}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
