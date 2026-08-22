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
