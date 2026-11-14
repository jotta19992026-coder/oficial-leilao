-- Configurações globais do site (ex.: modo demonstração com lances ilustrativos).
-- Executar no SQL Editor do Supabase (idempotente).
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.site_settings enable row level security;

-- Leitura pública: o site precisa saber se o modo ilustrativo está ativo.
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated
  using (true);

-- Escrita apenas para admin.
drop policy if exists site_settings_admin_write on public.site_settings;
create policy site_settings_admin_write on public.site_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.site_settings (key, value)
values ('demo_mode', '{"enabled": true}'::jsonb)
on conflict (key) do update set value = '{"enabled": true}'::jsonb;

create or replace function public.get_site_setting(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select value from public.site_settings where key = p_key
$$;

create or replace function public.admin_set_demo_mode(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado.';
  end if;
  insert into public.site_settings (key, value, updated_at, updated_by)
  values ('demo_mode', jsonb_build_object('enabled', p_enabled), now(), auth.uid())
  on conflict (key) do update
    set value = jsonb_build_object('enabled', p_enabled),
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

grant execute on function public.get_site_setting(text) to anon, authenticated;
grant execute on function public.admin_set_demo_mode(boolean) to authenticated;