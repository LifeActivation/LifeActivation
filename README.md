# Type-tale: сайт и автоматические письма Stripe

- index.html — существующий сайт GitHub Pages.
- backend/ — Next.js API для Stripe, Supabase, Resend, QStash и sweep.

Кнопка сайта сейчас ведёт на Stripe Payment Link
https://buy.stripe.com/eVqfZg9fPgo33Ou7vobII03. В Payment Link требуется
metadata event_id, равная events.id в Supabase.

## Развёртывание

1. Оставьте index.html в корне репозитория для GitHub Pages.
2. В Supabase выполните миграции из backend/supabase/migrations.
3. Подтвердите домен в Resend.
4. Создайте QStash и получите token и signing keys.
5. Импортируйте репозиторий в Vercel с Root Directory backend.
6. Добавьте переменные из backend/.env.example.
7. Создайте Stripe webhook на BACKEND_URL/api/stripe/webhook.
8. Создайте sweep в cron-job.org по инструкции в backend/README.md.

NEXT_PUBLIC_SITE_URL должен указывать на GitHub Pages. BACKEND_URL должен
указывать на Vercel backend.

## Перед новым мероприятием

1. Создайте Zoom-встречу.
2. Добавьте events в Supabase; starts_at храните в UTC, статус published.
3. Создайте отдельную Stripe Payment Link и задайте правильный event_id.
4. Обновите дату, название и Payment Link в блоке МЕРОПРИЯТИЕ в index.html.
5. Сделайте тестовую оплату.

Текущая страница всё ещё содержит дату 12 августа 2026 и разные формулировки
«Полнолуния»/«НОВОЛУНИЯ»; обновите их перед следующей публикацией.
