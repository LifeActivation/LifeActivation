-- Apply this migration to installations that already ran 001_initial.sql.
do $$ begin
  create type public.reminder_delivery_source as enum ('qstash', 'sweep', 'immediate');
exception
  when duplicate_object then null;
end $$;

alter table public.registrations
  add column if not exists qstash_message_id text,
  add column if not exists qstash_scheduling_at timestamptz,
  add column if not exists reminder_scheduled_at timestamptz,
  add column if not exists reminder_scheduled_for timestamptz,
  add column if not exists reminder_delivery_source public.reminder_delivery_source;

create index if not exists registrations_unsent_reminders_idx
  on public.registrations(event_id)
  where status = 'paid' and reminder_sent_at is null;

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

revoke all on function public.claim_reminder_schedule(uuid) from public, anon, authenticated;
grant execute on function public.claim_reminder_schedule(uuid) to service_role;
