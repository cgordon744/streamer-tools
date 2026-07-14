// Chassis email boundary: everything above this talks to EmailSender, so the
// provider is swappable in one file. Real sending needs RESEND_API_KEY *and*
// the emailRemindersEnabled flag; otherwise a console stub logs what would
// have been sent (safe default for every environment).

import { flags } from "@/core/config/flags";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type EmailSender = {
  /** Identifies the active implementation in logs/cron responses. */
  name: string;
  send(message: EmailMessage): Promise<void>;
};

const FROM_ADDRESS = "Streamer Tools <reminders@streamer-tools.app>";

const resendSender = (apiKey: string): EmailSender => ({
  name: "resend",
  async send(message) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
    }
  },
});

const consoleSender: EmailSender = {
  name: "console-stub",
  async send(message) {
    console.log(
      `[email stub] to=${message.to} subject="${message.subject}"\n${message.text}`,
    );
  },
};

export function getEmailSender(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY;
  if (flags.emailRemindersEnabled && apiKey) {
    return resendSender(apiKey);
  }
  return consoleSender;
}
