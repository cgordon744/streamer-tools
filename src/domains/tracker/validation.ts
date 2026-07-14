import { z } from "zod";

import { CONTENT_TYPES, DEAL_STATUSES } from "@/core/config/deals";
import { parseDollarsToCents } from "@/lib/money";
import { emptyToNull } from "@/lib/validation";

const optionalDate = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .nullable()
    .default(null),
);

export const dealInputSchema = z.object({
  sponsorId: z.string().uuid("Pick a sponsor"),
  status: z.enum(DEAL_STATUSES),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .transform((value, ctx) => {
      const cents = parseDollarsToCents(value);
      if (cents === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a dollar amount like 1500 or 1,500.00",
        });
        return z.NEVER;
      }
      return cents;
    }),
  contentType: z.enum(CONTENT_TYPES),
  deliverableDueDate: optionalDate,
  paymentDueDate: optionalDate,
  notes: z.preprocess(
    emptyToNull,
    z.string().trim().max(5000).nullable().default(null),
  ),
});

export type DealInput = z.infer<typeof dealInputSchema>;

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
