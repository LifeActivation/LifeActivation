import { emailLayout, escapeHtml } from "@/emails/layout";
import type { ReminderMode } from "@/emails/reminder";

export const HEALING_EVENING_ID = "healing-evening-2026-11-06";

export const HEALING_MORNING_ID = "healing-morning-2026-11-06";

export function healingEveningEmail(mode?: ReminderMode, morning = false) {
  const time = morning ? "11:00 AM–12:30 PM" : "7:00–8:30 PM";
  const heading = mode === "hour" ? "Через час начинаем" : mode === "soon" ? "Скоро начинаем" : "Мы уже начинаем";
  const intro = mode
    ? `${heading}: Sound Healing & Energy Session!`
    : "Подтверждаю ваше участие в Sound Healing & Energy Session! 🌸";
  const paragraphs = [
    "Здравствуйте!",
    intro,
    ...(!mode ? ["Вас ждёт погружение в звучание кристаллических поющих чаш, глубокое расслабление и энергетическая практика, наполненная мягкостью, красотой и вниманием к себе."] : []),
    `✨ Детали нашей встречи\nДата: 6 ноября 2026 года\nВремя: ${time} по местному времени Bellevue\nАдрес: 14040 NE 8th St, Suite 300, Bellevue, WA 98007, United States`,
    "🌷 Что взять с собой\n• Коврик для йоги, чтобы комфортно расположиться во время практики.\n• Тёплые носочки и, по желанию, небольшой плед.\n• Удобную одежду, в которой приятно расслабляться.",
    ...(mode !== "started" ? ["Рекомендую прийти за 5–10 минут до начала, чтобы спокойно устроиться и настроиться на встречу."] : []),
    "Если у вас есть вопросы, вы можете связаться по номеру +1 (206) 255-6802.",
    "С теплом и до скорой встречи,\nТатьяна 🤍"
  ];
  return {
    subject: mode ? `${heading}: Sound Healing & Energy Session` : "Ваше участие в Sound Healing & Energy Session — 6 ноября",
    html: emailLayout(paragraphs.map(p => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("")),
    text: paragraphs.join("\n\n")
  };
}
