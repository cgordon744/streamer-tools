import * as Sentry from "@sentry/nextjs";

// Next.js instrumentation hook: runs once per server instance, before it
// serves requests. Loads the runtime-appropriate Sentry init from /core.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/core/errors/sentry-server");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("@/core/errors/sentry-edge");
  }
}

// Server errors (RSC renders, route handlers, server actions, proxy) flow
// through this hook to Sentry. No-op while Sentry is disabled (no DSN).
export const onRequestError = Sentry.captureRequestError;
