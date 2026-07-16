// Simple config-driven feature flags (CHASSIS_SPEC §7) — no third-party
// service. Flags read env so they can differ per environment without a
// deploy-time code change.

export const flags = {
  // Real email sending. Off until an email-provider credential exists —
  // the reminder pipeline logs instead of sending (see /core/email).
  emailRemindersEnabled: process.env.EMAIL_REMINDERS_ENABLED === "true",
  // Public signup. Off until the founder opens signup — gated on the
  // verified email domain + EMAIL_FROM (BUILD_LOG NEEDS INPUT #6). While
  // off, /signup 404s and the signup action refuses.
  signupEnabled: process.env.SIGNUP_ENABLED === "true",
  // Media kit generator (tool #2). New tools launch behind a flag
  // (CHASSIS_SPEC §7); while off, /media-kit and public /kit/[slug] 404.
  mediaKitEnabled: process.env.MEDIA_KIT_ENABLED === "true",
} as const;
