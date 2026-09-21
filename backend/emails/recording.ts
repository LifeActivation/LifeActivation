import { emailLayout, escapeHtml } from "@/emails/layout";
import { formatEventTime } from "@/lib/time";

export function recordingEmail(title: string, url: string, passcode: string | null, expiresAt: string) {
  const deadline = formatEventTime(expiresAt);
  return {
    subject: `Запись практики: ${title}`,
    html: emailLayout(`<h1>Запись практики</h1><p>${escapeHtml(title)}</p><p><a href="${escapeHtml(url)}">Смотреть запись</a></p>${passcode ? `<p>Пароль: ${escapeHtml(passcode)}</p>` : ""}<p>Запись доступна до ${escapeHtml(deadline)}.</p>`),
    text: `Запись практики: ${title}\n\nСмотреть запись: ${url}\n${passcode ? `Пароль: ${passcode}\n` : ""}\nЗапись доступна до ${deadline}.`
  };
}
