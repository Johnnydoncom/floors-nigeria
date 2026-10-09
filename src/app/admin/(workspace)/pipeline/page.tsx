import type { Metadata } from "next";
import Link from "next/link";
import { Columns3, List, Plus } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { opportunityFields, staffOptions } from "@/lib/admin/fields";
import { compactNaira } from "@/lib/admin/format";
import { formatDate, naira } from "@/lib/format";
import { FilterBar } from "@/components/admin/FilterBar";
import { FormDialog } from "@/components/admin/forms";
import { PipelineBoard } from "@/components/admin/PipelineBoard";
import {
  DataTable,
  NoAccess,
  PageHeader,
  Pagination,
  StatTile,
  StatusBadge,
  first,
  withQuery,
} from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, BoardColumn, Opportunity } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "opportunities.view")) return <NoAccess what="the sales pipeline" />;

  const query = await searchParams;
  const view = first(query.view) === "list" ? "list" : "board";
  const lookups = await getLookups();
  const ownOnly = session.scopes.own_records_only;

  const filters = (
    <FilterBar
      placeholder="Deal or customer"
      filters={[
        ...(ownOnly
          ? []
          : [
              {
                type: "select" as const,
                name: "owner",
                label: "Owners",
                options: [
                  { value: "me", label: "Mine" },
                  { value: "none", label: "Unassigned" },
                  ...staffOptions(lookups),
                ],
              },
            ]),
        { type: "select", name: "source", label: "Sources", options: lookups.enums.lead_source },
        ...(view === "list"
          ? [
              {
                type: "select" as const,
                name: "stage",
                label: "Stages",
                options: [{ value: "open", label: "All open" }, ...lookups.enums.opportunity_stage],
              },
            ]
          : []),
      ]}
    />
  );

  const header = (
    <PageHeader
      title="Pipeline"
      description="Every deal from new lead to won or lost. Drag a card to move it; the probability follows the stage."
      actions={
        <>
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            {(["board", "list"] as const).map((option) => (
              <Link
                key={option}
                href={withQuery("/admin/pipeline", query, {
                  view: option === "board" ? null : "list",
                  page: null,
                })}
                aria-current={view === option ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs",
                  view === option
                    ? "bg-charcoal-dark text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option === "board" ? (
                  <Columns3 className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <List className="h-3.5 w-3.5" aria-hidden />
                )}
                {option === "board" ? "Board" : "List"}
              </Link>
            ))}
          </div>
          {can(session, "opportunities.create") && (
            <FormDialog
              title="New deal"
              trigger={
                <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                  <Plus className="h-4 w-4" aria-hidden /> New deal
                </button>
              }
              fields={opportunityFields(lookups)}
              initial={{ stage: "new_lead" }}
              endpoint="opportunities"
              successMessage="Deal added."
            />
          )}
        </>
      }
    />
  );

  if (view === "list") {
    const list = await adminGet<AdminList<Opportunity>>("opportunities", query);

    return (
      <>
        {header}
        {filters}
        <DataTable
          caption="Deals"
          rows={list.data}
          columns={[
            {
              key: "title",
              header: "Deal",
              cell: (deal) => (
                <div>
                  <Link href={`/admin/pipeline/${deal.id}`} className="font-medium hover:underline">
                    {deal.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{deal.customer?.full_name}</p>
                </div>
              ),
            },
            {
              key: "owner",
              header: "Owner",
              className: "max-md:hidden",
              cell: (deal) => deal.owner?.name ?? "—",
            },
            {
              key: "close",
              header: "Closes",
              className: "max-lg:hidden whitespace-nowrap",
              cell: (deal) => formatDate(deal.expected_close_date),
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
              cell: (deal) => (
                <StatusBadge
                  value={deal.stage}
                  label={`${deal.stage_label} · ${deal.probability}%`}
                />
              ),
            },
          ]}
        />
        <Pagination meta={list.meta} path="/admin/pipeline" query={query} />
      </>
    );
  }

  const board = await adminGet<{
    data: BoardColumn[];
    meta: { open_count: number; open_value: number; weighted_value: number };
  }>("opportunities", {
    ...query,
    view: "board",
  });
  const won = board.data.find((column) => column.stage === "won");

  return (
    <>
      {header}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatTile label="Open deals" value={board.meta.open_count} />
        <StatTile
          label="Open value"
          value={compactNaira(board.meta.open_value)}
          detail={`${compactNaira(board.meta.weighted_value)} weighted by stage probability`}
        />
        <StatTile
          label="Won"
          value={compactNaira(won?.value ?? 0)}
          detail={`${won?.count ?? 0} deals`}
        />
      </div>
      {filters}
      <PipelineBoard
        key={board.data
          .map((column) =>
            column.cards.map((card) => `${card.id}:${card.stage}:${card.value}`).join(","),
          )
          .join("|")}
        columns={board.data}
        stages={lookups.enums.opportunity_stage}
        canMove={can(session, "opportunities.update")}
      />
    </>
  );
}
