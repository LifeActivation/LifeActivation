-- November 6, 2026, 19:00 Bellevue (PST, UTC-8).
-- Separate event: preserve all previous practices and registrations.
insert into public.events (id, title, description, starts_at, duration_minutes, zoom_url, zoom_passcode, status)
values (
  'healing-evening-2026-11-06',
  'Healing & Energy Session — Evening',
  '14040 NE 8th St, Suite 300, Bellevue, WA 98007, United States',
  '2026-11-07T03:00:00Z',
  90,
  '',
  null,
  'published'
)
on conflict (id) do nothing;
