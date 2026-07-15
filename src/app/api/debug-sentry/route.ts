// Deliberate failure route to verify the error-tracking pipeline end to end
// (visit while logged in, then check Sentry). Session-protected by proxy.ts
// like every non-cron route, so it isn't a public error faucet.
export function GET(): never {
  throw new Error("debug-sentry: intentional verification error");
}
