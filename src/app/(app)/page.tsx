import { DealFormDialog } from "@/components/deal-form-dialog";
import { DealsTable } from "@/components/deals-table";
import { DEAL_STATUSES, type DealStatus } from "@/config/deals";
import { requireUserId } from "@/modules/auth/session";
import { listDeals } from "@/modules/deals/service";
import { listSponsors } from "@/modules/sponsors/service";

import { DealFilters } from "./deal-filters";

export const metadata = {
  title: "Dashboard — Streamer Tools",
};

function parseStatus(value: string | undefined): DealStatus | undefined {
  return DEAL_STATUSES.includes(value as DealStatus)
    ? (value as DealStatus)
    : undefined;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sponsor?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const status = parseStatus(params.status);

  const sponsors = await listSponsors(userId);
  const sponsorOptions = sponsors.map((s) => ({ id: s.id, name: s.name }));
  // Only pass a sponsor filter that exists for this user.
  const sponsorId = sponsorOptions.some((s) => s.id === params.sponsor)
    ? params.sponsor
    : undefined;

  const deals = await listDeals(userId, { status, sponsorId });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All deals, nearest deadline first.
          </p>
        </div>
        <DealFormDialog sponsors={sponsorOptions} />
      </div>

      <DealFilters sponsors={sponsorOptions} />

      <DealsTable
        deals={deals}
        sponsors={sponsorOptions}
        emptyMessage={
          status || sponsorId
            ? "No deals match these filters."
            : "No deals yet. Add a sponsor, then add your first deal."
        }
      />
    </div>
  );
}
