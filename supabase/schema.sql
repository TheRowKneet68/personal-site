-- =====================================================================
-- TheRowKneet portfolio — Supabase schema
-- Content rows are stored as jsonb payloads keyed by id (admin-editable,
-- flexible for new fields). Dynamic tables are column-typed for queries.
-- =====================================================================

-- ---------- Content tables (admin reads/writes via service role) ------
create table if not exists profile (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- For databases created before this column existed (re-runnable).
alter table profile add column if not exists created_at timestamptz not null default now();

create table if not exists projects (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists achievements (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists skills (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists experience (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Dynamic tables --------------------------------------------
create table if not exists contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text not null default '',
  message    text not null,
  ip         text,
  created_at timestamptz not null default now()
);

create table if not exists visitors (
  id         uuid primary key default gen_random_uuid(),
  country    text,
  city       text,
  device     text,
  browser    text,
  ip         text,
  visited_at timestamptz not null default now()
);

create table if not exists newsletter (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------------------------------------------------
create index if not exists contact_messages_created_at_idx on contact_messages (created_at desc);
create index if not exists visitors_visited_at_idx on visitors (visited_at desc);
create index if not exists newsletter_created_at_idx on newsletter (created_at desc);

-- ---------- updated_at trigger -----------------------------------------
-- Admin upserts replace the whole row; this keeps updated_at honest.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['profile','projects','achievements','skills','experience']
  loop
    execute format(
      'create or replace trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ---------- Row Level Security ----------------------------------------
-- Anonymous visitors may read public content and submit forms.
-- The service role bypasses RLS, so writes from the API are unaffected.

alter table profile enable row level security;
alter table projects enable row level security;
alter table achievements enable row level security;
alter table skills enable row level security;
alter table experience enable row level security;
alter table contact_messages enable row level security;
alter table visitors enable row level security;
alter table newsletter enable row level security;

drop policy if exists "public read content" on profile;
create policy "public read content" on profile for select to anon using (true);
drop policy if exists "public read projects" on projects;
create policy "public read projects" on projects for select to anon using (true);
drop policy if exists "public read achievements" on achievements;
create policy "public read achievements" on achievements for select to anon using (true);
drop policy if exists "public read skills" on skills;
create policy "public read skills" on skills for select to anon using (true);
drop policy if exists "public read experience" on experience;
create policy "public read experience" on experience for select to anon using (true);

-- Anonymous inserts are the only anon writes allowed. The API validates first;
-- these checks are defense in depth in case the anon key is ever leaked, and they
-- reject garbage that would otherwise fill the tables.
drop policy if exists "public submit contact" on contact_messages;
create policy "public submit contact" on contact_messages for insert to anon
  with check (
    char_length(name) between 2 and 80
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
    and char_length(email) <= 120
    and char_length(subject) <= 200
    and char_length(message) between 10 and 4000
  );
drop policy if exists "public submit visitor" on visitors;
create policy "public submit visitor" on visitors for insert to anon with check (true);
drop policy if exists "public subscribe" on newsletter;
create policy "public subscribe" on newsletter for insert to anon
  with check (
    email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
    and char_length(email) <= 120
  );

-- Storage: the "images" bucket is public-read (the site loads those URLs in <img>).
-- Writes go through the service-role API only; the anon key cannot write to it.

-- Use the SQL editor in the Supabase dashboard to run this file.
-- Then: `npm run server:seed` to load data.json into the tables.
