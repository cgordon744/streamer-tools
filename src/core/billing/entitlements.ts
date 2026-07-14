// Entitlement checks (CHASSIS_SPEC §6). Domains never inspect billing state
// directly — this is the single gate. Until Stripe lands, every signed-in
// user has access to everything; when subscriptions arrive, this function
// becomes a subscription lookup and no call site changes.

// One key per portfolio tool (paid features gate at tool granularity —
// bundle pricing means there is no per-feature gating inside a tool).
export type Feature = "tracker";

export async function hasAccess(
  _userId: string,
  _feature: Feature,
): Promise<boolean> {
  return true;
}
