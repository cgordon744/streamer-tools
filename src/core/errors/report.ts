import * as Sentry from "@sentry/nextjs";

// Chassis error-reporting entry point for errors we catch and handle (the
// uncaught path already flows through instrumentation.ts onRequestError).
// Routes and core code report through this, never the vendor SDK directly,
// so the provider stays swappable in one file — same boundary idea as
// core/email/sender.ts. Console output keeps Vercel logs useful; capture is
// a no-op while Sentry is disabled (no DSN).
export function reportError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  console.error("[reportError]", error, context ?? "");
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
