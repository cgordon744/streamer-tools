"use client";

import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CONTENT_TYPE_LABELS } from "@/core/config/deals";
import { dueUrgency, formatDueDate, formatShortDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";
import {
  createDeliverableAction,
  deleteDeliverableAction,
  toggleDeliverableAction,
} from "@/domains/tracker/actions";
import { DealStatusBadge } from "@/domains/tracker/components/deal-status-badge";
import { PaymentStatusBadge } from "@/domains/tracker/components/payment-status-badge";
import type { DealWithSponsor } from "@/domains/tracker/queries";
import type { Deliverable } from "@/domains/tracker/schema";

// The spec's "one card" view (§2): stage, payment state, dates, and the
// deliverables checklist for a single deal.
export function DealDetailsDialog({
  deal,
  deliverables,
  today,
  open,
  onOpenChange,
}: {
  deal: DealWithSponsor;
  deliverables: Deliverable[];
  today: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {deal.sponsorName}
            <span className="text-muted-foreground font-normal">
              {formatCents(deal.amountCents)}
            </span>
          </DialogTitle>
          <DialogDescription>
            {CONTENT_TYPE_LABELS[deal.contentType]} deal
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <DealStatusBadge status={deal.status} />
          <PaymentStatusBadge deal={deal} today={today} />
        </div>

        <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt>Deliverable due</dt>
          <dd className="text-foreground text-right tabular-nums">
            {formatDueDate(deal.deliverableDueDate)}
          </dd>
          <dt>Payment due</dt>
          <dd className="text-foreground text-right tabular-nums">
            {formatDueDate(deal.paymentDueDate)}
          </dd>
        </dl>

        {deal.notes ? (
          <p className="text-muted-foreground border-l-2 pl-3 text-sm whitespace-pre-wrap">
            {deal.notes}
          </p>
        ) : null}

        <DeliverablesChecklist
          dealId={deal.id}
          deliverables={deliverables}
          today={today}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeliverablesChecklist({
  dealId,
  deliverables,
  today,
}: {
  dealId: string;
  deliverables: Deliverable[];
  today: string;
}) {
  // Bump to clear the add-form inputs after each successful add.
  const [formKey, setFormKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(
    async (
      _prev: ActionResult | undefined,
      formData: FormData,
    ): Promise<ActionResult> => {
      const result = await createDeliverableAction(_prev, formData);
      if (result.ok) {
        toast.success(result.message);
        setFormKey((k) => k + 1);
      }
      return result;
    },
    undefined,
  );

  const done = deliverables.filter((d) => d.completedAt).length;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">Deliverables</h3>
        {deliverables.length > 0 ? (
          <span className="text-muted-foreground text-xs">
            {done}/{deliverables.length} done
          </span>
        ) : null}
      </div>

      {deliverables.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs">
          No deliverables yet — add the first one below.
        </p>
      ) : (
        <ul className="space-y-1">
          {deliverables.map((item) => (
            <DeliverableRow key={item.id} item={item} today={today} />
          ))}
        </ul>
      )}

      <form
        key={formKey}
        ref={formRef}
        action={formAction}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="dealId" value={dealId} />
        <Input
          name="title"
          placeholder="e.g. Draft script"
          className="h-8 flex-1 text-sm"
          required
        />
        <Input name="dueDate" type="date" className="h-8 w-36 text-sm" />
        <Button
          type="submit"
          size="icon"
          variant="outline"
          className="size-8 shrink-0"
          disabled={isPending}
          aria-label="Add deliverable"
        >
          <Plus className="size-4" />
        </Button>
      </form>
      {state && !state.ok ? (
        <p className="text-destructive text-xs">{state.message}</p>
      ) : null}
    </div>
  );
}

function DeliverableRow({ item, today }: { item: Deliverable; today: string }) {
  const [isPending, startTransition] = useTransition();
  const completed = !!item.completedAt;
  const urgency =
    item.dueDate && !completed ? dueUrgency(item.dueDate, today) : "normal";

  function toggle() {
    startTransition(async () => {
      const result = await toggleDeliverableAction(item.id, !completed);
      if (!result.ok) toast.error(result.message);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteDeliverableAction(item.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <li className="group/deliverable flex items-center gap-2 rounded-md border px-2.5 py-1.5">
      <input
        type="checkbox"
        checked={completed}
        onChange={toggle}
        disabled={isPending}
        className="accent-primary size-4 shrink-0 cursor-pointer"
        aria-label={`Mark "${item.title}" ${completed ? "not done" : "done"}`}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          completed && "text-muted-foreground line-through",
        )}
      >
        {item.title}
      </span>
      {item.dueDate ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 text-xs tabular-nums",
            urgency === "overdue"
              ? "font-medium text-red-600 dark:text-red-400"
              : urgency === "soon"
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground",
          )}
        >
          <CalendarClock className="size-3" />
          {formatShortDate(item.dueDate)}
        </span>
      ) : null}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={remove}
        disabled={isPending}
        className="text-muted-foreground size-6 shrink-0 opacity-0 transition-opacity group-hover/deliverable:opacity-100 focus-visible:opacity-100"
        aria-label={`Delete "${item.title}"`}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  );
}
