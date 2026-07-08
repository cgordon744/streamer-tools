"use client";

import { useActionState, useCallback, useState } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/action-result";

// Shared open-state and submit wiring for add/edit form dialogs.
// Uncontrolled (the dialog manages its own open flag) unless `controlledOpen`
// and `onOpenChange` are passed — controlled mode is used by row-action menus.
// Success toasts and closes from within the submit transition — no effect
// needed, and reopening can't replay it.
export function useFormDialog(
  action: (
    prevState: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>,
  controlledOpen?: boolean,
  onOpenChange?: (open: boolean) => void,
) {
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

  const [state, formAction, isPending] = useActionState(
    async (
      prevState: ActionResult | undefined,
      formData: FormData,
    ): Promise<ActionResult> => {
      const result = await action(prevState, formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  return { open, setOpen, isControlled, state, formAction, isPending };
}
