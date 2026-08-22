import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { notifyAdmin } from "@/lib/mail";
import { deliverReminder } from "@/lib/reminders";
import { supabaseAdmin } from "@/lib/clients";
import { sweepWindow } from "@/lib/time";
import type { EventRecord, RegistrationRecord } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request) {
  const actual = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env().SWEEP_SECRET}`;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const window = sweepWindow();
  const query = await db.from("registrations")
    .select("*, events!inner(*)")
    .eq("status", "paid")
    .is("reminder_sent_at", null)
    .eq("events.status", "published")
    .gte("events.starts_at", window.from)
    .lte("events.starts_at", window.to);

  if (query.error) {
    console.error("Sweep query failed", { error: query.error });
    return NextResponse.json({ error: "Database query failed" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  const byEvent = new Map<string, number>();

  for (const row of query.data ?? []) {
    const registration = row as RegistrationRecord & { events: EventRecord };
    try {
      const result = await deliverReminder(registration.id, "sweep");
      if (result.sent) {
        sent++;
        byEvent.set(registration.events.title, (byEvent.get(registration.events.title) ?? 0) + 1);
      }
    } catch {
      failed++;
    }
  }

  if (sent > 0 || failed > 0) {
    const events = [...byEvent.entries()]
      .map(([title, count]) => `— ${title}: ${count}`)
      .join("\n");
    try {
      await notifyAdmin(
        "Сработала подстраховка напоминаний",
        `Найдено: ${query.data?.length ?? 0}\nОтправлено: ${sent}\nОшибок: ${failed}${events ? `\n\nМероприятия:\n${events}` : ""}`
      );
    } catch (error) {
      console.error("Sweep admin summary failed", { error });
    }
  }

  return NextResponse.json({
    candidates: query.data?.length ?? 0,
    emailsSent: sent,
    failed,
    window
  });
}
