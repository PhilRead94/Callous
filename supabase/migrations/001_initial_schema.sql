-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Profiles (extends auth.users)
-- ─────────────────────────────────────────────
create type fitness_level as enum ('beginner', 'intermediate', 'advanced');

create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text unique,           -- null until onboarding complete
  bio           text,
  avatar_url    text,
  fitness_level fitness_level not null default 'beginner',
  total_points  int not null default 0,
  created_at    timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Users can read any profile" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────
-- Equipment
-- ─────────────────────────────────────────────
create table equipment (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  created_at timestamptz not null default now()
);

alter table equipment enable row level security;
create policy "Anyone can read equipment" on equipment for select using (true);

create table user_equipment (
  user_id      uuid not null references profiles on delete cascade,
  equipment_id uuid not null references equipment on delete cascade,
  primary key (user_id, equipment_id)
);

alter table user_equipment enable row level security;
create policy "Users can read own equipment" on user_equipment for select using (auth.uid() = user_id);
create policy "Users can manage own equipment" on user_equipment for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Activities (admin-managed)
-- ─────────────────────────────────────────────
create table activities (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  description text,
  category    text not null,
  points      int not null default 1,
  is_active   bool not null default true,
  created_at  timestamptz not null default now()
);

alter table activities enable row level security;
create policy "Anyone can read active activities" on activities for select using (is_active = true);

create table activity_equipment (
  activity_id  uuid not null references activities on delete cascade,
  equipment_id uuid not null references equipment on delete cascade,
  primary key (activity_id, equipment_id)
);

alter table activity_equipment enable row level security;
create policy "Anyone can read activity_equipment" on activity_equipment for select using (true);

-- ─────────────────────────────────────────────
-- Activity Logs
-- ─────────────────────────────────────────────
create table activity_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles on delete cascade,
  activity_id   uuid references activities on delete set null,
  custom_name   text,
  notes         text,
  photo_url     text,
  points_earned int not null default 1,
  logged_at     timestamptz not null default now(),
  constraint must_have_activity check (activity_id is not null or custom_name is not null)
);

alter table activity_logs enable row level security;
create policy "Users can read own logs" on activity_logs for select using (auth.uid() = user_id);
create policy "Users can insert own logs" on activity_logs for insert with check (auth.uid() = user_id);
create policy "Users can delete own logs" on activity_logs for delete using (auth.uid() = user_id);

-- Increment total_points when a log is inserted
create or replace function increment_points()
returns trigger language plpgsql security definer as $$
begin
  update profiles set total_points = total_points + new.points_earned where id = new.user_id;
  return new;
end;
$$;
create trigger on_activity_logged
  after insert on activity_logs
  for each row execute function increment_points();

-- ─────────────────────────────────────────────
-- Social — Follows
-- ─────────────────────────────────────────────
create table follows (
  follower_id  uuid not null references profiles on delete cascade,
  following_id uuid not null references profiles on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);

alter table follows enable row level security;
create policy "Anyone can read follows" on follows for select using (true);
create policy "Users can manage own follows" on follows for all using (auth.uid() = follower_id);

-- ─────────────────────────────────────────────
-- Training Plans
-- ─────────────────────────────────────────────
create table training_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles on delete cascade,
  week_start date not null,
  plan_data  jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table training_plans enable row level security;
create policy "Users can read own plans" on training_plans for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Levels (seed data)
-- ─────────────────────────────────────────────
create table levels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  min_points int not null,
  max_points int not null
);

insert into levels (name, min_points, max_points) values
  ('Soft',             0,   9),
  ('Getting There',    10,  24),
  ('Hardening',        25,  49),
  ('Iron Mind',        50,  99),
  ('Built Different',  100, 199),
  ('Mentality Monster',200, 2147483647);

alter table levels enable row level security;
create policy "Anyone can read levels" on levels for select using (true);

-- ─────────────────────────────────────────────
-- Subscriptions
-- ─────────────────────────────────────────────
create type subscription_status as enum ('active', 'expired', 'trial');
create type subscription_plan as enum ('monthly', 'annual');

create table subscriptions (
  user_id       uuid primary key references profiles on delete cascade,
  status        subscription_status not null default 'expired',
  plan          subscription_plan,
  expires_at    timestamptz,
  rc_customer_id text,
  updated_at    timestamptz not null default now()
);

alter table subscriptions enable row level security;
create policy "Users can read own subscription" on subscriptions for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Seed: Equipment options
-- ─────────────────────────────────────────────
insert into equipment (name) values
  ('Pull-up Bar'),
  ('Barbell & Weights'),
  ('Dumbbells'),
  ('Kettlebell'),
  ('Resistance Bands'),
  ('Sauna'),
  ('Cold Plunge / Ice Bath'),
  ('Swimming Pool'),
  ('Rowing Machine'),
  ('Assault Bike'),
  ('Jump Rope');

-- ─────────────────────────────────────────────
-- Seed: Initial activities
-- ─────────────────────────────────────────────
insert into activities (name, description, category) values
  ('Cold Shower', 'End your shower with 2+ minutes of cold water', 'Cold Exposure'),
  ('Cold Plunge', '5+ minutes in a cold plunge or ice bath', 'Cold Exposure'),
  ('Sauna Session', '20+ minutes in a sauna', 'Heat Exposure'),
  ('100 Pull-ups', 'Complete 100 pull-ups in any number of sets', 'Physical'),
  ('Mile Run', 'Run 1 mile without stopping', 'Physical'),
  ('5K Run', 'Run 5 kilometres', 'Physical'),
  ('10K Run', 'Run 10 kilometres', 'Physical'),
  ('1000 Press-ups', 'Complete 1000 press-ups across the day', 'Physical'),
  ('Fasting 24hr', 'Go 24 hours without food', 'Mental'),
  ('No Social Media Day', 'Zero social media for an entire day', 'Mental'),
  ('Wake Up 5am', 'Get up at 5am or earlier', 'Mental'),
  ('Read 30 Minutes', 'Read a non-fiction book for 30+ minutes', 'Mental'),
  ('Hard Conversation', 'Have a difficult conversation you have been avoiding', 'Mental');
