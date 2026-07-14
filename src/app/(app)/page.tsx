import { DealFormDialog } from "@/domains/tracker/components/deal-form-dialog";
import { PipelineBoard } from "@/domains/tracker/components/pipeline-board";
import { StatCards } from "@/domains/tracker/components/stat-cards";
import { todayIso } from "@/lib/dates";
import { requireUserId } from "@/core/auth/session";
import { hasAccess } from "@/core/billing/entitlements";
import { UpgradeNotice } from "@/core/billing/upgrade-notice";
import { getDealStats, listDeals } from "@/domains/tracker/queries";
import { listSponsors } from "@/domains/tracker/queries";

import { DealFilters } from "@/domains/tracker/components/deal-filters";

export const metadata = {
  title: "Dashboard — Streamer Tools",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sponsor?: string }>;
}) {
  const userId = await requireUserId();
  if (!(await hasAccess(userId, "tracker"))) {
    return <UpgradeNotice toolName="Sponsor Deal Tracker" />;
  }
  const params = await searchParams;

  const [sponsors, stats] = await Promise.all([
    listSponsors(userId),
    getDealStats(userId),
  ]);
  const sponsorOptions = sponsors.map((s) => ({ id: s.id, name: s.name }));
  // Only pass a sponsor filter that exists for this user.
  const sponsorId = sponsorOptions.some((s) => s.id === params.sponsor)
    ? params.sponsor
    : undefined;

  const deals = await listDeals(userId, { sponsorId });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your sponsorship pipeline at a glance.
          </p>
        </div>
        <DealFormDialog sponsors={sponsorOptions} />
      </div>

      <StatCards stats={stats} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Pipeline</h2>
        <DealFilters sponsors={sponsorOptions} showStatusFilter={false} />
      </div>

      <PipelineBoard
        deals={deals}
        sponsors={sponsorOptions}
        today={todayIso()}
      />
    </div>
  );
}
