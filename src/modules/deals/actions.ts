"use server";

import { revalidatePath } from "next/cache";

import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireUserId } from "@/modules/auth/session";
import { getSponsor } from "@/modules/sponsors/service";
import { createDeal, deleteDeal, updateDeal } from "@/modules/deals/service";
import { dealInputSchema } from "@/modules/deals/validation";

function parseDealForm(formData: FormData) {
  return dealInputSchema.safeParse({
    sponsorId: formData.get("sponsorId"),
    status: formData.get("status"),
    amount: formData.get("amount"),
    contentType: formData.get("contentType"),
    deliverableDueDate: formData.get("deliverableDueDate"),
    paymentDueDate: formData.get("paymentDueDate"),
    notes: formData.get("notes"),
  });
}

function revalidateDealPages() {
  revalidatePath("/deals");
  revalidatePath("/");
}

export async function createDealAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = parseDealForm(formData);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0].message);
  }
  // The sponsor must belong to the acting user — never trust a submitted id.
  const sponsor = await getSponsor(userId, parsed.data.sponsorId);
  if (!sponsor) {
    return actionError("Sponsor not found");
  }
  await createDeal(userId, parsed.data);
  revalidateDealPages();
  return actionSuccess("Deal created");
}

export async function updateDealAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const dealId = formData.get("id");
  if (typeof dealId !== "string" || !dealId) {
    return actionError("Missing deal id");
  }
  const parsed = parseDealForm(formData);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0].message);
  }
  const sponsor = await getSponsor(userId, parsed.data.sponsorId);
  if (!sponsor) {
    return actionError("Sponsor not found");
  }
  const updated = await updateDeal(userId, dealId, parsed.data);
  if (!updated) {
    return actionError("Deal not found");
  }
  revalidateDealPages();
  return actionSuccess("Deal updated");
}

export async function deleteDealAction(dealId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const deleted = await deleteDeal(userId, dealId);
  if (!deleted) {
    return actionError("Deal not found");
  }
  revalidateDealPages();
  return actionSuccess("Deal deleted");
}
