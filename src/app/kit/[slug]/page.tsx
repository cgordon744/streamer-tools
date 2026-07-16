import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { getUserName } from "@/core/auth/service";
import { flags } from "@/core/config/flags";
import { trackEvent } from "@/core/events/track";
import { getChannelForUser } from "@/core/youtube/queries";
import { KitView } from "@/domains/media-kit/components/kit-view";
import { getPublishedKitBySlug } from "@/domains/media-kit/queries";
import { getVerifiedSponsors } from "@/domains/tracker/queries";

// The public artifact page (spec §4): no auth, excluded from the session
// proxy. This page IS the distribution channel — it carries the product's
// branding to brands and other creators (thesis §5).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const kit = flags.mediaKitEnabled ? await getPublishedKitBySlug(slug) : null;
  if (!kit) return { title: "Media Kit — Streamer Tools" };
  const [channel, name] = await Promise.all([
    getChannelForUser(kit.userId),
    getUserName(kit.userId),
  ]);
  return {
    title: `${channel?.title ?? name ?? "Creator"} — Media Kit`,
  };
}

export default async function PublicKitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!flags.mediaKitEnabled) {
    notFound();
  }
  const { slug } = await params;
  const kit = await getPublishedKitBySlug(slug);
  if (!kit) {
    notFound();
  }

  const [channel, creatorName, verifiedSponsors, session] = await Promise.all([
    getChannelForUser(kit.userId),
    getUserName(kit.userId),
    // Cross-domain read via tracker's exported query (boundary rule 2).
    kit.showVerifiedSponsors ? getVerifiedSponsors(kit.userId) : [],
    auth(),
  ]);

  // Distribution metric (spec §7) counts third-party views only — the owner
  // checking their own page isn't distribution.
  if (session?.user?.id !== kit.userId) {
    await trackEvent(kit.userId, "kit_viewed");
  }

  return (
    <main className="min-h-screen bg-zinc-100 print:bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10 print:max-w-none print:p-0">
        <KitView
          data={{
            creatorName: creatorName ?? "Creator",
            niche: kit.niche,
            pitch: kit.pitch,
            audienceAge: kit.audienceAge,
            audienceGender: kit.audienceGender,
            audienceGeo: kit.audienceGeo,
            contactEmail: kit.contactEmail,
            accentColor: kit.accentColor,
            rateCard: kit.rateCard,
            brandHighlights: kit.brandHighlights,
            showVerifiedSponsors: kit.showVerifiedSponsors,
            channel,
            verifiedSponsors: verifiedSponsors.map((s) => ({
              name: s.name,
              completedDealCount: s.completedDealCount,
            })),
          }}
        />
        {/* The branded impression (thesis §5) — quiet, professional, hidden
            in print where it would read as a watermark. */}
        <p className="mt-6 text-center text-xs text-zinc-400 print:hidden">
          Made with{" "}
          <Link
            href="/"
            className="font-medium text-zinc-500 underline-offset-4 hover:underline"
          >
            Streamer Tools
          </Link>{" "}
          — free media kits for creators
        </p>
      </div>
    </main>
  );
}
