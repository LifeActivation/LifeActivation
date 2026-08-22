import { emailLayout, escapeHtml, zoomButton } from "@/emails/layout";
import type { EventRecord } from "@/lib/types";

export function confirmationEmail(event: EventRecord, time: string) {
  const pass = event.zoom_passcode ? `<p><strong>Пароль:</strong> ${escapeHtml(event.zoom_passcode)}</p>` : "";
  const title = escapeHtml(event.title);
  const safeTime = escapeHtml(time);
  return {
    subject: `Вы записаны: ${event.title} — ${time}`,
    html: emailLayout(`${zoomButton(event.zoom_url)}<h1 style="font-size:24px">Спасибо за оплату!</h1><p>Вы записаны на «${title}».</p><p><strong>Начало:</strong> ${safeTime}</p>${pass}${event.description ? `<p>${escapeHtml(event.description)}</p>` : ""}<p>За час до начала мы пришлём напоминание с этой же ссылкой.</p><p>Если возникнут проблемы, ответьте на это письмо.</p>`),
    text: `Спасибо за оплату!\n\nВы записаны на «${event.title}».\nНачало: ${time}\nZoom: ${event.zoom_url}${event.zoom_passcode ? `\nПароль: ${event.zoom_passcode}` : ""}\n\nЗа час до начала мы пришлём напоминание. Если возникнут проблемы, ответьте на это письмо.`
  };
}
