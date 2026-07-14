import { DealFormDialog } from "@/domains/tracker/components/deal-form-dialog";
import { DealsTable } from "@/domains/tracker/components/deals-table";
import { DEAL_STATUSES, type DealStatus } from "@/core/config/deals";
import { requireUserId } from "@/core/auth/session";
import { listDeals } from "@/domains/tracker/queries";
import { listSponsors } from "@/domains/tracker/queries";

import { DealFilters } from "@/domains/tracker/components/deal-filters";

export const metadata = {
  title: "Deals — Streamer Tools",
};

function parseStatus(value: string | undefined): DealStatus | undefined {
  return DEAL_STATUSES.includes(value as DealStatus)
    ? (value as DealStatus)
    : undefined;
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sponsor?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const status = parseStatus(params.status);

  const sponsors = await listSponsors(userId);
  const sponsorOptions = sponsors.map((s) => ({ id: s.id, name: s.name }));
  const sponsorId = sponsorOptions.some((s) => s.id === params.sponsor)
    ? params.sponsor
    : undefined;

  const deals = await listDeals(userId, { status, sponsorId });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deals</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every deal in detail, sorted by nearest deadline.
          </p>
        </div>
        <DealFormDialog sponsors={sponsorOptions} />
      </div>

      <DealFilters sponsors={sponsorOptions} />

      <div className="bg-background rounded-lg border">
        <DealsTable
          deals={deals}
          sponsors={sponsorOptions}
          emptyMessage={
            status || sponsorId
              ? "No deals match these filters."
              : "No deals yet. Add one to start tracking."
          }
        />
      </div>
    </div>
  );
}
