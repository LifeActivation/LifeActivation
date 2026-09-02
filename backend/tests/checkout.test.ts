import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { recordPaidCheckout } from "@/lib/checkout";
import { supabaseAdmin } from "@/lib/clients";
import { formatEventTime } from "@/lib/time";
import { confirmationEmail } from "@/emails/confirmation";
import type { EventRecord } from "@/lib/types";

vi.mock("@/lib/clients", () => ({ supabaseAdmin: vi.fn() }));

type Row = Record<string, any>;
let tables: Record<string, Row[]>;
const template: EventRecord = {
  id: "weekly-practice", title: "Еженедельная практика", description: null,
  starts_at: "2026-08-28T02:07:00Z", duration_minutes: 90,
  zoom_url: "https://zoom.example/j/123", zoom_passcode: "practice", status: "published"
};
function session(id = "cs_paid") {
  return {
    id, payment_status: "paid", metadata: { event_id: template.id },
    customer_details: { email: "test@example.com", name: "Test" },
    payment_intent: "pi_test", amount_total: 3200, currency: "usd",
    // Opening Checkout before the cutoff must not determine the paid week.
    created: Date.parse("2026-09-03T18:00:00-07:00") / 1000
  } as unknown as Stripe.Checkout.Session;
}

beforeEach(() => {
  tables = { events: [{ ...template }], registrations: [] };
  const db = {
    from(table: string) {
      let rows = tables[table];
      const query = {
        select() { return query; },
        eq(key: string, value: unknown) { rows = rows.filter(row => row[key] === value); return query; },
        upsert(row: Row, options: { onConflict: string; ignoreDuplicates: boolean }) {
          expect(options.ignoreDuplicates).toBe(true);
          const existing = tables[table].find(item => item[options.onConflict] === row[options.onConflict]);
          if (existing) rows = [];
          else {
            const inserted = { id: `reg-${tables[table].length}`, ...row };
            tables[table].push(inserted);
            rows = [inserted];
          }
          return query;
        },
        async maybeSingle() { return { data: rows[0] ?? null, error: null }; },
        async single() { return query.maybeSingle(); },
        then(resolve: (result: { data: Row[]; error: null }) => unknown) {
          return Promise.resolve(resolve({ data: rows, error: null }));
        }
      };
      return query;
    }
  };
  vi.mocked(supabaseAdmin).mockReturnValue(db as unknown as ReturnType<typeof supabaseAdmin>);
});

describe("weekly checkout registration", () => {
  it("saves the paid week and uses its date and constant Zoom URL in the email", async () => {
    const paidAt = new Date("2026-09-03T19:16:00-07:00");
    await recordPaidCheckout(session(), paidAt);
    expect(tables.registrations[0]).toMatchObject({
      event_id: "weekly-practice:weekly:2026-09-10", paid_at: paidAt.toISOString()
    });
    const practice = tables.events[1] as EventRecord;
    expect(practice.starts_at).toBe("2026-09-11T02:07:00.000Z");
    const email = confirmationEmail(practice, formatEventTime(practice.starts_at));
    expect(email.text).toContain("10 Сентября 2026, 7:07 PM по времени Seattle");
    expect(email.text).toContain(template.zoom_url);
    expect(practice.zoom_passcode).toBe(template.zoom_passcode);
    expect(tables.events[0]).toEqual(template);
  });

  it("does not move a registration or create another week on webhook replay", async () => {
    await recordPaidCheckout(session(), new Date("2026-09-03T19:15:59-07:00"));
    const saved = { ...tables.registrations[0] };
    await recordPaidCheckout(session(), new Date("2026-09-10T19:16:00-07:00"));
    expect(tables.registrations).toEqual([saved]);
    expect(tables.events).toHaveLength(2);
    expect(saved.event_id).toBe("weekly-practice:weekly:2026-09-03");
  });

  it("keeps two payments from the same email separate and reuses the week's event", async () => {
    const paidAt = new Date("2026-09-01T12:00:00-07:00");
    await recordPaidCheckout(session("cs_one"), paidAt);
    await recordPaidCheckout(session("cs_two"), paidAt);
    expect(tables.registrations).toHaveLength(2);
    expect(tables.events).toHaveLength(2);
  });

  it("does not reassign or revive a refunded registration", async () => {
    tables.registrations.push({ id: "old", stripe_session_id: "cs_paid", event_id: template.id, status: "refunded" });
    expect(await recordPaidCheckout(session(), new Date())).toBeNull();
    expect(tables.events).toHaveLength(1);
    expect(tables.registrations[0].status).toBe("refunded");
  });

  it("preserves a paid registration created before weekly routing", async () => {
    tables.registrations.push({ id: "old", stripe_session_id: "cs_paid", event_id: template.id, status: "paid" });
    expect(await recordPaidCheckout(session(), new Date())).toEqual({ registrationId: "old" });
    expect(tables.events).toHaveLength(1);
    expect(tables.registrations[0].event_id).toBe(template.id);
  });

  it("does not register an unpaid checkout", async () => {
    expect(await recordPaidCheckout({ ...session(), payment_status: "unpaid" }, new Date())).toBeNull();
    expect(tables.registrations).toHaveLength(0);
    expect(tables.events).toHaveLength(1);
  });

  it("records and flags a payment with no template instead of inventing a Zoom URL", async () => {
    const result = await recordPaidCheckout({ ...session(), metadata: {} }, new Date());
    expect(result).toHaveProperty("adminAlert");
    expect(tables.registrations[0].event_id).toBeNull();
    expect(tables.events).toHaveLength(1);
  });
});
