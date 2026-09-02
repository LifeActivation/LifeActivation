import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ru } from "date-fns/locale";

const EMAIL_TIME_ZONE = "America/Los_Angeles";

// Calendar arithmetic is deliberately independent of the server's timezone.
export function weeklyPractice(paidAt: Date) {
  const localDate = formatInTimeZone(paidAt, EMAIL_TIME_ZONE, "yyyy-MM-dd");
  const calendar = new Date(`${localDate}T00:00:00Z`);
  let daysAhead = (4 - calendar.getUTCDay() + 7) % 7;
  const localTime = formatInTimeZone(paidAt, EMAIL_TIME_ZONE, "HH:mm:ss");
  if (daysAhead === 0 && localTime >= "19:16:00") daysAhead = 7;
  calendar.setUTCDate(calendar.getUTCDate() + daysAhead);
  const date = calendar.toISOString().slice(0, 10);
  return {
    date,
    startsAt: fromZonedTime(`${date}T19:07:00`, EMAIL_TIME_ZONE).toISOString()
  };
}

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
