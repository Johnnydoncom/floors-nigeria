import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Pencil, Phone } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { surveyFields } from "@/lib/admin/fields";
import { formatDateTime, toE164 } from "@/lib/format";
import { ActivityPanel } from "@/components/admin/activity";
import { ActionButton } from "@/components/admin/actions";
import { FormDialog } from "@/components/admin/forms";
import { MeasurementsEditor, PhotoUploader } from "@/components/admin/operations";
import { Facts, NoAccess, PageHeader, Panel } from "@/components/admin/ui";
import type { Activity, Survey } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Site survey" };

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!can(session, "surveys.view")) return <NoAccess what="site surveys" />;

  const { id } = await params;
  const [{ data: survey, related }, lookups] = await Promise.all([
    adminGet<{ data: Survey; related: { activities: Activity[] } }>(`surveys/${Number(id)}`),
    getLookups(),
  ]);

  const isSurveyor = survey.surveyor_id === session.user.id;
  const canUpdate =
    can(session, "surveys.update") || (can(session, "measurements.create") && isSurveyor);
  const canMeasure =
    can(session, "measurements.create") && (can(session, "surveys.update") || isSurveyor);
  const address = [survey.customer?.address_line, survey.customer?.city, survey.customer?.state]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        back={{ href: "/admin/surveys", label: "Site surveys" }}
        eyebrow={survey.status_label}
        title={`Survey for ${survey.customer?.full_name ?? "customer"}`}
        description={formatDateTime(survey.scheduled_at)}
        actions={
          <>
            {canUpdate && survey.status !== "completed" && (
              <ActionButton
                endpoint={`surveys/${survey.id}`}
                method="PATCH"
                body={{ status: "completed" }}
                variant="primary"
                success="Survey completed — the quote moves to Measured."
              >
                Mark completed
              </ActionButton>
            )}
            {canUpdate && (
              <FormDialog
                wide
                title="Edit survey"
                trigger={
                  <button
                    type="button"
                    className="btn btn-outline h-9 rounded-md bg-background px-4 text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                  </button>
                }
                fields={surveyFields(lookups).filter(
                  (field) => can(session, "surveys.update") || field.name !== "surveyor_id",
                )}
                initial={survey}
                endpoint={`surveys/${survey.id}`}
                method="PATCH"
              />
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Measurements" description="Net area is what the quote is priced on.">
            <MeasurementsEditor
              surveyId={survey.id}
              measurements={survey.measurements ?? []}
              editable={canMeasure}
            />
          </Panel>
          <Panel title="Findings">
            <Facts
              items={[
                { label: "Subfloor", value: survey.subfloor_condition },
                { label: "Access", value: survey.access_notes },
                { label: "Preparation needed", value: survey.preparation_notes },
                { label: "Findings", value: survey.findings },
              ]}
            />
          </Panel>
          <Panel title="Photos">
            <PhotoUploader
              type="site_survey"
              id={survey.id}
              photos={survey.photos ?? []}
              collections={[{ value: "gallery", label: "Site photo" }]}
              editable={canMeasure}
            />
          </Panel>
          <Panel title="Timeline">
            <ActivityPanel
              subjectType="site_survey"
              subjectId={survey.id}
              activities={related.activities}
              canLog={can(session, "activities.create")}
            />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Visit">
            <Facts
              columns={1}
              items={[
                {
                  label: "Customer",
                  value:
                    survey.customer &&
                    (can(session, "customers.view") ? (
                      <Link
                        href={`/admin/customers/${survey.customer.id}`}
                        className="hover:underline"
                      >
                        {survey.customer.full_name}
                      </Link>
                    ) : (
                      survey.customer.full_name
                    )),
                },
                {
                  label: "Phone",
                  value: survey.customer?.phone && (
                    <a
                      href={`tel:${toE164(survey.customer.phone)}`}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden /> {survey.customer.phone}
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
                { label: "Surveyor", value: survey.surveyor?.name ?? "Unassigned" },
                { label: "Scheduled", value: formatDateTime(survey.scheduled_at) },
                {
                  label: "Completed",
                  value: survey.completed_at ? formatDateTime(survey.completed_at) : "Not yet",
                },
                {
                  label: "Quote",
                  value:
                    survey.quote &&
                    (can(session, "quotes.view") ? (
                      <Link href={`/admin/quotes/${survey.quote.id}`} className="hover:underline">
                        {survey.quote.reference}
                      </Link>
                    ) : (
                      survey.quote.reference
                    )),
                },
                {
                  label: "Project",
                  value: survey.project && (
                    <Link href={`/admin/projects/${survey.project.id}`} className="hover:underline">
                      {survey.project.reference}
                    </Link>
                  ),
                },
              ]}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
