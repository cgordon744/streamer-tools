"use client";

import { useActionState, useCallback, useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import {
  createSponsorAction,
  updateSponsorAction,
} from "@/modules/sponsors/actions";
import type { Sponsor } from "@/modules/sponsors/schema";

// Uncontrolled (renders its own trigger button) unless `open`/`onOpenChange`
// are passed — controlled mode is used by the row actions dropdown.
export function SponsorFormDialog({
  sponsor,
  open: controlledOpen,
  onOpenChange,
}: {
  sponsor?: Sponsor;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = !!sponsor;
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = useCallback(
    (value: boolean) => {
      if (isControlled) onOpenChange?.(value);
      else setUncontrolledOpen(value);
    },
    [isControlled, onOpenChange],
  );

  // Wrap the server action so success closes the dialog from within the
  // submit transition — no effect needed, and reopening can't replay it.
  const [state, formAction, isPending] = useActionState(
    async (
      prevState: ActionResult | undefined,
      formData: FormData,
    ): Promise<ActionResult> => {
      const action = isEdit ? updateSponsorAction : createSponsorAction;
      const result = await action(prevState, formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isControlled ? null : (
        <DialogTrigger asChild>
          <Button>Add sponsor</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit sponsor" : "Add sponsor"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this sponsor's details."
              : "A brand or company you're working with."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {isEdit ? <input type="hidden" name="id" value={sponsor.id} /> : null}
          <div className="space-y-2">
            <Label htmlFor="sponsor-name">Name</Label>
            <Input
              id="sponsor-name"
              name="name"
              defaultValue={sponsor?.name ?? ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsor-contact-name">Contact name</Label>
            <Input
              id="sponsor-contact-name"
              name="contactName"
              defaultValue={sponsor?.contactName ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsor-contact-email">Contact email</Label>
            <Input
              id="sponsor-contact-email"
              name="contactEmail"
              type="email"
              defaultValue={sponsor?.contactEmail ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsor-notes">Notes</Label>
            <Textarea
              id="sponsor-notes"
              name="notes"
              defaultValue={sponsor?.notes ?? ""}
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add sponsor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
