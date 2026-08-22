import { describe, expect, it } from "vitest";
import { reminderTiming, sweepWindow } from "@/lib/time";

describe("reminder timing", () => {
  it("schedules a future reminder exactly one hour before start", () => {
    expect(reminderTiming(
      "2026-09-02T14:00:00Z",
      new Date("2026-09-02T12:00:00Z")
    )).toEqual({
      kind: "scheduled",
      reminderAt: new Date("2026-09-02T13:00:00Z")
    });
  });

  it("sends immediately when payment arrives 30 minutes before start", () => {
    expect(reminderTiming(
      "2026-09-02T12:30:00Z",
      new Date("2026-09-02T12:00:00Z")
    ).kind).toBe("immediate");
  });

  it("recognizes payment after the event started", () => {
    expect(reminderTiming(
      "2026-09-02T11:59:00Z",
      new Date("2026-09-02T12:00:00Z")
    ).kind).toBe("started");
  });

  it("limits sweep to 60 minutes ahead and 15 minutes behind", () => {
    expect(sweepWindow(new Date("2026-09-02T12:00:00Z"))).toEqual({
      from: "2026-09-02T11:45:00.000Z",
      to: "2026-09-02T13:00:00.000Z"
    });
  });
});
