import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Ruler } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { staffOptions, surveyFields } from "@/lib/admin/fields";
import { formatDateTime, number } from "@/lib/format";
import { FilterBar } from "@/components/admin/FilterBar";
import { FormDialog } from "@/components/admin/forms";
import {
  DataTable,
  EmptyState,
  NoAccess,
  PageHeader,
  Pagination,
  StatusBadge,
  StatusTabs,
} from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, Survey } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Site surveys" };

export default async function SurveysPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "surveys.view")) return <NoAccess what="site surveys" />;

  const query = await searchParams;
  const [list, lookups] = await Promise.all([
    adminGet<AdminList<Survey>>("surveys", query),
    getLookups(),
  ]);

  return (
    <>
      <PageHeader
        title="Site surveys"
        description={
          session.scopes.assigned_jobs_only
            ? "Surveys assigned to you."
            : "Site visits to measure rooms and check the subfloor before a quote is priced."
        }
        actions={
          can(session, "surveys.create") && (
            <FormDialog
              wide
              title="New site survey"
              description="Tip: booking a site-survey appointment creates the survey for you."
              trigger={
                <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                  <Plus className="h-4 w-4" aria-hidden /> New survey
                </button>
              }
              fields={surveyFields(lookups, { creating: true })}
              initial={{ status: "requested" }}
              endpoint="surveys"
              redirectTo="/admin/surveys/:id"
              successMessage="Survey created."
            />
          )
        }
      />
      <StatusTabs
        path="/admin/surveys"
        query={query}
        tabs={[{ value: "", label: "All" }, ...lookups.enums.survey_status]}
      />
      <FilterBar
        placeholder="Customer name"
        filters={
          session.scopes.assigned_jobs_only
            ? []
            : [
                {
                  type: "select",
                  name: "surveyor",
                  label: "Surveyors",
                  options: [
                    { value: "me", label: "Mine" },
                    { value: "none", label: "Unassigned" },
                    ...staffOptions(lookups),
                  ],
                },
              ]
        }
      />
      <DataTable
        caption="Site surveys"
        rows={list.data}
        empty={<EmptyState icon={Ruler} title="No surveys here" />}
        columns={[
          {
            key: "customer",
            header: "Customer",
            cell: (survey) => (
              <div>
                <Link href={`/admin/surveys/${survey.id}`} className="font-medium hover:underline">
                  {survey.customer?.full_name ?? `Survey #${survey.id}`}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {[survey.customer?.city, survey.customer?.state].filter(Boolean).join(", ")}
                </p>
              </div>
            ),
          },
          {
            key: "when",
            header: "When",
            className: "whitespace-nowrap",
            cell: (survey) => formatDateTime(survey.scheduled_at),
          },
          {
            key: "surveyor",
            header: "Surveyor",
            className: "max-md:hidden",
            cell: (survey) => survey.surveyor?.name ?? "Unassigned",
          },
          {
            key: "quote",
            header: "Quote",
            className: "max-lg:hidden",
            cell: (survey) =>
              survey.quote ? (
                <Link href={`/admin/quotes/${survey.quote.id}`} className="hover:underline">
                  {survey.quote.reference}
                </Link>
              ) : (
                "—"
              ),
          },
          {
            key: "area",
            header: "Measured",
            className: "text-right tabular-nums",
            cell: (survey) => (survey.total_area_sqm ? `${number(survey.total_area_sqm)} m²` : "—"),
          },
          {
            key: "status",
            header: "Status",
            cell: (survey) => <StatusBadge value={survey.status} label={survey.status_label} />,
          },
        ]}
      />
      <Pagination meta={list.meta} path="/admin/surveys" query={query} />
    </>
  );
}
