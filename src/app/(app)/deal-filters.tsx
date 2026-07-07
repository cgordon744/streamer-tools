"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { SponsorOption } from "@/components/deal-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEAL_STATUS_LABELS, DEAL_STATUSES } from "@/config/deals";

const ALL = "all";

export function DealFilters({
  sponsors,
  showStatusFilter = true,
}: {
  sponsors: SponsorOption[];
  showStatusFilter?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? ALL;
  const sponsorId = searchParams.get("sponsor") ?? ALL;
  const hasFilters = status !== ALL || sponsorId !== ALL;

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showStatusFilter ? (
        <Select value={status} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {DEAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {DEAL_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Select value={sponsorId} onValueChange={(v) => setParam("sponsor", v)}>
        <SelectTrigger className="w-44" aria-label="Filter by sponsor">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All sponsors</SelectItem>
          {sponsors.map((sponsor) => (
            <SelectItem key={sponsor.id} value={sponsor.id}>
              {sponsor.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname)}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}
