// Pure display formatting: ChannelDemographics → the kit's three Audience
// strings. Lives in core beside the type so every consuming domain renders
// demographics the same way.

import type { ChannelDemographics } from "@/core/youtube/analytics";

export type DemographicsDisplay = {
  audienceAge: string | null;
  audienceGender: string | null;
  audienceGeo: string | null;
};

export function formatDemographics(
  d: ChannelDemographics,
): DemographicsDisplay {
  return {
    audienceAge: formatAudienceAge(d),
    audienceGender: formatAudienceGender(d),
    audienceGeo: formatAudienceGeo(d),
  };
}

const regionNames = new Intl.DisplayNames("en", {
  type: "region",
  fallback: "code",
});

/** e.g. "18–24 (42%) · 25–34 (31%)" — the top two buckets. */
export function formatAudienceAge(d: ChannelDemographics): string | null {
  const top = d.ageGroups.filter((g) => Math.round(g.pct) > 0).slice(0, 2);
  if (top.length === 0) return null;
  return top
    .map((g) => `${formatAgeRange(g.range)} (${Math.round(g.pct)}%)`)
    .join(" · ");
}

/** e.g. "62% male / 36% female". */
export function formatAudienceGender(d: ChannelDemographics): string | null {
  const top = d.genders.filter((g) => Math.round(g.pct) > 0).slice(0, 2);
  if (top.length === 0) return null;
  return top.map((g) => `${Math.round(g.pct)}% ${g.group}`).join(" / ");
}

/** e.g. "United States 44% · United Kingdom 12% · Canada 7%". */
export function formatAudienceGeo(d: ChannelDemographics): string | null {
  const top = d.topCountries.filter((c) => Math.round(c.pct) > 0).slice(0, 3);
  if (top.length === 0) return null;
  return top
    .map((c) => `${regionName(c.code)} ${Math.round(c.pct)}%`)
    .join(" · ");
}

function formatAgeRange(range: string): string {
  // API buckets: "18-24" … "65-" (open-ended).
  if (range.endsWith("-")) return `${range.slice(0, -1)}+`;
  return range.replace("-", "–");
}

function regionName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}
