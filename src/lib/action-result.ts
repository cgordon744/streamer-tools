// Shared result shape for server actions across domain modules.
// Actions return this instead of throwing so forms can render errors inline.
export type ActionResult =
  { ok: true; message?: string } | { ok: false; message: string };

export const actionSuccess = (message?: string): ActionResult => ({
  ok: true,
  message,
});

export const actionError = (message: string): ActionResult => ({
  ok: false,
  message,
});
