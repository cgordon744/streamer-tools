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
import { Textarea } from "@/components/ui/textarea";
import { useFormDialog } from "@/hooks/use-form-dialog";
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
  const { open, setOpen, isControlled, state, formAction, isPending } =
    useFormDialog(
      isEdit ? updateSponsorAction : createSponsorAction,
      controlledOpen,
      onOpenChange,
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
