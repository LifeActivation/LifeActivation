import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin, resendClient } from "@/lib/clients";
import { env } from "@/lib/env";
import { recordingInput } from "@/lib/recording-input";
import { recordingEmail } from "@/emails/recording";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env().SWEEP_SECRET}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = recordingInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid recording details" }, { status: 400 });
  const input = parsed.data;
  const db = supabaseAdmin();
  try {
    const event = await db.from("events").select("id,title,starts_at,status").eq("id", input.eventId).single();
    if (event.error || !event.data) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.data.status === "draft" || Date.parse(event.data.starts_at) > Date.now()) {
      return NextResponse.json({ error: "Event has not started" }, { status: 409 });
    }
    const recipients = await db.rpc("recording_recipients", { p_event_id: input.eventId });
    if (recipients.error) throw recipients.error;
    const existing = await db.from("recording_mailings").select("*").eq("event_id", input.eventId).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data && (existing.data.url !== input.url || existing.data.passcode !== input.passcode)) {
      return NextResponse.json({ error: "Mailing already exists with different recording details" }, { status: 409 });
    }
    if (!input.confirmSend) return NextResponse.json({
      preview: true, event: event.data.title, recipients: recipients.data.length,
      expiresAt: existing.data?.expires_at ?? null, accessHours: 72,
      notice: "Video access must be closed separately on Vimeo or YouTube."
    });
    if (!existing.data) {
      const insert = await db.from("recording_mailings").insert({
        event_id: input.eventId, url: input.url, passcode: input.passcode,
        expires_at: new Date(Date.now() + 72 * 3600000).toISOString()
      });
      if (insert.error && insert.error.code !== "23505") throw insert.error;
    }
    const mailing = await db.from("recording_mailings").select("*").eq("event_id", input.eventId).single();
    if (mailing.error) throw mailing.error;
    if (mailing.data.url !== input.url || mailing.data.passcode !== input.passcode || Date.parse(mailing.data.expires_at) <= Date.now()) {
      return NextResponse.json({ error: "Mailing expired or changed; review before sending" }, { status: 409 });
    }
    let sent = 0, needsReview = 0, attempted = 0;
    // Unique insert is a durable claim: concurrent requests cannot send twice.
    // A failed/ambiguous attempt stays claimed, even beyond Resend's dedup window.
    for (const { email } of recipients.data as { email: string }[]) {
      if (attempted >= 20) break;
      const claim = await db.from("recording_deliveries").insert({ event_id: input.eventId, email }).select("id").single();
      if (claim.error?.code === "23505") continue;
      if (claim.error) throw claim.error;
      attempted++;
      try {
        const result = await resendClient().emails.send({
          from: env().EMAIL_FROM, to: email,
          ...recordingEmail(event.data.title, mailing.data.url, mailing.data.passcode, mailing.data.expires_at)
        }, { idempotencyKey: `recording-${claim.data.id}` });
        if (result.error) throw new Error("Recording delivery failed");
        const update = await db.from("recording_deliveries").update({ sent_at: new Date().toISOString() }).eq("id", claim.data.id);
        if (update.error) throw update.error;
        sent++;
      } catch { needsReview++; }
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    return NextResponse.json({ sent, needsReview, attempted, expiresAt: mailing.data.expires_at,
      batchLimit: 20, repeatUntilNoAttempts: true });
  } catch {
    return NextResponse.json({ error: "Recording mailing failed; inspect delivery records before retrying" }, { status: 500 });
  }
}
