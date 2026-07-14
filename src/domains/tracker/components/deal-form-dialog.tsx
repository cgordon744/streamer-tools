"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPES,
  DEAL_STATUS_LABELS,
  DEAL_STATUSES,
} from "@/core/config/deals";
import { useFormDialog } from "@/hooks/use-form-dialog";
import { createDealAction, updateDealAction } from "@/domains/tracker/actions";
import type { Deal } from "@/domains/tracker/schema";

export type SponsorOption = { id: string; name: string };

export function DealFormDialog({
  sponsors,
  deal,
  open: controlledOpen,
  onOpenChange,
}: {
  sponsors: SponsorOption[];
  deal?: Deal;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = !!deal;
  const { open, setOpen, isControlled, state, formAction, isPending } =
    useFormDialog(
      isEdit ? updateDealAction : createDealAction,
      controlledOpen,
      onOpenChange,
    );

  const noSponsors = sponsors.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isControlled ? null : (
        <DialogTrigger asChild>
          <Button>Add deal</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit deal" : "Add deal"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this deal's details."
              : noSponsors
                ? "You need a sponsor first — add one on the Sponsors page."
                : "A sponsorship deal with one of your sponsors."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {isEdit ? <input type="hidden" name="id" value={deal.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="deal-sponsor">Sponsor</Label>
            <Select
              name="sponsorId"
              defaultValue={deal?.sponsorId}
              disabled={noSponsors}
              required
            >
              <SelectTrigger id="deal-sponsor" className="w-full">
                <SelectValue placeholder="Pick a sponsor" />
              </SelectTrigger>
              <SelectContent>
                {sponsors.map((sponsor) => (
                  <SelectItem key={sponsor.id} value={sponsor.id}>
                    {sponsor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deal-status">Status</Label>
              <Select
                name="status"
                defaultValue={deal?.status ?? "lead"}
                required
              >
                <SelectTrigger id="deal-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {DEAL_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-content-type">Content type</Label>
              <Select
                name="contentType"
                defaultValue={deal?.contentType ?? "video"}
                required
              >
                <SelectTrigger id="deal-content-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CONTENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-amount">Amount (USD)</Label>
            <Input
              id="deal-amount"
              name="amount"
              inputMode="decimal"
              placeholder="1,500.00"
              defaultValue={deal ? (deal.amountCents / 100).toFixed(2) : ""}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deal-deliverable-due">Deliverable due</Label>
              <Input
                id="deal-deliverable-due"
                name="deliverableDueDate"
                type="date"
                defaultValue={deal?.deliverableDueDate ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-payment-due">Payment due</Label>
              <Input
                id="deal-payment-due"
                name="paymentDueDate"
                type="date"
                defaultValue={deal?.paymentDueDate ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-notes">Notes</Label>
            <Textarea
              id="deal-notes"
              name="notes"
              defaultValue={deal?.notes ?? ""}
            />
          </div>

          {state && !state.ok ? (
            <p className="text-destructive text-sm">{state.message}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || noSponsors}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add deal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
