import type { Metadata } from "next";
import { Download } from "lucide-react";
import { adminGet, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { naira, number } from "@/lib/format";
import { BarList, ColumnChart } from "@/components/admin/charts";
import { FilterBar } from "@/components/admin/FilterBar";
import { NoAccess, PageHeader, Panel, StatusTabs, first } from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { Report, ReportColumn } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Reports" };

function cell(column: ReportColumn, value: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";
  if (column.type === "money") return naira(Number(value));
  if (column.type === "percent") return `${value}%`;
  if (column.type === "number") return number(Number(value));
  return String(value);
}

/** Reports and CSV export (§15, §36), over a chosen date range. */
export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "reports.view")) return <NoAccess what="reports" />;

  const query = await searchParams;
  const { data: reports } = await adminGet<{ data: { key: string; title: string }[] }>("reports");
  const key = reports.some((report) => report.key === first(query.report))
    ? first(query.report)!
    : reports[0].key;
  const range = { from: first(query.from), to: first(query.to) };
  const { data: report } = await adminGet<{ data: Report }>(`reports/${key}`, range);

  const csv = `/api/admin/reports/${key}?${new URLSearchParams({ format: "csv", ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) })}`;
  const label = report.columns[0];
  const measure =
    report.columns.find((column) => column.type === "money") ??
    report.columns.find((column) => column.type === "number");
  const timeSeries = label?.key === "month";

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${report.title}, ${report.from} to ${report.to}.`}
        actions={
          <a
            href={csv}
            className="btn btn-outline h-9 rounded-md bg-background px-4 text-xs"
            download
          >
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </a>
        }
      />
      <StatusTabs
        path="/admin/reports"
        param="report"
        query={{ ...query, report: key }}
        tabs={reports.map((report) => ({ value: report.key, label: report.title }))}
      />
      <FilterBar
        search={false}
        filters={[
          { type: "date", name: "from", label: "From" },
          { type: "date", name: "to", label: "To" },
        ]}
      />

      <div className="space-y-6">
        {measure && label && report.rows.length > 0 && (
          <Panel
            title={measure.label}
            description={timeSeries ? "By month" : `By ${label.label.toLowerCase()}`}
          >
            {timeSeries ? (
              <ColumnChart
                kind={measure.type === "money" ? "money" : "count"}
                label={`${measure.label} by month`}
                points={report.rows.map((row) => ({
                  label: String(row[label.key]),
                  value: Number(row[measure.key] ?? 0),
                }))}
              />
            ) : (
              <BarList
                kind={measure.type === "money" ? "money" : "count"}
                label={`${measure.label} by ${label.label.toLowerCase()}`}
                items={report.rows
                  .filter((row) => Number(row[measure.key] ?? 0) > 0)
                  .slice(0, 12)
                  .map((row) => ({
                    key: String(row[label.key]),
                    label: String(row[label.key] ?? "—"),
                    value: Number(row[measure.key] ?? 0),
                  }))}
              />
            )}
          </Panel>
        )}

        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <caption className="sr-only">{report.title}</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                {report.columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`whitespace-nowrap px-4 py-2.5 font-medium ${column.type === "text" ? "" : "text-right"}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, index) => (
                <tr key={index} className="border-b border-border last:border-0">
                  {report.columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-2.5 ${column.type === "text" ? "" : "text-right tabular-nums"}`}
                    >
                      {cell(column, row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {report.rows.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">Nothing in this period.</p>
          )}
        </div>
        {!can(session, "reports.financial") && !can(session, "quotes.view") && (
          <p className="text-xs text-muted-foreground">Money columns are hidden for your role.</p>
        )}
      </div>
    </>
  );
}
