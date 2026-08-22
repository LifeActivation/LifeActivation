create type public.event_status as enum ('draft', 'published', 'finished');
create type public.registration_status as enum ('paid', 'refunded', 'cancelled');
create type public.reminder_delivery_source as enum ('qstash', 'sweep', 'immediate');

create table public.events (
  id text primary key,
  title text not null,
  description text,
  starts_at timestamptz not null,
  duration_minutes integer not null default 90 check (duration_minutes > 0),
  zoom_url text not null,
  zoom_passcode text,
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id text references public.events(id) on update cascade on delete set null,
  email text not null,
  name text,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_paid integer not null check (amount_paid >= 0),
  currency text not null,
  paid_at timestamptz not null,
  confirmation_sent_at timestamptz,
  reminder_sent_at timestamptz,
  confirmation_sending_at timestamptz,
  reminder_sending_at timestamptz,
  qstash_message_id text,
  qstash_scheduling_at timestamptz,
  reminder_scheduled_at timestamptz,
  reminder_scheduled_for timestamptz,
  reminder_delivery_source public.reminder_delivery_source,
  status public.registration_status not null default 'paid'
);

create index events_starts_at_idx on public.events(starts_at);
create index registrations_event_id_idx on public.registrations(event_id);
create index registrations_payment_intent_idx on public.registrations(stripe_payment_intent_id);
create index registrations_unsent_reminders_idx
  on public.registrations(event_id)
  where status = 'paid' and reminder_sent_at is null;

alter table public.events enable row level security;
alter table public.registrations enable row level security;
-- No policies: browser clients cannot access either table. The server uses service_role.

create or replace function public.claim_confirmation(p_registration_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  update registrations set confirmation_sending_at = now()
  where id = p_registration_id
    and status = 'paid'
    and event_id is not null
    and confirmation_sent_at is null
    and (confirmation_sending_at is null or confirmation_sending_at < now() - interval '10 minutes');
  get diagnostics affected = row_count;
  return affected = 1;
end $$;

create or replace function public.claim_reminder(p_registration_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  update registrations set reminder_sending_at = now()
  where id = p_registration_id
    and status = 'paid'
    and reminder_sent_at is null
    and (reminder_sending_at is null or reminder_sending_at < now() - interval '10 minutes');
  get diagnostics affected = row_count;
  return affected = 1;
end $$;

create or replace function public.claim_reminder_schedule(p_registration_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  update registrations set qstash_scheduling_at = now()
  where id = p_registration_id
    and status = 'paid'
    and event_id is not null
    and reminder_sent_at is null
    and qstash_message_id is null
    and (qstash_scheduling_at is null or qstash_scheduling_at < now() - interval '10 minutes');
  get diagnostics affected = row_count;
  return affected = 1;
end $$;

revoke all on function public.claim_confirmation(uuid) from public, anon, authenticated;
revoke all on function public.claim_reminder(uuid) from public, anon, authenticated;
revoke all on function public.claim_reminder_schedule(uuid) from public, anon, authenticated;
grant execute on function public.claim_confirmation(uuid) to service_role;
grant execute on function public.claim_reminder(uuid) to service_role;
grant execute on function public.claim_reminder_schedule(uuid) to service_role;
