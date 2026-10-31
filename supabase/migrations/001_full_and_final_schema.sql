-- ============================================================
-- Kahani Events Vault: FULL & FINAL DATABASE SCHEMA
-- Clean, Idempotent & Conflict-Free Script for Supabase SQL Editor
-- ============================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- ============================================================
-- 2. PROFILES TABLE (Role Management: 'admin' | 'user')
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- 3. THEME CATEGORIES TABLE (Dynamic Admin Management)
-- ============================================================
create table if not exists public.theme_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.theme_categories enable row level security;

drop policy if exists "Anyone authenticated can view categories" on public.theme_categories;
create policy "Anyone authenticated can view categories"
  on public.theme_categories for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admins can insert categories" on public.theme_categories;
create policy "Admins can insert categories"
  on public.theme_categories for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can update categories" on public.theme_categories;
create policy "Admins can update categories"
  on public.theme_categories for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can delete categories" on public.theme_categories;
create policy "Admins can delete categories"
  on public.theme_categories for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- 4. EVENT THEMES TABLE (Matching Master Spreadsheet Specs)
-- ============================================================
create table if not exists public.event_themes (
  id uuid primary key default uuid_generate_v4(),
  theme_name text not null,
  title text,
  category text not null,
  category_id uuid references public.theme_categories(id) on delete set null,
  keywords text,
  theme_link text,
  executed_ppts_link text,
  client_persona text,
  color_palette text[] default '{}',
  total_event_value text,
  ideal_venue text,
  launch_status text,
  material_download_link text,
  additional_notes text,
  thumbnail_url text,
  r2_file_key text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_event_themes_category on public.event_themes(category);
create index if not exists idx_event_themes_category_id on public.event_themes(category_id);
create index if not exists idx_event_themes_launch_status on public.event_themes(launch_status);
create index if not exists idx_event_themes_persona on public.event_themes(client_persona);

alter table public.event_themes enable row level security;

drop policy if exists "Authenticated users can view event themes" on public.event_themes;
create policy "Authenticated users can view event themes"
  on public.event_themes for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admins can insert event themes" on public.event_themes;
create policy "Admins can insert event themes"
  on public.event_themes for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can update event themes" on public.event_themes;
create policy "Admins can update event themes"
  on public.event_themes for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can delete event themes" on public.event_themes;
create policy "Admins can delete event themes"
  on public.event_themes for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- 5. ACCESS LOGS TABLE (AUDIT TRAIL)
-- ============================================================
create table if not exists public.access_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  event_type text not null default 'LOGIN',
  ip_address text,
  location text,
  user_agent text,
  timestamp timestamptz not null default now()
);

create index if not exists idx_access_logs_timestamp on public.access_logs(timestamp desc);
create index if not exists idx_access_logs_user_id on public.access_logs(user_id);
create index if not exists idx_access_logs_email on public.access_logs(email);
create index if not exists idx_access_logs_event_type on public.access_logs(event_type);

alter table public.access_logs enable row level security;

drop policy if exists "Admins can view access logs" on public.access_logs;
create policy "Admins can view access logs"
  on public.access_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Service role can insert access logs" on public.access_logs;
create policy "Service role can insert access logs"
  on public.access_logs for insert
  with check (true);

-- ============================================================
-- 6. RPC FUNCTION: log_access (CLEAN, SINGLE DEFINITION)
-- ============================================================
-- Drop any conflicting older signatures
drop function if exists public.log_access(uuid, text, text, text, text);
drop function if exists public.log_access(uuid, text, text, text, text, text);

create or replace function public.log_access(
  p_user_id uuid,
  p_email text,
  p_ip_address text,
  p_location text,
  p_user_agent text,
  p_event_type text default 'LOGIN'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.access_logs (
    user_id,
    email,
    event_type,
    ip_address,
    location,
    user_agent,
    timestamp
  ) values (
    p_user_id,
    p_email,
    upper(coalesce(p_event_type, 'LOGIN')),
    p_ip_address,
    p_location,
    p_user_agent,
    now()
  );
end;
$$;

grant execute on function public.log_access(uuid, text, text, text, text, text) to anon, authenticated, service_role;

-- ============================================================
-- 7. RPC FUNCTION: log_auth_event
-- ============================================================
drop function if exists public.log_auth_event(text, text, text, text);

create or replace function public.log_auth_event(
  p_event_type text,
  p_ip_address text default null,
  p_location text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_email text;
begin
  select email into v_user_email from auth.users where id = auth.uid();
  
  insert into public.access_logs (
    user_id,
    email,
    event_type,
    ip_address,
    location,
    user_agent,
    timestamp
  ) values (
    auth.uid(),
    v_user_email,
    upper(coalesce(p_event_type, 'LOGIN')),
    p_ip_address,
    p_location,
    p_user_agent,
    now()
  );
end;
$$;

grant execute on function public.log_auth_event(text, text, text, text) to authenticated, service_role;

-- ============================================================
-- 8. AUTOMATIC PROFILE CREATION TRIGGER
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 9. INITIAL DEFAULT CATEGORIES FROM SHEET
-- ============================================================
insert into public.theme_categories (name) values
  ('Haldi & Carnival'),
  ('Mayra & Mehendi'),
  ('Sangeet'),
  ('Wedding'),
  ('Birthday & Anniversary'),
  ('Engagement & Reception'),
  ('Cocktail party'),
  ('Divine'),
  ('Garba night')
on conflict (name) do nothing;
