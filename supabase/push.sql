-- Phone alerts (web push). Each signed-in device that turns on alerts stores its subscription here.
create table if not exists public.push_subs (
  endpoint   text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  sub        jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists push_own on public.push_subs;
create policy push_own on public.push_subs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_subs to authenticated;
revoke all on public.push_subs from anon;

-- Which reminders were already sent, so each booking alerts once.
create table if not exists public.push_sent (key text primary key, sent_at timestamptz not null default now());
alter table public.push_sent enable row level security;
revoke all on public.push_sent from anon, authenticated;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- The reminder sender (server side) reads bookings and subscriptions.
grant usage on schema public to service_role; grant select, insert, update, delete on public.docs, public.profiles, public.push_subs, public.push_sent to service_role;

-- Run the reminder sender every minute (the secret is set when scheduling; it is not stored in this file):
-- select cron.schedule('bb-reminders', '* * * * *', $$select net.http_post(url := 'https://ujbmltqtejembpwbqxqh.supabase.co/functions/v1/reminders', headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>', 'Content-Type', 'application/json'), body := '{}'::jsonb)$$);
