import { z } from "zod";

import { emptyToNull } from "@/lib/validation";

export const sponsorInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  contactName: z.preprocess(
    emptyToNull,
    z.string().trim().max(200).nullable().default(null),
  ),
  contactEmail: z.preprocess(
    emptyToNull,
    z.string().trim().email("Invalid email").max(320).nullable().default(null),
  ),
  notes: z.preprocess(
    emptyToNull,
    z.string().trim().max(5000).nullable().default(null),
  ),
});

export type SponsorInput = z.infer<typeof sponsorInputSchema>;
