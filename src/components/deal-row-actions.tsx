"use client";

import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  DealFormDialog,
  type SponsorOption,
} from "@/components/deal-form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteDealAction } from "@/modules/deals/actions";
import type { Deal } from "@/modules/deals/schema";

export function DealRowActions({
  deal,
  sponsors,
}: {
  deal: Deal;
  sponsors: SponsorOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Deal actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
