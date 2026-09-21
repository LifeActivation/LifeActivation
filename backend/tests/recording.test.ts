import { describe, it, expect } from "vitest";
import { recordingInput } from "@/lib/recording-input";
import { recordingEmail } from "@/emails/recording";

describe("recording mailing", () => {
  it("defaults to preview and rejects unsafe or unrelated URLs", () => {
    expect(recordingInput.parse({ eventId: "event", url: "https://vimeo.com/123" }).confirmSend).toBe(false);
    for (const url of ["javascript:alert(1)", "http://vimeo.com/123", "https://vimeo.com.evil.com/123", "https://user:pass@vimeo.com/123"]) {
      expect(recordingInput.safeParse({ eventId: "event", url }).success).toBe(false);
    }
  });
  it("escapes recording details and includes the Seattle deadline in both formats", () => {
    const email = recordingEmail("<Practice>", "https://vimeo.com/123?a=1&b=2", "<secret>", "2026-09-26T00:05:00Z");
    expect(email.html).not.toContain("<secret>");
    expect(email.html).toContain("&lt;secret&gt;");
    expect(email.text).toContain("<secret>");
    for (const body of [email.html, email.text]) expect(body).toContain("25 Сентября 2026, 5:05 PM по времени Seattle");
  });
});
