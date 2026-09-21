-- One immutable recording mailing per event; no automatic retries after an
-- ambiguous provider result. Inspect Resend before manually resolving a claim.
create table public.recording_mailings (
  event_id text primary key references public.events(id),
  url text not null,
  passcode text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table public.recording_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.recording_mailings(event_id),
  email text not null,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(event_id, email)
);
alter table public.recording_mailings enable row level security;
alter table public.recording_deliveries enable row level security;

create function public.recording_recipients(p_event_id text)
returns table(email text) language sql security definer set search_path = public as $$
  select distinct lower(trim(r.email)) from registrations r
  where r.event_id = p_event_id and r.status = 'paid';
$$;
revoke all on function public.recording_recipients(text) from public, anon, authenticated;
grant execute on function public.recording_recipients(text) to service_role;
