import * as Sentry from "@sentry/nextjs";

// Edge-runtime counterpart of sentry-server.ts — covers errors thrown in
// src/proxy.ts (request interception runs at the edge).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0,
});
