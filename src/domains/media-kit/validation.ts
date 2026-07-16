import { z } from "zod";

import { MEDIA_KIT_TEMPLATES } from "@/core/config/media-kit";
import { emptyToNull } from "@/lib/validation";

const optionalText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max).nullable().default(null),
  );

// Rate-card lines arrive as JSON from the editor (client keeps them as
// structured state, not form fields). Price is free text on purpose — kits
// quote ranges ("$1,500–$2,500") and bundles, not ledger amounts.
const rateCardSchema = z
  .array(
    z.object({
      label: z.string().trim().min(1, "Rate line needs a label").max(120),
      price: z.string().trim().min(1, "Rate line needs a price").max(60),
    }),
  )
  .max(12, "At most 12 rate lines");

const brandHighlightsSchema = z
  .array(z.string().trim().min(1).max(160))
  .max(12, "At most 12 highlights");

export const kitInputSchema = z.object({
  template: z.enum(MEDIA_KIT_TEMPLATES),
  niche: optionalText(80),
  pitch: optionalText(500),
  audienceAge: optionalText(80),
  audienceGender: optionalText(80),
  audienceGeo: optionalText(120),
  contactEmail: z.preprocess(
    emptyToNull,
    z.string().trim().email("Invalid email").max(320).nullable().default(null),
  ),
  accentColor: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid color")
      .nullable()
      .default(null),
  ),
  rateCard: rateCardSchema,
  brandHighlights: brandHighlightsSchema,
  showVerifiedSponsors: z.boolean(),
});

export type KitInput = z.infer<typeof kitInputSchema>;

export const channelRefSchema = z
  .string()
  .trim()
  .min(1, "Paste your channel URL or @handle")
  .max(200);
