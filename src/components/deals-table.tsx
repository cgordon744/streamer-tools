import { DealRowActions } from "@/components/deal-row-actions";
import type { SponsorOption } from "@/components/deal-form-dialog";
import { DealStatusBadge } from "@/components/deal-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CONTENT_TYPE_LABELS } from "@/config/deals";
import { formatDueDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { DealWithSponsor } from "@/modules/deals/service";

export function DealsTable({
  deals,
  sponsors,
  emptyMessage,
}: {
  deals: DealWithSponsor[];
  sponsors: SponsorOption[];
  emptyMessage: string;
}) {
  if (deals.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sponsor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Content</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Deliverable due</TableHead>
          <TableHead>Payment due</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {deals.map((deal) => (
          <TableRow key={deal.id}>
            <TableCell className="font-medium">{deal.sponsorName}</TableCell>
            <TableCell>
              <DealStatusBadge status={deal.status} />
            </TableCell>
            <TableCell>{CONTENT_TYPE_LABELS[deal.contentType]}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCents(deal.amountCents)}
            </TableCell>
            <TableCell>{formatDueDate(deal.deliverableDueDate)}</TableCell>
            <TableCell>{formatDueDate(deal.paymentDueDate)}</TableCell>
            <TableCell>
              <DealRowActions deal={deal} sponsors={sponsors} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
