"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, GripVertical, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminRequest, AdminRequestError } from "@/lib/admin/client";
import { compactNaira } from "@/lib/admin/format";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { inputClass } from "./forms";
import type { BoardColumn, Opportunity, StageOption } from "@/lib/admin/types";

/**
 * The sales pipeline as a Kanban board (§16). Drag a card to another column
 * to move the deal; on touch screens and keyboards, the stage menu on each
 * card does the same. Moving to Lost asks why.
 */
export function PipelineBoard({
  columns: initial,
  stages,
  canMove,
}: {
  columns: BoardColumn[];
  stages: StageOption[];
  canMove: boolean;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState(initial);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [lost, setLost] = useState<{ deal: Opportunity } | null>(null);
  const [reason, setReason] = useState("");

  function locate(id: number): Opportunity | undefined {
    return columns.flatMap((column) => column.cards).find((card) => card.id === id);
  }

  async function move(deal: Opportunity, stage: string, lostReason?: string) {
    if (deal.stage === stage) return;

    if (stage === "lost" && !lostReason) {
      setReason("");
      setLost({ deal });
      return;
    }

    const previous = columns;
    const target = stages.find((option) => option.value === stage);

    // Optimistic: move the card now, roll back if the API refuses.
    setColumns((current) =>
      current.map((column) => {
        const without = column.cards.filter((card) => card.id !== deal.id);
        const removed = without.length !== column.cards.length;
        if (column.stage === stage) {
          return {
            ...column,
            count: column.count + 1,
            value: column.value + deal.value,
            cards: [
              {
                ...deal,
                stage,
                stage_label: target?.label ?? stage,
                probability: target?.probability ?? deal.probability,
              },
              ...without,
            ],
          };
        }
        return removed
          ? { ...column, count: column.count - 1, value: column.value - deal.value, cards: without }
          : column;
      }),
    );

    try {
      await adminRequest("POST", `opportunities/${deal.id}/move`, {
        stage,
        lost_reason: lostReason ?? null,
      });
      toast.success(`${deal.title} moved to ${target?.label ?? stage}.`);
      router.refresh();
    } catch (error) {
      setColumns(previous);
      toast.error(error instanceof AdminRequestError ? error.message : "Couldn't move the deal.");
    }
  }

  return (
    <>
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex min-w-max gap-3">
          {columns.map((column) => (
            <section
              key={column.stage}
              aria-label={column.label}
              onDragOver={(event) => {
                if (!canMove || dragging === null) return;
                event.preventDefault();
                setOver(column.stage);
              }}
              onDragLeave={() => setOver((current) => (current === column.stage ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                setOver(null);
                const deal = dragging !== null ? locate(dragging) : undefined;
                setDragging(null);
                if (deal) void move(deal, column.stage);
              }}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/40 transition-colors",
                over === column.stage && "border-foreground/40 bg-muted",
              )}
            >
              <header className="border-b border-border px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{column.label}</h2>
                  <span className="rounded bg-background px-1.5 text-[11px] tabular-nums text-muted-foreground">
                    {column.count}
                  </span>
                </div>
                <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                  {compactNaira(column.value)} · {column.probability}% likely
                </p>
              </header>
              <ol className="flex max-h-[calc(100vh-15rem)] min-h-24 flex-col gap-2 overflow-y-auto p-2">
                {column.cards.map((deal) => (
                  <li
                    key={deal.id}
                    draggable={canMove}
                    onDragStart={(event) => {
                      setDragging(deal.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragging(null)}
                    className={cn(
                      "rounded-md border border-border bg-background p-3 text-sm shadow-sm",
                      dragging === deal.id && "opacity-50",
                      canMove && "cursor-grab active:cursor-grabbing",
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      {canMove && (
                        <GripVertical
                          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60"
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/pipeline/${deal.id}`}
                          className="line-clamp-2 font-medium leading-snug hover:underline"
                        >
                          {deal.title}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {deal.customer?.full_name}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold tabular-nums">{compactNaira(deal.value)}</span>
                      <span className="inline-flex items-center gap-1 truncate text-muted-foreground">
                        <UserRound className="h-3 w-3" aria-hidden />{" "}
                        {deal.owner?.name ?? "Unassigned"}
                      </span>
                    </div>
                    {deal.expected_close_date && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CalendarClock className="h-3 w-3" aria-hidden /> Closes{" "}
                        {formatDate(deal.expected_close_date)}
                      </p>
                    )}
                    {canMove && (
                      <select
                        aria-label={`Move ${deal.title} to stage`}
                        value={deal.stage}
                        onChange={(event) => void move(deal, event.target.value)}
                        className="mt-2 h-7 w-full rounded border border-input bg-background px-1.5 text-xs"
                      >
                        {stages.map((stage) => (
                          <option key={stage.value} value={stage.value}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                ))}
                {column.count > column.cards.length && (
                  <li className="px-1 text-center text-[11px] text-muted-foreground">
                    +{column.count - column.cards.length} more —{" "}
                    <Link
                      href={`/admin/pipeline?view=list&stage=${column.stage}`}
                      className="underline"
                    >
                      see list
                    </Link>
                  </li>
                )}
              </ol>
            </section>
          ))}
        </div>
      </div>

      <Dialog open={lost !== null} onOpenChange={(open) => !open && setLost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why was it lost?</DialogTitle>
            <DialogDescription>
              It feeds the conversion report, so the team can see what to fix.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!lost || !reason.trim()) return;
              const deal = lost.deal;
              setLost(null);
              void move(deal, "lost", reason.trim());
            }}
            className="space-y-4"
          >
            <input
              autoFocus
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Chose a cheaper tile supplier"
              aria-label="Reason"
              className={inputClass}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLost(null)}
                className="btn btn-outline h-9 rounded-md px-4 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reason.trim()}
                className="btn btn-primary h-9 rounded-md px-4 text-xs"
              >
                Mark as lost
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
