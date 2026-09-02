import { describe, expect, it } from "vitest";
import { formatEventTime, reminderTiming, sweepWindow, weeklyPractice } from "@/lib/time";

describe("weekly practice payment window in Seattle", () => {
  it.each([
    ["2026-08-27T19:16:00-07:00", "2026-09-03", "2026-09-04T02:07:00.000Z"],
    ["2026-09-01T12:00:00-07:00", "2026-09-03", "2026-09-04T02:07:00.000Z"],
    ["2026-09-03T19:07:00-07:00", "2026-09-03", "2026-09-04T02:07:00.000Z"],
    ["2026-09-03T19:15:59.999-07:00", "2026-09-03", "2026-09-04T02:07:00.000Z"],
    ["2026-09-03T19:16:00-07:00", "2026-09-10", "2026-09-11T02:07:00.000Z"],
    ["2026-09-10T19:16:00-07:00", "2026-09-17", "2026-09-18T02:07:00.000Z"],
    ["2026-10-29T19:16:00-07:00", "2026-11-05", "2026-11-06T03:07:00.000Z"],
    ["2027-03-11T19:16:00-08:00", "2027-03-18", "2027-03-19T02:07:00.000Z"],
    ["2026-12-31T19:16:00-08:00", "2027-01-07", "2027-01-08T03:07:00.000Z"]
  ])("routes payment at %s to %s", (paidAt, date, startsAt) => {
    expect(weeklyPractice(new Date(paidAt))).toEqual({ date, startsAt });
  });
});

describe("email time formatting", () => {
  it("uses Seattle time with a capitalized Russian month", () => {
    expect(formatEventTime("2026-08-28T02:07:00Z")).toBe(
      "27 Августа 2026, 7:07 PM по времени Seattle"
    );
  });
});

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
