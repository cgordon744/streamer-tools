// The tracker domain's public type surface. Other domains and routes should
// prefer importing types from here (or values from queries.ts / actions.ts)
// rather than reaching into schema/validation internals.

export type { Deal, Deliverable, Sponsor } from "@/domains/tracker/schema";
export type {
  DealFilters,
  DealHistoryEntry,
  DealStats,
  DealWithSponsor,
  VerifiedSponsor,
} from "@/domains/tracker/queries";
export type {
  DealInput,
  DeliverableInput,
  SponsorInput,
} from "@/domains/tracker/validation";
export type { PaymentFields } from "@/domains/tracker/payments";
