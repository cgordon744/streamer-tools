import { BadgeCheck, Mail } from "lucide-react";

import { DEFAULT_ACCENT_COLOR } from "@/core/config/media-kit";
import type { RateCardLine } from "@/domains/media-kit/schema";

// The one kit renderer: the editor's live preview and the public /kit/[slug]
// page both render this, so what the creator sees is exactly what the brand
// gets. Client-safe (no server imports); deliberately fixed light colors —
// the kit is a document that must look identical in-app, shared, and printed.
export type KitViewData = {
  creatorName: string;
  niche: string | null;
  pitch: string | null;
  audienceAge: string | null;
  audienceGender: string | null;
  audienceGeo: string | null;
  // True when the audience values come from the owner's YouTube Analytics
  // (OAuth) rather than manual entry — renders the verified badge.
  demographicsVerified: boolean;
  contactEmail: string | null;
  accentColor: string | null;
  rateCard: RateCardLine[];
  brandHighlights: string[];
  showVerifiedSponsors: boolean;
  channel: {
    title: string;
    handle: string | null;
    thumbnailUrl: string | null;
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
    avgRecentViews: number | null;
  } | null;
  verifiedSponsors: { name: string; completedDealCount: number }[];
};

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function KitView({ data }: { data: KitViewData }) {
  const accent = data.accentColor ?? DEFAULT_ACCENT_COLOR;
  const displayName = data.channel?.title ?? data.creatorName;
  const stats = data.channel
    ? [
        {
          label: "Subscribers",
          value: compact.format(data.channel.subscriberCount),
        },
        ...(data.channel.avgRecentViews !== null
          ? [
              {
                label: "Avg views / video",
                value: compact.format(data.channel.avgRecentViews),
              },
            ]
          : []),
        { label: "Total views", value: compact.format(data.channel.viewCount) },
        { label: "Videos", value: compact.format(data.channel.videoCount) },
      ]
    : [];
  const audience = [
    { label: "Age", value: data.audienceAge },
    { label: "Gender", value: data.audienceGender },
    { label: "Top locations", value: data.audienceGeo },
  ].filter((row) => row.value);
  const sponsors = data.showVerifiedSponsors ? data.verifiedSponsors : [];

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <div style={{ backgroundColor: accent }} className="h-2" />
      <div className="space-y-8 p-8">
        <header className="flex items-start gap-4">
          {data.channel?.thumbnailUrl ? (
            // Avatar hosts vary per channel; a kit page doesn't need the
            // next/image pipeline.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.channel.thumbnailUrl}
              alt=""
              className="size-16 rounded-full border border-zinc-200"
            />
          ) : (
            <div
              style={{ backgroundColor: accent }}
              className="flex size-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {data.channel?.handle ? `@${data.channel.handle}` : null}
              {data.channel?.handle && data.niche ? " · " : null}
              {data.niche}
            </p>
            {data.pitch ? (
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-zinc-700">
                {data.pitch}
              </p>
            ) : null}
          </div>
        </header>

        {stats.length > 0 ? (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-zinc-200 p-3 text-center"
              >
                <div
                  className="text-xl font-bold tabular-nums"
                  style={{ color: accent }}
                >
                  {stat.value}
                </div>
                <div className="mt-0.5 text-xs tracking-wide text-zinc-500 uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {audience.length > 0 ? (
          <KitSection
            title="Audience"
            accent={accent}
            badge={
              data.demographicsVerified ? (
                <span className="flex items-center gap-1 text-xs font-medium text-zinc-500 normal-case">
                  <BadgeCheck className="size-3.5" style={{ color: accent }} />
                  Verified via YouTube
                </span>
              ) : null
            }
          >
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              {audience.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs tracking-wide text-zinc-500 uppercase">
                    {row.label}
                  </dt>
                  <dd className="mt-0.5 font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </KitSection>
        ) : null}

        {sponsors.length > 0 ? (
          <KitSection title="Brands I've worked with" accent={accent}>
            <ul className="flex flex-wrap gap-2">
              {sponsors.map((sponsor) => (
                <li
                  key={sponsor.name}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-sm font-medium"
                >
                  <BadgeCheck className="size-4" style={{ color: accent }} />
                  {sponsor.name}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-zinc-400">
              Verified from completed deals tracked in Streamer Tools.
            </p>
          </KitSection>
        ) : null}

        {data.brandHighlights.length > 0 ? (
          <KitSection title="Highlights" accent={accent}>
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {data.brandHighlights.map((highlight, i) => (
                <li key={i}>{highlight}</li>
              ))}
            </ul>
          </KitSection>
        ) : null}

        {data.rateCard.length > 0 ? (
          <KitSection title="Rates" accent={accent}>
            <table className="w-full text-sm">
              <tbody>
                {data.rateCard.map((line, i) => (
                  <tr
                    key={i}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="py-2 pr-4">{line.label}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {line.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </KitSection>
        ) : null}

        {data.contactEmail ? (
          <footer
            style={{ backgroundColor: accent }}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-5 py-4 text-white"
          >
            <span className="text-sm font-semibold">
              Let&apos;s work together
            </span>
            <a
              href={`mailto:${data.contactEmail}`}
              className="flex items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline"
            >
              <Mail className="size-4" />
              {data.contactEmail}
            </a>
          </footer>
        ) : null}
      </div>
    </article>
  );
}

function KitSection({
  title,
  accent,
  badge,
  children,
}: {
  title: string;
  accent: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className="mb-3 flex items-center justify-between gap-2 border-b pb-1.5 text-sm font-semibold tracking-wide uppercase"
        style={{ borderColor: accent }}
      >
        {title}
        {badge}
      </h2>
      {children}
    </section>
  );
}
