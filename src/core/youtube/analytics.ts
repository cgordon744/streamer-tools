// YouTube Analytics API v2 client (owner-authorized demographics). Same
// swap-in-one-file boundary as client.ts: the real client activates when the
// Google OAuth env vars exist; otherwise a deterministic stub serves plausible
// demographics so dev/CI/tests exercise the full flow with no credential.

export type ChannelDemographics = {
  // API buckets like "18-24"; "65-" is rendered as "65+".
  ageGroups: { range: string; pct: number }[];
  // "male" / "female" / "other" (Google's user_specified).
  genders: { group: string; pct: number }[];
  // ISO 3166 alpha-2 codes with share of views.
  topCountries: { code: string; pct: number }[];
  windowDays: number;
};

export type AnalyticsClient = {
  /** Identifies the active implementation in logs. */
  name: string;
  fetchDemographics(accessToken: string): Promise<ChannelDemographics>;
};

const API_BASE = "https://youtubeanalytics.googleapis.com/v2/reports";
// Studio defaults to 28 days; 90 keeps small channels' splits stable.
export const DEMOGRAPHICS_WINDOW_DAYS = 90;
const TOP_COUNTRY_LIMIT = 5;

type ReportRow = (string | number)[];

// Rows are [ageGroup ("age18-24"), gender ("male"), viewerPercentage] — one
// row per age×gender cell. Collapse each axis by summing across the other.
export function mapViewerPercentageRows(rows: ReportRow[]): {
  ageGroups: ChannelDemographics["ageGroups"];
  genders: ChannelDemographics["genders"];
} {
  const ages = new Map<string, number>();
  const genders = new Map<string, number>();
  for (const row of rows) {
    const age = String(row[0]).replace(/^age/, "");
    const gender = normalizeGender(String(row[1]));
    const pct = Number(row[2]);
    if (!Number.isFinite(pct)) continue;
    ages.set(age, (ages.get(age) ?? 0) + pct);
    genders.set(gender, (genders.get(gender) ?? 0) + pct);
  }
  return {
    ageGroups: sortedSlices(ages).map(({ label, pct }) => ({
      range: label,
      pct,
    })),
    genders: sortedSlices(genders).map(({ label, pct }) => ({
      group: label,
      pct,
    })),
  };
}

// Rows are [countryCode, views]; convert to share-of-total because the
// country dimension doesn't support viewerPercentage.
export function mapCountryRows(
  rows: ReportRow[],
): ChannelDemographics["topCountries"] {
  const total = rows.reduce((sum, row) => sum + toViews(row[1]), 0);
  if (total <= 0) return [];
  return rows
    .map((row) => ({
      code: String(row[0]),
      pct: (toViews(row[1]) / total) * 100,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, TOP_COUNTRY_LIMIT);
}

function normalizeGender(apiValue: string): string {
  return apiValue === "user_specified" ? "other" : apiValue;
}

function sortedSlices(map: Map<string, number>): {
  label: string;
  pct: number;
}[] {
  return [...map.entries()]
    .map(([label, pct]) => ({ label, pct }))
    .sort((a, b) => b.pct - a.pct);
}

function toViews(value: string | number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

const realClient: AnalyticsClient = {
  name: "youtube-analytics-api",
  async fetchDemographics(accessToken) {
    const { startDate, endDate } = reportWindow();
    const [viewerRows, countryRows] = await Promise.all([
      queryReport(accessToken, {
        dimensions: "ageGroup,gender",
        metrics: "viewerPercentage",
        startDate,
        endDate,
      }),
      queryReport(accessToken, {
        dimensions: "country",
        metrics: "views",
        sort: "-views",
        maxResults: "25",
        startDate,
        endDate,
      }),
    ]);
    return {
      ...mapViewerPercentageRows(viewerRows),
      topCountries: mapCountryRows(countryRows),
      windowDays: DEMOGRAPHICS_WINDOW_DAYS,
    };
  },
};

function reportWindow(): { startDate: string; endDate: string } {
  // End yesterday (UTC): today's partial data isn't finalized.
  const end = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const start = new Date(
    end.getTime() - (DEMOGRAPHICS_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000,
  );
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function queryReport(
  accessToken: string,
  params: Record<string, string>,
): Promise<ReportRow[]> {
  const query = new URLSearchParams({ ids: "channel==MINE", ...params });
  const res = await fetch(`${API_BASE}?${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`YouTube Analytics API responded ${res.status}`);
  }
  const json = (await res.json()) as { rows?: ReportRow[] };
  return json.rows ?? [];
}

// Deterministic fake demographics derived from the seed (the userId), so
// dev/CI flows behave consistently run to run — same intent as the stub in
// client.ts. Never real data; prod ships dark until the credentials exist.
export function createStubAnalyticsClient(seed: string): AnalyticsClient {
  return {
    name: "stub",
    async fetchDemographics() {
      const hash = hashString(seed);
      const lead = 30 + (hash % 21); // dominant age bucket, 30–50%
      const second = Math.round((100 - lead) * 0.55);
      const third = Math.round((100 - lead) * 0.3);
      const rest = 100 - lead - second - third;
      const male = 40 + (hash % 31); // 40–70%
      return {
        ageGroups: [
          { range: "18-24", pct: lead },
          { range: "25-34", pct: second },
          { range: "35-44", pct: third },
          { range: "45-54", pct: rest },
        ],
        genders: [
          { group: "male", pct: male },
          { group: "female", pct: 98 - male },
          { group: "other", pct: 2 },
        ],
        topCountries: [
          { code: "US", pct: 30 + (hash % 15) },
          { code: "GB", pct: 10 + (hash % 6) },
          { code: "CA", pct: 5 + (hash % 4) },
        ],
        windowDays: DEMOGRAPHICS_WINDOW_DAYS,
      };
    },
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000_007;
  }
  return hash;
}

export function getAnalyticsClient(options: {
  stubSeed: string;
}): AnalyticsClient {
  return process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? realClient
    : createStubAnalyticsClient(options.stubSeed);
}
