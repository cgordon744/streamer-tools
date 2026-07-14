// The tracker domain's public type surface. Other domains and routes should
// prefer importing types from here (or values from queries.ts / actions.ts)
// rather than reaching into schema/validation internals.

export type { Deal, Sponsor } from "@/domains/tracker/schema";
export type { DealFilters, DealStats, DealWithSponsor } from "@/domains/tracker/queries";
export type { DealInput, SponsorInput } from "@/domains/tracker/validation";
