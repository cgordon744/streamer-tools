import { Badge } from "@/components/ui/badge";
import {
  PAYMENT_STATUS_BADGE_CLASSES,
  PAYMENT_STATUS_LABELS,
} from "@/core/config/deals";
import { cn } from "@/lib/utils";
import {
  daysPastDue,
  isPaymentOverdue,
  type PaymentFields,
} from "@/domains/tracker/payments";

const OVERDUE_CLASSES =
  "bg-red-100 text-red-800 border-red-300 dark:bg-red-400/15 dark:text-red-300 dark:border-red-400/40";

// Payment state at a glance; flips to a loud overdue treatment when the due
// date has passed unpaid (the tracker's hero signal).
export function PaymentStatusBadge({
  deal,
  today,
}: {
  deal: PaymentFields;
  today: string;
}) {
  if (isPaymentOverdue(deal, today)) {
    const days = daysPastDue(deal.paymentDueDate!, today);
    return (
      <Badge variant="outline" className={cn(OVERDUE_CLASSES, "font-semibold")}>
        Overdue {days}d
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn(PAYMENT_STATUS_BADGE_CLASSES[deal.paymentStatus])}
    >
      {PAYMENT_STATUS_LABELS[deal.paymentStatus]}
    </Badge>
  );
}
