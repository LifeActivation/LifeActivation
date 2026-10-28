-- November 6, 2026, 11:00 Bellevue (PST, UTC-8).
insert into public.events (id, title, description, starts_at, duration_minutes, zoom_url, zoom_passcode, status)
values ('healing-morning-2026-11-06', 'Sound Healing & Energy Session — Morning',
  '14040 NE 8th St, Suite 300, Bellevue, WA 98007, United States',
  '2026-11-06T19:00:00Z', 90, '', null, 'published')
on conflict (id) do nothing;
