-- VISHALXFIT — Postgres schema (Supabase).
--
-- Same "one JSON blob per logical collection" shape the old SQLite `kv`
-- table used (see git history) — deliberately not fully normalized, for the
-- same reason: a single-user app with modest daily volume gets nothing from
-- normalizing settings/workouts/dietLog/etc. into relational tables except
-- more migration surface. "Proper separation" comes from the service layer
-- (server/services/), not the table layout.
--
-- Every table is scoped by user_id so that swapping the fixed OWNER_USER_ID
-- for real Supabase Auth later (see README "Followers") is a middleware
-- change, not a schema change.
--
-- Run this whole file once per Supabase project: SQL Editor → paste → Run.
-- Nothing here executes automatically.

create table if not exists app_kv (
  user_id    uuid not null,
  key        text not null,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table if not exists app_photos (
  id           uuid primary key,
  user_id      uuid not null,
  date         text not null,
  pose         text not null default '',
  note         text not null default '',
  w            integer,
  h            integer,
  type         text not null default 'image/jpeg',
  -- Paths into the `progress-photos` Storage bucket, not the bytes
  -- themselves — e.g. "<user_id>/<id>/display.jpg".
  display_path text not null,
  thumb_path   text,
  created_at   timestamptz not null default now()
);
create index if not exists app_photos_user_id_idx on app_photos (user_id);

-- Rev-tracking: the frontend polls GET /api/meta/rev every 15s to detect a
-- change made from another device, without pulling a full refresh every
-- time. A trigger bumps this on every write to app_kv/app_photos so it
-- stays correct across serverless instances (an in-memory counter, the old
-- approach, doesn't survive a cold start or a second Vercel instance).
create table if not exists app_rev (
  user_id uuid primary key,
  rev     bigint not null default 0
);

create or replace function bump_rev(p_user_id uuid) returns bigint
language sql as $$
  insert into app_rev (user_id, rev) values (p_user_id, 1)
  on conflict (user_id) do update set rev = app_rev.rev + 1
  returning rev;
$$;

create or replace function trg_bump_rev() returns trigger
language plpgsql as $$
begin
  perform bump_rev(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists app_kv_rev on app_kv;
create trigger app_kv_rev after insert or update or delete on app_kv
  for each row execute function trg_bump_rev();

drop trigger if exists app_photos_rev on app_photos;
create trigger app_photos_rev after insert or update or delete on app_photos
  for each row execute function trg_bump_rev();

-- RLS: the server always connects with the service_role key, which bypasses
-- RLS entirely — these policies are defense-in-depth for the day a client
-- talks to Supabase directly with a real user JWT (see README "Followers").
-- Harmless no-ops until then.
alter table app_kv enable row level security;
alter table app_photos enable row level security;
alter table app_rev enable row level security;

drop policy if exists "own kv" on app_kv;
create policy "own kv" on app_kv for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own photos" on app_photos;
create policy "own photos" on app_photos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rev" on app_rev;
create policy "own rev" on app_rev for select
  using (auth.uid() = user_id);
