import { formatInTimeZone } from "date-fns-tz";

export function formatEventTime(startsAt: string, zones: string[]) {
  return zones.map((zone) =>
    formatInTimeZone(startsAt, zone, "d MMMM yyyy, HH:mm zzz")
  ).join(" / ");
}

export function reminderWindow(now = new Date()) {
  return {
    from: new Date(now.getTime() + 45 * 60_000).toISOString(),
    to: new Date(now.getTime() + 75 * 60_000).toISOString()
  };
}

export type ReminderTiming = {
  kind: "scheduled" | "immediate" | "started";
  reminderAt: Date;
};

export function reminderTiming(startsAt: string, now = new Date()): ReminderTiming {
  const starts = new Date(startsAt);
  const reminderAt = new Date(starts.getTime() - 60 * 60_000);
  if (now < reminderAt) return { kind: "scheduled", reminderAt };
  if (now < starts) return { kind: "immediate", reminderAt };
  return { kind: "started", reminderAt };
}

export function sweepWindow(now = new Date()) {
  return {
    from: new Date(now.getTime() - 15 * 60_000).toISOString(),
    to: new Date(now.getTime() + 60 * 60_000).toISOString()
  };
}
