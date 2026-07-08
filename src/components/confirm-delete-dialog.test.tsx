import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { actionError, actionSuccess } from "@/lib/action-result";

import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("ConfirmDeleteDialog", () => {
  it("runs the action and closes on success", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => actionSuccess("Deleted"));
    const onOpenChange = vi.fn();

    render(
      <ConfirmDeleteDialog
        open
        onOpenChange={onOpenChange}
        title="Delete this deal?"
        description="This cannot be undone."
        action={action}
      />,
    );

    expect(screen.getByText("Delete this deal?")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(action).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("stays open when the action fails", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => actionError("Deal not found"));
    const onOpenChange = vi.fn();

    render(
      <ConfirmDeleteDialog
        open
        onOpenChange={onOpenChange}
        title="Delete this deal?"
        description="This cannot be undone."
        action={action}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(action).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closes without running the action on cancel", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => actionSuccess("Deleted"));
    const onOpenChange = vi.fn();

    render(
      <ConfirmDeleteDialog
        open
        onOpenChange={onOpenChange}
        title="Delete this deal?"
        description="This cannot be undone."
        action={action}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(action).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
