import { DealFormDialog } from "@/components/deal-form-dialog";
import { DealsTable } from "@/components/deals-table";
import { requireUserId } from "@/modules/auth/session";
import { listDeals } from "@/modules/deals/service";
import { listSponsors } from "@/modules/sponsors/service";

export const metadata = {
  title: "Deals — Streamer Tools",
};

export default async function DealsPage() {
  const userId = await requireUserId();
  const [deals, sponsors] = await Promise.all([
    listDeals(userId),
    listSponsors(userId),
  ]);
  const sponsorOptions = sponsors.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Deals</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every sponsorship deal, sorted by nearest deadline.
          </p>
        </div>
        <DealFormDialog sponsors={sponsorOptions} />
      </div>

      <DealsTable
        deals={deals}
        sponsors={sponsorOptions}
        emptyMessage="No deals yet. Add one to start tracking."
      />
    </div>
  );
}
