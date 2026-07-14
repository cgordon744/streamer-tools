"use client";

import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteSponsorAction } from "@/domains/tracker/actions";
import type { Sponsor } from "@/domains/tracker/schema";

import { SponsorFormDialog } from "./sponsor-form-dialog";

export function SponsorRowActions({ sponsor }: { sponsor: Sponsor }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Sponsor actions">
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
        <SponsorFormDialog
          sponsor={sponsor}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${sponsor.name}?`}
        description="This also deletes all deals linked to this sponsor. This cannot be undone."
        action={() => deleteSponsorAction(sponsor.id)}
      />
    </>
  );
}
