import * as Sentry from "@sentry/nextjs";

// Chassis-level error tracking (CHASSIS_SPEC §7), Node runtime. Enabled only
// when SENTRY_DSN exists — local dev and CI run without the service, same
// pattern as the email sender flag. Server-side only for now: the goal is
// alerting on production crashes, not client telemetry or tracing.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0,
});
