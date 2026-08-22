# Backend оплаты и напоминаний

Next.js API принимает Stripe webhook, хранит регистрации в Supabase, отправляет
письма через Resend, планирует точные напоминания в QStash и имеет аварийный
sweep для cron-job.org.

## Запуск

1. Скопируйте .env.example в .env.local.
2. Выполните npm install.
3. Выполните npm run dev.

Для новой базы примените 001_initial.sql, затем 002_qstash_and_sweep.sql.
Если старая версия первой миграции уже применялась, выполните только вторую.

## Адреса

- NEXT_PUBLIC_SITE_URL — публичный GitHub Pages сайт, используется в письмах.
- BACKEND_URL — Next.js backend на Vercel без завершающего слэша.

## Stripe

Webhook: BACKEND_URL/api/stripe/webhook

События: checkout.session.completed и charge.refunded.
В metadata каждой Payment Link задайте event_id, совпадающий с events.id.

## QStash

Скопируйте token и обе signing keys из Upstash Console. После обычной оплаты
создаётся одно сообщение на BACKEND_URL/api/qstash/send-reminder с одним
registrationId. Endpoint проверяет подпись QStash.

Если до начала меньше часа, ссылка отправляется сразу. Если мероприятие уже
началось, отправляется письмо «Мы уже начинаем» и уведомление администратору.

## cron-job.org sweep

Создайте бесплатную задачу каждые 15 минут:

    POST BACKEND_URL/api/sweep/send-missed-reminders
    Authorization: Bearer SWEEP_SECRET
    Content-Type: application/json

Sweep рассматривает только мероприятия от 60 минут до начала до 15 минут после
старта. Он использует тот же атомарный database claim, поэтому не дублирует
QStash-письмо.

## Проверка

    npm test
    npm run typecheck
    npm run build
    stripe listen --forward-to localhost:3000/api/stripe/webhook

Обязательные сценарии:

1. Обычная оплата создаёт одну QStash-задачу.
2. Повторный Stripe webhook не создаёт дубль.
3. Оплата за 30 минут отправляет напоминание сразу.
4. QStash failure вызывает письмо администратору, а sweep восстанавливает доставку.
5. Refund блокирует QStash и sweep.
6. Повторный QStash или sweep вызов не отправляет второе письмо.
