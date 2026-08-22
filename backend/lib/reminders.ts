import type { ReminderMode } from "@/emails/reminder";
import { qstashClient, supabaseAdmin } from "@/lib/clients";
import { env } from "@/lib/env";
import { maskEmail } from "@/lib/log";
import { notifyAdmin, sendReminder } from "@/lib/mail";
import { reminderTiming } from "@/lib/time";
import type { EventRecord, RegistrationRecord } from "@/lib/types";

export type DeliverySource = "qstash" | "sweep" | "immediate";

export async function deliverReminder(
  registrationId: string,
  source: DeliverySource,
  forcedMode?: ReminderMode
) {
  const db = supabaseAdmin();
  const claim = await db.rpc("claim_reminder", { p_registration_id: registrationId });
  if (claim.error) throw claim.error;
  if (!claim.data) return { sent: false, reason: "not-claimable" as const };

  const result = await db.from("registrations").select("*, events(*)")
    .eq("id", registrationId).single();
  if (result.error) {
    await db.from("registrations").update({ reminder_sending_at: null }).eq("id", registrationId);
    throw result.error;
  }

  const registration = result.data as RegistrationRecord & { events: EventRecord | null };
  if (registration.status !== "paid" || !registration.events) {
    await db.from("registrations").update({ reminder_sending_at: null }).eq("id", registrationId);
    return { sent: false, reason: "ineligible" as const };
  }

  const timing = reminderTiming(registration.events.starts_at);
  const mode: ReminderMode = forcedMode ?? (
    timing.kind === "started" ? "started" : timing.kind === "immediate" ? "soon" : "hour"
  );

  try {
    await sendReminder(registration.email, registration.events, mode, registrationId);
    const update = await db.from("registrations").update({
      reminder_sent_at: new Date().toISOString(),
      reminder_sending_at: null,
      reminder_delivery_source: source
    }).eq("id", registrationId);
    if (update.error) throw update.error;
    return { sent: true, eventId: registration.events.id };
  } catch (error) {
    await db.from("registrations").update({ reminder_sending_at: null }).eq("id", registrationId);
    console.error("Reminder delivery failed", {
      registrationId, email: maskEmail(registration.email), source, error
    });
    throw error;
  }
}

export async function scheduleOrSendReminder(registrationId: string) {
  const db = supabaseAdmin();
  const result = await db.from("registrations").select("*, events(*)")
    .eq("id", registrationId).single();
  if (result.error) throw result.error;
  const registration = result.data as RegistrationRecord & { events: EventRecord | null };
  if (registration.status !== "paid" || !registration.events || registration.reminder_sent_at) return;

  const timing = reminderTiming(registration.events.starts_at);
  if (timing.kind !== "scheduled") {
    await deliverReminder(
      registrationId,
      "immediate",
      timing.kind === "started" ? "started" : "soon"
    );
    if (timing.kind === "started") {
      await notifyAdmin(
        "Оплата после начала мероприятия",
        `Регистрация ${registrationId}; мероприятие ${registration.events.id}; участник ${maskEmail(registration.email)}. Ссылка для подключения отправлена сразу.`
      );
    }
    return;
  }

  const claim = await db.rpc("claim_reminder_schedule", { p_registration_id: registrationId });
  if (claim.error) throw claim.error;
  if (!claim.data) return;

  try {
    const response = await qstashClient().publishJSON({
      url: `${env().BACKEND_URL}/api/qstash/send-reminder`,
      body: { registrationId },
      notBefore: Math.floor(timing.reminderAt.getTime() / 1000),
      retries: 5,
      deduplicationId: `reminder-${registration.stripe_session_id}`,
      label: `event-reminder,${registration.events.id}`
    });
    const update = await db.from("registrations").update({
      qstash_message_id: response.messageId,
      qstash_scheduling_at: null,
      reminder_scheduled_at: new Date().toISOString(),
      reminder_scheduled_for: timing.reminderAt.toISOString()
    }).eq("id", registrationId);
    if (update.error) throw update.error;
  } catch (error) {
    await db.from("registrations").update({ qstash_scheduling_at: null }).eq("id", registrationId);
    const detail = error instanceof Error ? error.message : String(error);
    try {
      await notifyAdmin(
        "Не удалось запланировать напоминание в QStash",
        `Регистрация ${registrationId}; мероприятие ${registration.events.id}; начало ${registration.events.starts_at}; участник ${maskEmail(registration.email)}; ошибка: ${detail}. Sweep попробует восстановить доставку.`
      );
    } catch (adminError) {
      console.error("QStash and admin notification both failed", { registrationId, adminError });
    }
    throw error;
  }
}

export async function cancelScheduledReminder(messageId: string | null) {
  if (!messageId) return;
  const response = await fetch(`https://qstash.upstash.io/v2/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${env().QSTASH_TOKEN}` }
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`QStash cancellation failed: ${response.status}`);
  }
}
