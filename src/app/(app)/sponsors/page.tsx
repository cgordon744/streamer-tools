import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUserId } from "@/core/auth/session";
import { listSponsors } from "@/domains/tracker/queries";

import { SponsorFormDialog } from "@/domains/tracker/components/sponsor-form-dialog";
import { SponsorRowActions } from "@/domains/tracker/components/sponsor-row-actions";

export const metadata = {
  title: "Sponsors — Streamer Tools",
};

export default async function SponsorsPage() {
  const userId = await requireUserId();
  const sponsors = await listSponsors(userId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sponsors</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Brands and companies you work with.
          </p>
        </div>
        <SponsorFormDialog />
      </div>

      {sponsors.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No sponsors yet. Add your first one to start tracking deals.
        </p>
      ) : (
        <div className="bg-background rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sponsors.map((sponsor) => (
                <TableRow key={sponsor.id}>
                  <TableCell className="font-medium">{sponsor.name}</TableCell>
                  <TableCell>{sponsor.contactName ?? "—"}</TableCell>
                  <TableCell>{sponsor.contactEmail ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-64 truncate">
                    {sponsor.notes ?? "—"}
                  </TableCell>
                  <TableCell>
                    <SponsorRowActions sponsor={sponsor} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
