"use server";

import { revalidatePath } from "next/cache";

import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireUserId } from "@/core/auth/session";
import { DEAL_STATUS_LABELS } from "@/core/config/deals";
import {
  createDeal,
  createSponsor,
  deleteDeal,
  deleteSponsor,
  getSponsor,
  updateDeal,
  updateDealStatus,
  updateSponsor,
} from "@/domains/tracker/queries";
import {
  dealInputSchema,
  sponsorInputSchema,
} from "@/domains/tracker/validation";

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

export async function updateDealStatusAction(
  dealId: string,
  status: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsedStatus = dealInputSchema.shape.status.safeParse(status);
  if (!parsedStatus.success) {
    return actionError("Invalid status");
  }
  const updated = await updateDealStatus(userId, dealId, parsedStatus.data);
  if (!updated) {
    return actionError("Deal not found");
  }
  revalidateDealPages();
  return actionSuccess(`Moved to ${DEAL_STATUS_LABELS[parsedStatus.data]}`);
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

function parseSponsorForm(formData: FormData) {
  return sponsorInputSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    notes: formData.get("notes"),
  });
}

// Sponsors appear on their own page and in dashboard filter options.
function revalidateSponsorPages() {
  revalidatePath("/sponsors");
  revalidatePath("/");
}

export async function createSponsorAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = parseSponsorForm(formData);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0].message);
  }
  await createSponsor(userId, parsed.data);
  revalidateSponsorPages();
  return actionSuccess("Sponsor created");
}

export async function updateSponsorAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const sponsorId = formData.get("id");
  if (typeof sponsorId !== "string" || !sponsorId) {
    return actionError("Missing sponsor id");
  }
  const parsed = parseSponsorForm(formData);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0].message);
  }
  const updated = await updateSponsor(userId, sponsorId, parsed.data);
  if (!updated) {
    return actionError("Sponsor not found");
  }
  revalidateSponsorPages();
  return actionSuccess("Sponsor updated");
}

export async function deleteSponsorAction(
  sponsorId: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const deleted = await deleteSponsor(userId, sponsorId);
  if (!deleted) {
    return actionError("Sponsor not found");
  }
  revalidateSponsorPages();
  return actionSuccess("Sponsor deleted");
}
