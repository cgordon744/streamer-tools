import { Badge } from "@/components/ui/badge";
import {
  DEAL_STATUS_BADGE_CLASSES,
  DEAL_STATUS_LABELS,
  type DealStatus,
} from "@/config/deals";
import { cn } from "@/lib/utils";

export function DealStatusBadge({ status }: { status: DealStatus }) {
  return (
    <Badge variant="outline" className={cn(DEAL_STATUS_BADGE_CLASSES[status])}>
      {DEAL_STATUS_LABELS[status]}
    </Badge>
  );
}
