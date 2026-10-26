-- Leilão Oficial — migração 003: visualizações do site (contador automático) para o painel admin.
-- Execute no SQL Editor do Supabase DEPOIS da 002. Pode ser executado mais de uma vez.

-- ------------------------------------------------------------
-- 1) Registro das visualizações de página
--    Ninguém lê/escreve a tabela direto: o site grava via track_view() e o admin lê via admin_views().
-- ------------------------------------------------------------
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  path text not null,
  lot_id bigint references public.lots(id) on delete set null,
  visitor text,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists page_views_created_idx on public.page_views (created_at desc);
create index if not exists page_views_lot_idx on public.page_views (lot_id, created_at desc);
alter table public.page_views enable row level security;

drop policy if exists page_views_admin_select on public.page_views;
create policy page_views_admin_select on public.page_views
  for select using (public.is_admin());

-- Chamado por todas as páginas públicas (visitante anônimo ou logado).
create or replace function public.track_view(p_path text, p_lot_id bigint default null, p_visitor text default null)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  insert into public.page_views (path, lot_id, visitor, user_id)
  values (
    left(coalesce(nullif(btrim(p_path), ''), '/'), 200),
    (select l.id from public.lots l where l.id = p_lot_id),
    left(nullif(btrim(p_visitor), ''), 64),
    auth.uid()
  );
end;
$$;
revoke all on function public.track_view(text, bigint, text) from public;
grant execute on function public.track_view(text, bigint, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 2) Resumo para o painel (somente admin). Dias no fuso de Brasília.
-- ------------------------------------------------------------
create or replace function public.admin_views(p_days integer default 14)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  tz constant text := 'America/Sao_Paulo';
  today date := (now() at time zone tz)::date;
  days integer := least(greatest(coalesce(p_days, 14), 1), 90);
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'today',          (select count(*) from public.page_views where (created_at at time zone tz)::date = today),
    'today_visitors', (select count(distinct coalesce(visitor, user_id::text)) from public.page_views where (created_at at time zone tz)::date = today),
    'last7',          (select count(*) from public.page_views where (created_at at time zone tz)::date > today - 7),
    'last30',         (select count(*) from public.page_views where (created_at at time zone tz)::date > today - 30),
    'total',          (select count(*) from public.page_views),
    'online',         (select count(distinct coalesce(visitor, user_id::text)) from public.page_views where created_at > now() - interval '5 minutes'),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day::date, 'views', coalesce(v.views, 0), 'visitors', coalesce(v.visitors, 0)) order by d.day), '[]'::jsonb)
      from generate_series(today - (days - 1), today, interval '1 day') as d(day)
      left join (
        select (created_at at time zone tz)::date as day, count(*) as views, count(distinct coalesce(visitor, user_id::text)) as visitors
        from public.page_views
        where (created_at at time zone tz)::date > today - days
        group by 1
      ) v on v.day = d.day::date
    ),
    'top_lots', (
      select coalesce(jsonb_agg(t order by t.views desc), '[]'::jsonb)
      from (
        select l.id as lot_id, l.n, l.title, count(*) as views, max(pv.created_at) as last_view
        from public.page_views pv
        join public.lots l on l.id = pv.lot_id
        where (pv.created_at at time zone tz)::date > today - days
        group by l.id
        order by count(*) desc
        limit 10
      ) t
    ),
    'top_pages', (
      select coalesce(jsonb_agg(t order by t.views desc), '[]'::jsonb)
      from (
        select path, count(*) as views
        from public.page_views
        where (created_at at time zone tz)::date > today - days
        group by path
        order by count(*) desc
        limit 8
      ) t
    )
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_views(integer) from public;
grant execute on function public.admin_views(integer) to authenticated;

notify pgrst, 'reload schema';
