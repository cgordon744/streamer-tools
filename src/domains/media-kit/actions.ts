"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/core/auth/session";
import { flags } from "@/core/config/flags";
import { trackEvent } from "@/core/events/track";
import { getYouTubeClient, type ChannelSnapshot } from "@/core/youtube/client";
import { parseChannelRef, type ChannelRef } from "@/core/youtube/parse";
import {
  getChannelForUser,
  upsertChannelForUser,
} from "@/core/youtube/queries";
import {
  getKitForUser,
  publishKit,
  unpublishKit,
  upsertKitForUser,
} from "@/domains/media-kit/queries";
import {
  channelRefSchema,
  kitInputSchema,
} from "@/domains/media-kit/validation";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";

// Defense in depth — pages 404 while the flag is off, but actions are their
// own endpoints.
function featureDisabled(): ActionResult | null {
  return flags.mediaKitEnabled
    ? null
    : actionError("The media kit tool isn't available yet.");
}

// The editor submits structured state (rate-card lines, highlight lists), not
// FormData — zod at the boundary treats it as untrusted either way.
export async function saveKitAction(input: unknown): Promise<ActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;
  const userId = await requireUserId();

  const parsed = kitInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0].message);
  }

  const { created } = await upsertKitForUser(userId, parsed.data);
  if (created) {
    await trackEvent(userId, "kit_created");
  }
  revalidatePath("/media-kit");
  return actionSuccess("Kit saved");
}

export async function connectChannelAction(
  input: unknown,
): Promise<ActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;
  const userId = await requireUserId();

  const parsedInput = channelRefSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionError(parsedInput.error.issues[0].message);
  }
  const ref = parseChannelRef(parsedInput.data);
  if (!ref) {
    return actionError(
      "Couldn't read that — paste a channel URL, @handle, or channel ID",
    );
  }

  const snapshot = await fetchSnapshot(ref);
  if (!snapshot.ok) return snapshot.error;

  await upsertChannelForUser(userId, snapshot.value);
  revalidatePath("/media-kit");
  return actionSuccess("Channel connected");
}

export async function refreshChannelStatsAction(): Promise<ActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;
  const userId = await requireUserId();

  const channel = await getChannelForUser(userId);
  if (!channel) {
    return actionError("Connect a channel first");
  }

  const snapshot = await fetchSnapshot({
    kind: "id",
    value: channel.channelId,
  });
  if (!snapshot.ok) return snapshot.error;

  await upsertChannelForUser(userId, snapshot.value);
  revalidatePath("/media-kit");
  return actionSuccess("Stats refreshed");
}

export async function publishKitAction(): Promise<ActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;
  const userId = await requireUserId();

  const existing = await getKitForUser(userId);
  if (!existing) {
    return actionError("Save your kit before publishing");
  }
  const alreadyPublished = existing.publishedAt !== null;
  const kit = await publishKit(userId);
  if (!kit) {
    return actionError("Save your kit before publishing");
  }
  if (!alreadyPublished) {
    await trackEvent(userId, "kit_published");
  }
  revalidatePath("/media-kit");
  return actionSuccess("Kit published");
}

export async function unpublishKitAction(): Promise<ActionResult> {
  const disabled = featureDisabled();
  if (disabled) return disabled;
  const userId = await requireUserId();

  const kit = await unpublishKit(userId);
  if (!kit) {
    return actionError("No kit to unpublish");
  }
  revalidatePath("/media-kit");
  return actionSuccess("Kit unpublished — the link now shows nothing");
}

type SnapshotResult =
  { ok: true; value: ChannelSnapshot } | { ok: false; error: ActionResult };

async function fetchSnapshot(ref: ChannelRef): Promise<SnapshotResult> {
  try {
    const snapshot = await getYouTubeClient().fetchChannel(ref);
    if (!snapshot) {
      return {
        ok: false,
        error: actionError("No channel found for that link"),
      };
    }
    return { ok: true, value: snapshot };
  } catch (error) {
    console.error("YouTube fetch failed", error);
    return {
      ok: false,
      error: actionError("YouTube didn't respond — try again in a minute"),
    };
  }
}
