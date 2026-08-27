import { formatInTimeZone } from "date-fns-tz";
import { ru } from "date-fns/locale";

const EMAIL_TIME_ZONE = "America/Los_Angeles";

export function formatEventTime(startsAt: string) {
  const dayAndYear = formatInTimeZone(startsAt, EMAIL_TIME_ZONE, "d yyyy");
  const month = formatInTimeZone(startsAt, EMAIL_TIME_ZONE, "MMMM", { locale: ru });
  const time = formatInTimeZone(startsAt, EMAIL_TIME_ZONE, "h:mm a");
  const [day, year] = dayAndYear.split(" ");

  return `${day} ${month[0].toUpperCase()}${month.slice(1)} ${year}, ${time} по времени Seattle`;
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
