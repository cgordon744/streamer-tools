import { CalendarClock, CircleDollarSign, Clock4, Wallet } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import type { DealStats } from "@/modules/deals/service";

export function StatCards({ stats }: { stats: DealStats }) {
  const items = [
    {
      label: "Pipeline value",
      value: formatCents(stats.pipelineCents),
      hint: "All unpaid deals",
      icon: CircleDollarSign,
    },
    {
      label: "Awaiting payment",
      value: formatCents(stats.awaitingPaymentCents),
      hint: "Delivered, not yet paid",
      icon: Clock4,
    },
    {
      label: "Paid",
      value: formatCents(stats.paidCents),
      hint: "All time",
      icon: Wallet,
    },
    {
      label: "Due this week",
      value: String(stats.dueSoonCount),
      hint: "Deadlines in the next 7 days",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="gap-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {item.label}
            </span>
            <item.icon className="text-muted-foreground size-4" />
          </div>
          <div className="text-2xl font-semibold tracking-tight tabular-nums">
            {item.value}
          </div>
          <p className="text-muted-foreground text-xs">{item.hint}</p>
        </Card>
      ))}
    </div>
  );
}
