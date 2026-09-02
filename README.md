# Type-tale: сайт и автоматические письма Stripe

- index.html — существующий сайт GitHub Pages.
- backend/ — Next.js API для Stripe, Supabase, Resend, QStash и sweep.

Кнопка сайта сейчас ведёт на Stripe Payment Link
https://buy.stripe.com/6oU7sK63D2xddp47vobII01. В Payment Link требуется
metadata event_id, равная events.id постоянного шаблона практики в Supabase.

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

## Еженедельная практика

1. Создайте постоянную Zoom-встречу.
2. Добавьте запись-шаблон events в Supabase с названием, Zoom-ссылкой и паролем.
3. Укажите ID этого шаблона в metadata.event_id постоянной Stripe Payment Link.
4. Опубликуйте backend. Он назначает новые оплаты на четверг 19:07 по Сиэтлу:
   до 19:15:59 четверга — на этот день, с 19:16 — на следующий четверг.
5. Записи отдельных недель создаются автоматически; уже оплаченные даты не меняются.
   Детали и настройка webhook описаны в backend/README.md.

Дата и название на статической странице index.html и в Stripe не меняются
автоматически вслед за backend. Обновляйте публичный анонс перед публикацией.
