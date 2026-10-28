import { describe, expect, it } from "vitest";
import { confirmationEmail } from "@/emails/confirmation";
import { reminderEmail } from "@/emails/reminder";
import type { EventRecord } from "@/lib/types";

const event: EventRecord = {
  id: "novolunie-2026-09-02", title: "Практика новолуния", description: null,
  starts_at: "2026-09-02T23:00:00Z", duration_minutes: 90,
  zoom_url: "https://zoom.example/j/123", zoom_passcode: "moon", status: "published"
};

describe("email templates", () => {
  it("sends the in-person details without Zoom in confirmation and reminders", () => {
    const healing = { ...event, id: "healing-evening-2026-11-06", starts_at: "2026-11-07T03:00:00Z" };
    const emails = [confirmationEmail(healing, "time"), ...(["hour", "soon", "started"] as const).map(mode => reminderEmail(healing, "time", mode))];
    for (const email of emails) {
      for (const body of [email.html, email.text]) {
        expect(body).toContain("14040 NE 8th St, Suite 300");
        expect(body).toContain("+1 (206) 255-6802");
        expect(body).toContain("Коврик для йоги");
        expect(body).toContain("7:00–8:30 PM");
        expect(body).not.toContain("Zoom");
        expect(body).not.toContain(event.zoom_url);
      }
    }
    expect(emails[1].subject).toContain("Через час");
    expect(emails[3].text).not.toContain("прийти за 5–10 минут");
  });
  it.each([
    ["equinox-2026-09-22", "2026-09-22T17:05:00-07:00"],
    ["polnolunie-2026-09-26", "2026-09-26T09:30:00-07:00"]
  ])("keeps %s Zoom access until 40 minutes and then promises a recording", (id, starts_at) => {
    const equinox = { ...event, id, starts_at };
    for (const minutes of [10, 15, 20, 35, 39.999]) {
      const now = new Date(Date.parse(equinox.starts_at) + minutes * 60000);
      expect(confirmationEmail(equinox, "time", now).text).toContain(equinox.zoom_url);
    }
    for (const minutes of [40, 41, 1440]) {
      const now = new Date(Date.parse(equinox.starts_at) + minutes * 60000);
      const email = confirmationEmail(equinox, "time", now);
      for (const body of [email.html, email.text]) {
        expect(body).toContain("Запись практики будет отправлена на эту почту");
        expect(body).not.toContain(equinox.zoom_url);
        expect(body).not.toContain(equinox.zoom_passcode!);
        expect(body).not.toContain("За час");
      }
    }
  });
  it("puts Zoom URL and passcode in HTML and text", () => {
    for (const email of [confirmationEmail(event, "19:00 EDT"), reminderEmail(event, "19:00 EDT")]) {
      expect(email.html).toContain(event.zoom_url);
      expect(email.text).toContain(event.zoom_url);
      expect(email.html).toContain("moon");
      expect(email.text).toContain("moon");
    }
  });

  it("uses honest wording for late purchases", () => {
    expect(reminderEmail(event, "19:00 EDT", "soon").subject).toContain("Скоро");
    expect(reminderEmail(event, "19:00 EDT", "started").subject).toContain("уже");
  });
});
