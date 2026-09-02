import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/clients";
import { maskEmail } from "@/lib/log";
import { weeklyPractice } from "@/lib/time";
import type { EventRecord } from "@/lib/types";

export async function recordPaidCheckout(session: Stripe.Checkout.Session, paidAt: Date) {
  if (session.payment_status !== "paid") return null;
  const email = session.customer_details?.email;
  if (!email) {
    console.error("Paid Checkout Session has no customer email", { sessionId: session.id });
    return { adminAlert: `Stripe Session ${session.id}: отсутствует e-mail покупателя.` };
  }

  const db = supabaseAdmin();
  // A replay must keep the original week, including registrations made before
  // weekly routing was enabled. Never revive a refunded registration.
  const existing = await db.from("registrations").select("id, event_id, status")
    .eq("stripe_session_id", session.id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    return existing.data.event_id && existing.data.status === "paid"
      ? { registrationId: existing.data.id as string } : null;
  }

  const requestedEventId = session.metadata?.event_id ?? null;
  let eventId: string | null = null;
  if (requestedEventId) {
    const result = await db.from("events").select("*").eq("id", requestedEventId).maybeSingle();
    if (result.error) throw result.error;
    const template = result.data as EventRecord | null;
    if (template) {
      const practice = weeklyPractice(paidAt);
      eventId = `${template.id}:weekly:${practice.date}`;
      // Separate immutable rows keep earlier registrations/reminders on their
      // original date. The unique primary key also protects concurrent payments.
      const occurrence = await db.from("events").upsert({
        id: eventId,
        title: template.title,
        description: template.description,
        starts_at: practice.startsAt,
        duration_minutes: template.duration_minutes,
        zoom_url: template.zoom_url,
        zoom_passcode: template.zoom_passcode,
        status: "published"
      }, { onConflict: "id", ignoreDuplicates: true });
      if (occurrence.error) throw occurrence.error;
    }
  }

  const row = {
    event_id: eventId, email, name: session.customer_details?.name ?? null,
    stripe_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === "string"
      ? session.payment_intent : session.payment_intent?.id ?? null,
    amount_paid: session.amount_total ?? 0,
    currency: session.currency ?? "unknown",
    paid_at: paidAt.toISOString(), status: "paid" as const
  };
  const inserted = await db.from("registrations")
    .upsert(row, { onConflict: "stripe_session_id", ignoreDuplicates: true })
    .select("id").maybeSingle();
  if (inserted.error) throw inserted.error;

  if (!inserted.data) {
    // Another delivery may have won the insert; use its saved assignment.
    const winner = await db.from("registrations").select("id, event_id, status")
      .eq("stripe_session_id", session.id).single();
    if (winner.error) throw winner.error;
    return winner.data.event_id && winner.data.status === "paid"
      ? { registrationId: winner.data.id as string } : null;
  }
  if (!eventId) {
    console.error("Payment could not be linked to a weekly template", {
      sessionId: session.id, requestedEventId, email: maskEmail(email)
    });
    return { adminAlert: `Stripe Session ${session.id}; event_id: ${requestedEventId ?? "отсутствует"}; покупатель: ${maskEmail(email)}. Оплата сохранена, но практика не назначена.` };
  }
  return { registrationId: inserted.data.id as string };
}
