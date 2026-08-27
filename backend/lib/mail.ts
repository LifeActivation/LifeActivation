import { resendClient } from "@/lib/clients";
import { env } from "@/lib/env";
import { confirmationEmail } from "@/emails/confirmation";
import { reminderEmail, type ReminderMode } from "@/emails/reminder";
import { formatEventTime } from "@/lib/time";
import type { EventRecord } from "@/lib/types";
import { escapeHtml } from "@/emails/layout";

async function send(
  to: string,
  message: { subject: string; html: string; text: string },
  idempotencyKey?: string
) {
  const { error } = await resendClient().emails.send(
    { from: env().EMAIL_FROM, to, ...message },
    idempotencyKey ? { idempotencyKey } : undefined
  );
  if (error) throw new Error(`Resend: ${error.message}`);
}

export async function sendConfirmation(to: string, event: EventRecord, registrationId?: string) {
  return send(
    to,
    confirmationEmail(event, formatEventTime(event.starts_at)),
    registrationId ? `confirmation-${registrationId}` : undefined
  );
}

export async function sendReminder(
  to: string,
  event: EventRecord,
  mode: ReminderMode = "hour",
  registrationId?: string
) {
  return send(
    to,
    reminderEmail(event, formatEventTime(event.starts_at), mode),
    registrationId ? `reminder-${registrationId}` : undefined
  );
}

export async function notifyAdmin(subject: string, details: string) {
  return send(env().ADMIN_EMAIL, {
    subject,
    html: `<p>${escapeHtml(details)}</p>`,
    text: details
  });
}
