// Pure payment/overdue logic, shared by server queries and client components.
// Overdue is always computed from (paymentDueDate, paymentStatus, status) —
// never stored — so it can't go stale.

import type { DealStatus, PaymentStatus } from "@/core/config/deals";

export type PaymentFields = {
  status: DealStatus;
  paymentStatus: PaymentStatus;
  paymentDueDate: string | null;
};

// A deal's payment is overdue when the due date has passed and the money
// hasn't arrived — regardless of whether it's been invoiced yet. Dead deals
// have nothing to collect. YYYY-MM-DD compares lexicographically.
export function isPaymentOverdue(deal: PaymentFields, today: string): boolean {
  return (
    deal.paymentStatus !== "paid" &&
    deal.status !== "dead" &&
    deal.paymentDueDate !== null &&
    deal.paymentDueDate < today
  );
}

// Whole days between an ISO date and today (positive = past due).
export function daysPastDue(isoDate: string, today: string): number {
  const [y1, m1, d1] = isoDate.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  const from = new Date(y1, m1 - 1, d1).getTime();
  const to = new Date(y2, m2 - 1, d2).getTime();
  return Math.round((to - from) / 86_400_000);
}
