import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  Layers,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatDueDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DealStats } from "@/domains/tracker/queries";

// The dashboard strip (spec §2): active deals · $ in flight · overdue
// payments · next deliverable. Overdue is the hero — it goes red the moment
// it's nonzero.
export function StatCards({ stats }: { stats: DealStats }) {
  const hasOverdue = stats.overdueCount > 0;

  const items = [
    {
      label: "Active deals",
      value: String(stats.activeCount),
      hint: "In the pipeline right now",
      icon: Layers,
      alert: false,
    },
    {
      label: "In flight",
      value: formatCents(stats.inFlightCents),
      hint: "Value of active deals",
      icon: CircleDollarSign,
      alert: false,
    },
    {
      label: "Overdue payments",
      value: hasOverdue
        ? `${formatCents(stats.overdueCents)} · ${stats.overdueCount}`
        : "None",
      hint: hasOverdue
        ? `${stats.overdueCount} ${stats.overdueCount === 1 ? "payment" : "payments"} past due`
        : "Nothing past due",
      icon: AlertTriangle,
      alert: hasOverdue,
    },
    {
      label: "Next deliverable",
      value: stats.nextDeliverableDate
        ? formatDueDate(stats.nextDeliverableDate)
        : "—",
      hint: stats.nextDeliverableDate
        ? "Nearest upcoming due date"
        : "No upcoming due dates",
      icon: CalendarClock,
      alert: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className={cn(
            "gap-1 p-4",
            item.alert &&
              "border-red-300 bg-red-50 dark:border-red-400/40 dark:bg-red-400/10",
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs font-medium tracking-wide uppercase",
                item.alert
                  ? "text-red-700 dark:text-red-300"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
            </span>
            <item.icon
              className={cn(
                "size-4",
                item.alert
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground",
              )}
            />
          </div>
          <div
            className={cn(
              "text-2xl font-semibold tracking-tight tabular-nums",
              item.alert && "text-red-700 dark:text-red-300",
            )}
          >
            {item.value}
          </div>
          <p
            className={cn(
              "text-xs",
              item.alert
                ? "text-red-600/80 dark:text-red-300/80"
                : "text-muted-foreground",
            )}
          >
            {item.hint}
          </p>
        </Card>
      ))}
    </div>
  );
}
