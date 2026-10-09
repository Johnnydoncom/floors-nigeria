import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { staffOptions } from "@/lib/admin/fields";
import { formatDateTime } from "@/lib/format";
import { FilterBar } from "@/components/admin/FilterBar";
import { EmptyState, NoAccess, PageHeader, Pagination } from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, AuditEntry } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Audit log" };

const RECORD_PATHS: Record<string, string> = {
  product: "/admin/products",
  quote: "/admin/quotes",
  opportunity: "/admin/pipeline",
};

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Who changed what, and when (§27). */
export default async function AuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "audit-logs.view")) return <NoAccess what="the audit log" />;

  const query = await searchParams;
  const [list, lookups] = await Promise.all([
    adminGet<AdminList<AuditEntry> & { filters: { types: string[]; events: string[] } }>(
      "audit-logs",
      query,
    ),
    getLookups(),
  ]);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Changes to products, variations, quotes, deals, settings and staff access, with who made them."
      />
      <FilterBar
        search={false}
        filters={[
          {
            type: "select",
            name: "type",
            label: "Records",
            options: list.filters.types.map((type) => ({
              value: type,
              label: type.replace(/_/g, " "),
            })),
          },
          {
            type: "select",
            name: "event",
            label: "Events",
            options: list.filters.events.map((event) => ({
              value: event,
              label: event.replace(/_/g, " "),
            })),
          },
          { type: "select", name: "user", label: "People", options: staffOptions(lookups) },
          { type: "date", name: "from", label: "From" },
          { type: "date", name: "to", label: "To" },
        ]}
      />
      {list.data.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nothing recorded for these filters" />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-background">
          {list.data.map((entry) => {
            const path = entry.auditable_type && RECORD_PATHS[entry.auditable_type];
            return (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2">
                    <span>
                      <span className="font-medium">{entry.user?.name ?? "System"}</span>{" "}
                      <span className="text-muted-foreground">
                        {entry.event.replace(/_/g, " ")}
                      </span>{" "}
                      {path ? (
                        <Link
                          href={`${path}/${entry.auditable_id}`}
                          className="font-medium hover:underline"
                        >
                          {entry.auditable_type?.replace(/_/g, " ")} #{entry.auditable_id}
                        </Link>
                      ) : (
                        <span className="font-medium">
                          {entry.auditable_type?.replace(/_/g, " ")} #{entry.auditable_id}
                        </span>
                      )}
                      {entry.changes.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          · {entry.changes.length} field{entry.changes.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                      {entry.ip_address && ` · ${entry.ip_address}`}
                    </span>
                  </summary>
                  {entry.changes.length > 0 && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th scope="col" className="py-1 pr-3 font-medium">
                              Field
                            </th>
                            <th scope="col" className="py-1 pr-3 font-medium">
                              Before
                            </th>
                            <th scope="col" className="py-1 font-medium">
                              After
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.changes.map((change) => (
                            <tr key={change.field} className="border-t border-border align-top">
                              <td className="py-1 pr-3 font-mono">{change.field}</td>
                              <td className="max-w-xs break-words py-1 pr-3 text-muted-foreground">
                                {show(change.old)}
                              </td>
                              <td className="max-w-xs break-words py-1">{show(change.new)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination meta={list.meta} path="/admin/audit-log" query={query} />
    </>
  );
}
