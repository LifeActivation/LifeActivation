import { emailLayout, escapeHtml, zoomButton } from "@/emails/layout";
import type { EventRecord } from "@/lib/types";
import { HEALING_EVENING_ID, HEALING_MORNING_ID, healingEveningEmail } from "@/emails/healing-evening";

export type ReminderMode = "hour" | "soon" | "started";

export function reminderEmail(event: EventRecord, time: string, mode: ReminderMode = "hour") {
  if (event.id === HEALING_MORNING_ID) return healingEveningEmail(mode, true);
  if (event.id === HEALING_EVENING_ID) return healingEveningEmail(mode);
  const pass = event.zoom_passcode ? `<p><strong>Пароль:</strong> ${escapeHtml(event.zoom_passcode)}</p>` : "";
  const heading = mode === "started" ? "Мы уже начинаем" : mode === "soon" ? "Скоро начинаем" : "Через час начинаем";
  return {
    subject: `${heading}: ${event.title}`,
    html: emailLayout(`${zoomButton(event.zoom_url)}${pass}<h1 style="font-size:24px">${heading}</h1><p>«${escapeHtml(event.title)}»</p><p><strong>Начало:</strong> ${escapeHtml(time)}</p>`),
    text: `${heading}: ${event.title}\nZoom: ${event.zoom_url}${event.zoom_passcode ? `\nПароль: ${event.zoom_passcode}` : ""}\nНачало: ${time}`
  };
}
