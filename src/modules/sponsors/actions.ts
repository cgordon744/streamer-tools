"use server";

import { revalidatePath } from "next/cache";

import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireUserId } from "@/modules/auth/session";
import {
  createSponsor,
  deleteSponsor,
  updateSponsor,
} from "@/modules/sponsors/service";
import { sponsorInputSchema } from "@/modules/sponsors/validation";

function parseSponsorForm(formData: FormData) {
  return sponsorInputSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    notes: formData.get("notes"),
  });
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
  revalidatePath("/sponsors");
  revalidatePath("/");
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
  revalidatePath("/sponsors");
  revalidatePath("/");
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
  revalidatePath("/sponsors");
  revalidatePath("/");
  return actionSuccess("Sponsor deleted");
}
