"use client";

import {
  CalendarClock,
  Clapperboard,
  MoreHorizontal,
  Wallet,
} from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  DealFormDialog,
  type SponsorOption,
} from "@/components/deal-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CONTENT_TYPE_LABELS,
  DEAL_STATUS_DOT_CLASSES,
  DEAL_STATUS_LABELS,
  DEAL_STATUSES,
  type DealStatus,
} from "@/config/deals";
import { dueUrgency, formatShortDate, type DueUrgency } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import {
  deleteDealAction,
  updateDealStatusAction,
} from "@/modules/deals/actions";
import type { DealWithSponsor } from "@/modules/deals/service";
import { cn } from "@/lib/utils";

export function PipelineBoard({
  deals,
  sponsors,
  today,
}: {
  deals: DealWithSponsor[];
  sponsors: SponsorOption[];
  today: string;
}) {
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
  overdue: "text-red-600 bg-red-50 border-red-200",
  soon: "text-amber-700 bg-amber-50 border-amber-200",
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
  today,
  onMove,
}: {
  deal: DealWithSponsor;
  sponsors: SponsorOption[];
  today: string;
  onMove: (dealId: string, status: DealStatus) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDealAction(deal.id);
      if (result.ok) {
        toast.success(result.message);
        setDeleteOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <>
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/plain", deal.id)}
        className="bg-background group cursor-grab rounded-md border p-2.5 shadow-xs transition-shadow hover:shadow-sm active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{deal.sponsorName}</p>
            <p className="text-muted-foreground text-xs">
              {CONTENT_TYPE_LABELS[deal.contentType]} ·{" "}
              <span className="tabular-nums">
                {formatCents(deal.amountCents)}
              </span>
            </p>
          </div>
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
                muted={deal.status === "delivered" || deal.status === "paid"}
              />
            ) : null}
            {deal.paymentDueDate ? (
              <DateChip
                icon={Wallet}
                isoDate={deal.paymentDueDate}
                today={today}
                muted={deal.status === "paid"}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {editOpen ? (
        <DealFormDialog
          deal={deal}
          sponsors={sponsors}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this deal?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
