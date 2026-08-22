import { after, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripeClient, supabaseAdmin } from "@/lib/clients";
import { env } from "@/lib/env";
import { maskEmail } from "@/lib/log";
import { notifyAdmin, sendConfirmation } from "@/lib/mail";
import { cancelScheduledReminder, scheduleOrSendReminder } from "@/lib/reminders";
import type { EventRecord } from "@/lib/types";

export const runtime = "nodejs";

async function processConfirmation(registrationId: string) {
  const db = supabaseAdmin();
  const { data: claimed, error: claimError } = await db.rpc("claim_confirmation", {
    p_registration_id: registrationId
  });
  if (claimError) throw claimError;
  if (!claimed) return;

  const { data: registration, error } = await db.from("registrations")
    .select("*, events(*)").eq("id", registrationId).single();
  if (error) throw error;

  try {
    await sendConfirmation(registration.email, registration.events as EventRecord, registrationId);
    await db.from("registrations").update({
      confirmation_sent_at: new Date().toISOString(), confirmation_sending_at: null
    }).eq("id", registrationId);
  } catch (error) {
    await db.from("registrations").update({ confirmation_sending_at: null }).eq("id", registrationId);
    throw error;
  }
}

async function recordCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return null;
  const email = session.customer_details?.email;
  if (!email) {
    console.error("Paid Checkout Session has no customer email", { sessionId: session.id });
    return { adminAlert: `Stripe Session ${session.id}: отсутствует e-mail покупателя.` };
  }

  const db = supabaseAdmin();
  const requestedEventId = session.metadata?.event_id ?? null;
  let event: EventRecord | null = null;
  if (requestedEventId) {
    const result = await db.from("events").select("*").eq("id", requestedEventId).maybeSingle();
    if (result.error) throw result.error;
    event = result.data as EventRecord | null;
  }

  const row = {
    event_id: event?.id ?? null,
    email,
    name: session.customer_details?.name ?? null,
    stripe_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    amount_paid: session.amount_total ?? 0,
    currency: session.currency ?? "unknown",
    paid_at: new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    status: "paid" as const
  };

  const { data: inserted, error: insertError } = await db.from("registrations")
    .upsert(row, { onConflict: "stripe_session_id", ignoreDuplicates: true })
    .select("id").maybeSingle();
  if (insertError) throw insertError;
  const wasInserted = Boolean(inserted);

  let registrationId = inserted?.id as string | undefined;
  if (!registrationId) {
    const existing = await db.from("registrations").select("id, confirmation_sent_at")
      .eq("stripe_session_id", session.id).single();
    if (existing.error) throw existing.error;
    registrationId = existing.data.id;
  }

  if (!event) {
    console.error("Payment could not be linked to an event", {
      sessionId: session.id, requestedEventId, email: maskEmail(email)
    });
    return wasInserted
      ? { adminAlert: `Stripe Session ${session.id}; event_id: ${requestedEventId ?? "отсутствует"}; покупатель: ${maskEmail(email)}. Оплата сохранена.` }
      : null;
  }
  return { registrationId };
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return [];
  const db = supabaseAdmin();
  const existing = await db.from("registrations").select("id, qstash_message_id")
    .eq("stripe_payment_intent_id", paymentIntentId);
  if (existing.error) throw existing.error;
  const { error } = await db.from("registrations")
    .update({ status: "refunded" }).eq("stripe_payment_intent_id", paymentIntentId);
  if (error) throw error;
  return (existing.data ?? []).map((row) => ({
    registrationId: row.id as string,
    messageId: row.qstash_message_id as string | null
  }));
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(rawBody, signature, env().STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    try {
      const result = await recordCompleted(event.data.object);
      if (result && "registrationId" in result) {
        const registrationId = result.registrationId;
        if (!registrationId) throw new Error("Registration ID is missing");
        after(async () => {
          try { await processConfirmation(registrationId); }
          catch (error) { console.error("Confirmation failed", { eventId: event.id, error }); }
          try { await scheduleOrSendReminder(registrationId); }
          catch (error) { console.error("Reminder scheduling failed", { eventId: event.id, error }); }
        });
      } else if (result?.adminAlert) {
        after(async () => {
          try { await notifyAdmin("Оплата требует внимания", result.adminAlert); }
          catch (error) { console.error("Admin notification failed", { eventId: event.id, error }); }
        });
      }
    } catch (error) {
      console.error("Checkout recording failed", { eventId: event.id, error });
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  } else if (event.type === "charge.refunded") {
    try {
      const reminders = await handleRefund(event.data.object);
      after(async () => {
        for (const reminder of reminders) {
          try {
            await cancelScheduledReminder(reminder.messageId);
          } catch (error) {
            console.error("QStash cancellation failed", { registrationId: reminder.registrationId, error });
            try {
              await notifyAdmin(
                "Не удалось отменить QStash-напоминание",
                `Регистрация ${reminder.registrationId}. Статус refund сохранён, поэтому endpoint всё равно не отправит письмо.`
              );
            } catch (adminError) {
              console.error("Refund admin notification failed", { adminError });
            }
          }
        }
      });
    }
    catch (error) {
      console.error("Refund processing failed", { eventId: event.id, error });
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
