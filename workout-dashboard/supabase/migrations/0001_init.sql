-- Reena's Workout Plan — Phase 1 schema
-- Single-user app, but modeled with user_id + RLS so it stays safe if Supabase
-- auth ever has more than one row in auth.users (e.g. a second test account).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  timezone text not null default 'America/New_York',
  diet_constraints text[] not null default array[
    'Gluten-free',
    'Minimal dairy',
    'Minimal chicken',
    'Fish-forward'
  ],
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- macro_targets: versioned targets (protein/carb/fat + step goal).
-- The "current" target for a date is the row with the latest effective_date
-- that is <= that date.
-- ---------------------------------------------------------------------------
create table if not exists macro_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  effective_date date not null default current_date,
  protein_g numeric not null,
  carb_g numeric not null,
  fat_g numeric not null,
  step_goal integer not null default 12000,
  created_at timestamptz not null default now(),
  unique (user_id, effective_date)
);

-- ---------------------------------------------------------------------------
-- workout_templates: the standing weekly split. day_of_week 0=Sunday..6=Saturday.
-- ---------------------------------------------------------------------------
create table if not exists workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  workout_type text not null, -- e.g. 'Push', 'Pull', 'Legs', 'Solidcore', 'Rest'
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, day_of_week)
);

-- ---------------------------------------------------------------------------
-- exercises: catalog for history/PR tracking
-- ---------------------------------------------------------------------------
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text, -- e.g. 'Push', 'Pull', 'Legs', 'Core'
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------------------------------------------------------------------------
-- workout_logs: one row per date's session (or rest/active-recovery marker)
-- ---------------------------------------------------------------------------
create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  workout_type text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'skipped', 'rest', 'active_recovery')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- workout_sets: individual sets logged against a workout_log
-- ---------------------------------------------------------------------------
create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references workout_logs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references exercises (id) on delete cascade,
  set_number integer not null default 1,
  reps integer,
  weight numeric,
  superset_group text, -- shared label groups sets logged as a superset
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- daily_metrics: steps, weight, subjective energy, freeform "today" note
-- ---------------------------------------------------------------------------
create table if not exists daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  steps integer,
  weight numeric,
  energy_level smallint check (energy_level between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- macro_logs: daily-total macro logging (mirrors Cal AI, manual in Phase 1)
-- ---------------------------------------------------------------------------
create table if not exists macro_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  protein_g numeric not null default 0,
  carb_g numeric not null default 0,
  fat_g numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- recovery_data: manual in Phase 1, source-tagged so Oura/Garmin (Phase 2/3)
-- can write into the same table later without a migration.
-- ---------------------------------------------------------------------------
create table if not exists recovery_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  source text not null default 'manual' check (source in ('manual', 'oura', 'garmin')),
  sleep_quality smallint check (sleep_quality between 1 and 5),
  sleep_score integer,
  hrv numeric,
  resting_hr integer,
  temperature_deviation numeric,
  readiness_score integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date, source)
);

-- ---------------------------------------------------------------------------
-- integration_tokens: Phase 2/3 placeholder (Oura / Garmin OAuth). Not
-- written to by any Phase 1 code path. Tokens must be encrypted at rest
-- before Phase 2 lands — see README "Security notes before Phase 2/3".
-- ---------------------------------------------------------------------------
create table if not exists integration_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service text not null check (service in ('oura', 'garmin')),
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, service)
);

-- ---------------------------------------------------------------------------
-- Row Level Security: every table is scoped to auth.uid() = user_id (or, for
-- profiles, auth.uid() = id). Single-user today, but this is what makes it
-- safe rather than assumed-safe.
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table macro_targets enable row level security;
alter table workout_templates enable row level security;
alter table exercises enable row level security;
alter table workout_logs enable row level security;
alter table workout_sets enable row level security;
alter table daily_metrics enable row level security;
alter table macro_logs enable row level security;
alter table recovery_data enable row level security;
alter table integration_tokens enable row level security;

create policy "profiles_self" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "macro_targets_owner" on macro_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workout_templates_owner" on workout_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "exercises_owner" on exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workout_logs_owner" on workout_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workout_sets_owner" on workout_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "daily_metrics_owner" on daily_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "macro_logs_owner" on macro_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recovery_data_owner" on recovery_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "integration_tokens_owner" on integration_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------------------------------------------------------------------------
-- keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workout_logs_set_updated_at before update on workout_logs
  for each row execute procedure set_updated_at();
create trigger daily_metrics_set_updated_at before update on daily_metrics
  for each row execute procedure set_updated_at();
create trigger macro_logs_set_updated_at before update on macro_logs
  for each row execute procedure set_updated_at();
create trigger recovery_data_set_updated_at before update on recovery_data
  for each row execute procedure set_updated_at();
