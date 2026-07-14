"use client";

import {
  CalendarClock,
  Clapperboard,
  ListChecks,
  MoreHorizontal,
  Wallet,
} from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  DealFormDialog,
  type SponsorOption,
} from "@/domains/tracker/components/deal-form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CONTENT_DONE_STATUSES,
  CONTENT_TYPE_LABELS,
  DEAL_STATUS_DOT_CLASSES,
  DEAL_STATUS_LABELS,
  DEAL_STATUSES,
  TERMINAL_DEAL_STATUSES,
  type DealStatus,
} from "@/core/config/deals";
import { dueUrgency, formatShortDate, type DueUrgency } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { daysPastDue, isPaymentOverdue } from "@/domains/tracker/payments";
import {
  deleteDealAction,
  updateDealStatusAction,
} from "@/domains/tracker/actions";
import { DealDetailsDialog } from "@/domains/tracker/components/deal-details-dialog";
import type { DealWithSponsor } from "@/domains/tracker/queries";
import type { Deliverable } from "@/domains/tracker/schema";
import { cn } from "@/lib/utils";

export function PipelineBoard({
  deals,
  sponsors,
  deliverables = [],
  today,
}: {
  deals: DealWithSponsor[];
  sponsors: SponsorOption[];
  deliverables?: Deliverable[];
  today: string;
}) {
  const deliverablesByDeal = new Map<string, Deliverable[]>();
  for (const item of deliverables) {
    const list = deliverablesByDeal.get(item.dealId) ?? [];
    list.push(item);
    deliverablesByDeal.set(item.dealId, list);
  }
  const [optimisticDeals, applyMove] = useOptimistic(
    deals,
    (state, move: { dealId: string; status: DealStatus }) =>
      state.map((d) =>
        d.id === move.dealId ? { ...d, status: move.status } : d,
      ),
  );
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<DealStatus | null>(null);

  function moveDeal(dealId: string, status: DealStatus) {
    startTransition(async () => {
      applyMove({ dealId, status });
      const result = await updateDealStatusAction(dealId, status);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {DEAL_STATUSES.map((status) => {
        const columnDeals = optimisticDeals.filter((d) => d.status === status);
        const columnTotal = columnDeals.reduce(
          (sum, d) => sum + d.amountCents,
          0,
        );
        return (
          <div
            key={status}
            className={cn(
              "bg-muted/60 flex w-64 shrink-0 flex-col rounded-lg border p-2 xl:w-auto xl:flex-1",
              dragOver === status && "border-primary/40 bg-primary/5",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(status);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const dealId = e.dataTransfer.getData("text/plain");
              if (dealId) moveDeal(dealId, status);
            }}
          >
            <div className="flex items-center gap-2 px-1.5 pt-1 pb-2.5">
              <span
                className={cn(
                  "size-2 rounded-full",
                  DEAL_STATUS_DOT_CLASSES[status],
                )}
              />
              <span className="text-sm font-medium">
                {DEAL_STATUS_LABELS[status]}
              </span>
              <span className="text-muted-foreground text-xs">
                {columnDeals.length}
              </span>
              {columnTotal > 0 ? (
                <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                  {formatCents(columnTotal)}
                </span>
              ) : null}
            </div>
            <div className="flex min-h-24 flex-col gap-2">
              {columnDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  sponsors={sponsors}
                  deliverables={deliverablesByDeal.get(deal.id) ?? []}
                  today={today}
                  onMove={moveDeal}
                />
              ))}
              {columnDeals.length === 0 ? (
                <div className="text-muted-foreground/60 flex flex-1 items-center justify-center rounded-md border border-dashed py-6 text-xs">
                  No deals
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const URGENCY_CLASSES: Record<DueUrgency, string> = {
  overdue:
    "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-400/10 dark:border-red-400/20",
  soon: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-400/10 dark:border-amber-400/20",
  normal: "text-muted-foreground bg-transparent border-transparent",
};

function DateChip({
  icon: Icon,
  isoDate,
  today,
  muted,
}: {
  icon: typeof CalendarClock;
  isoDate: string;
  today: string;
  muted: boolean;
}) {
  const urgency = muted ? "normal" : dueUrgency(isoDate, today);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1 py-0.5 text-[11px] leading-none",
        URGENCY_CLASSES[urgency],
      )}
    >
      <Icon className="size-3" />
      {formatShortDate(isoDate)}
    </span>
  );
}

function DealCard({
  deal,
  sponsors,
  deliverables,
  today,
  onMove,
}: {
  deal: DealWithSponsor;
  sponsors: SponsorOption[];
  deliverables: Deliverable[];
  today: string;
  onMove: (dealId: string, status: DealStatus) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const overdue = isPaymentOverdue(deal, today);
  const doneCount = deliverables.filter((d) => d.completedAt).length;

  return (
    <>
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/plain", deal.id)}
        className={cn(
          "bg-background group cursor-grab rounded-md border p-2.5 shadow-xs transition-shadow hover:shadow-sm active:cursor-grabbing",
          overdue && "border-red-300 dark:border-red-400/40",
        )}
      >
        {overdue ? (
          <div className="mb-1.5 inline-flex items-center gap-1 rounded border border-red-300 bg-red-100 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-red-800 dark:border-red-400/40 dark:bg-red-400/15 dark:text-red-300">
            <Wallet className="size-3" />
            Overdue {daysPastDue(deal.paymentDueDate!, today)}d ·{" "}
            {formatCents(deal.amountCents)}
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-1">
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="min-w-0 cursor-pointer text-left"
          >
            <p className="truncate text-sm font-medium">{deal.sponsorName}</p>
            <p className="text-muted-foreground text-xs">
              {CONTENT_TYPE_LABELS[deal.contentType]} ·{" "}
              <span className="tabular-nums">
                {formatCents(deal.amountCents)}
              </span>
              {deliverables.length > 0 ? (
                <span className="ml-1.5 inline-flex items-center gap-0.5">
                  <ListChecks className="size-3" />
                  {doneCount}/{deliverables.length}
                </span>
              ) : null}
            </p>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground -mt-1 -mr-1 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                aria-label="Deal actions"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Move to
              </DropdownMenuLabel>
              {DEAL_STATUSES.filter((s) => s !== deal.status).map((s) => (
                <DropdownMenuItem key={s} onSelect={() => onMove(deal.id, s)}>
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      DEAL_STATUS_DOT_CLASSES[s],
                    )}
                  />
                  {DEAL_STATUS_LABELS[s]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDetailsOpen(true)}>
                Details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {deal.deliverableDueDate || deal.paymentDueDate ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {deal.deliverableDueDate ? (
              <DateChip
                icon={Clapperboard}
                isoDate={deal.deliverableDueDate}
                today={today}
                muted={
                  CONTENT_DONE_STATUSES.includes(deal.status) ||
                  deal.status === "dead"
                }
              />
            ) : null}
            {deal.paymentDueDate ? (
              <DateChip
                icon={Wallet}
                isoDate={deal.paymentDueDate}
                today={today}
                muted={TERMINAL_DEAL_STATUSES.includes(deal.status)}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {detailsOpen ? (
        <DealDetailsDialog
          deal={deal}
          deliverables={deliverables}
          today={today}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      ) : null}

      {editOpen ? (
        <DealFormDialog
          deal={deal}
          sponsors={sponsors}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this deal?"
        description="This cannot be undone."
        action={() => deleteDealAction(deal.id)}
      />
    </>
  );
}
