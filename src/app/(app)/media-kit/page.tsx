import { notFound } from "next/navigation";

import { getUserName } from "@/core/auth/service";
import { requireUserId } from "@/core/auth/session";
import { hasAccess } from "@/core/billing/entitlements";
import { UpgradeNotice } from "@/core/billing/upgrade-notice";
import { flags } from "@/core/config/flags";
import { formatDemographics } from "@/core/youtube/format";
import {
  getChannelForUser,
  getConnectionForUser,
} from "@/core/youtube/queries";
import { KitEditor } from "@/domains/media-kit/components/kit-editor";
import { getKitForUser } from "@/domains/media-kit/queries";
import { getVerifiedSponsors } from "@/domains/tracker/queries";

export const metadata = {
  title: "Media Kit — Streamer Tools",
};

const fetchedAtFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export default async function MediaKitPage({
  searchParams,
}: {
  searchParams: Promise<{ yt?: string }>;
}) {
  if (!flags.mediaKitEnabled) {
    notFound();
  }
  const userId = await requireUserId();
  if (!(await hasAccess(userId, "media-kit"))) {
    return <UpgradeNotice toolName="Media Kit" />;
  }

  const [kit, channel, connection, verifiedSponsors, userName, params] =
    await Promise.all([
      getKitForUser(userId),
      getChannelForUser(userId),
      getConnectionForUser(userId),
      // Cross-domain read via tracker's exported query (boundary rule 2).
      // Additive only: an empty result renders nothing (cold-start rule).
      getVerifiedSponsors(userId),
      getUserName(userId),
      searchParams,
    ]);

  // Display strings only cross into the client component — never the
  // connection row (it carries the sealed token).
  const verifiedDemographics = connection?.demographics
    ? {
        ...formatDemographics(connection.demographics),
        fetchedAt: fetchedAtFormat.format(
          connection.demographicsFetchedAt ?? connection.connectedAt,
        ),
      }
    : null;
  const ytOutcome =
    params.yt === "denied" || params.yt === "error" ? params.yt : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media Kit</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A polished, always-current kit to send when a sponsor asks.
        </p>
      </div>
      <KitEditor
        kit={kit}
        channel={channel}
        verifiedSponsors={verifiedSponsors.map((s) => ({
          name: s.name,
          completedDealCount: s.completedDealCount,
        }))}
        creatorName={userName ?? "Creator"}
        verifiedDemographics={verifiedDemographics}
        ytOutcome={ytOutcome}
      />
    </div>
  );
}
