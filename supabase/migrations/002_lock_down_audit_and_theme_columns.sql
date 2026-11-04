-- Lock down audit-log writes and hide internal theme columns from signed-in members.
-- Safe to re-run. Apply in the Supabase SQL editor if this project is already provisioned.

drop policy if exists "Service role can insert access logs" on public.access_logs;
create policy "Service role can insert access logs"
  on public.access_logs for insert
  to service_role
  with check (true);

revoke insert on public.access_logs from anon, authenticated, public;

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
declare
  v_email text;
  v_event text;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  v_event := upper(coalesce(p_event_type, 'PAGE_VIEW'));
  if v_event not in ('LOGIN', 'LOGOUT', 'PAGE_VIEW') then
    raise exception 'invalid event';
  end if;

  select email into v_email from auth.users where id = auth.uid();

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
    v_email,
    v_event,
    left(coalesce(p_ip_address, ''), 64),
    left(coalesce(p_location, ''), 120),
    left(coalesce(p_user_agent, ''), 300),
    now()
  );
end;
$$;

revoke all on function public.log_access(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.log_access(uuid, text, text, text, text, text) to authenticated, service_role;

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
  v_event text;
begin
  if auth.uid() is null then
    raise exception 'forbidden';
  end if;

  v_event := upper(coalesce(p_event_type, 'LOGOUT'));
  if v_event not in ('LOGIN', 'LOGOUT', 'PAGE_VIEW') then
    raise exception 'invalid event';
  end if;

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
    v_event,
    left(coalesce(p_ip_address, ''), 64),
    left(coalesce(p_location, ''), 120),
    left(coalesce(p_user_agent, ''), 300),
    now()
  );
end;
$$;

revoke all on function public.log_auth_event(text, text, text, text) from public, anon;
grant execute on function public.log_auth_event(text, text, text, text) to authenticated, service_role;

revoke select on public.event_themes from anon, authenticated;
grant select (
  id,
  theme_name,
  title,
  category,
  category_id,
  keywords,
  theme_link,
  executed_ppts_link,
  client_persona,
  color_palette,
  total_event_value,
  ideal_venue,
  launch_status,
  material_download_link,
  thumbnail_url,
  tags,
  created_at
) on public.event_themes to authenticated;
