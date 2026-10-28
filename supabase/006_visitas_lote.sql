-- Leilão Oficial — migração 006: contagem REAL de visualizações do lote (página do lote).
-- Execute no SQL Editor do Supabase DEPOIS da 003. Pode ser executado mais de uma vez.

-- ------------------------------------------------------------
-- Visualizações do lote: total registrado em page_views (migração 003) e
-- quantos visitantes ÚNICOS abriram o lote nos últimos 5 minutos ("vendo agora").
-- Só devolve números agregados; a tabela em si continua visível só ao admin.
-- ------------------------------------------------------------
create or replace function public.lot_view_count(p_lot_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'views',  (select count(*) from public.page_views where lot_id = p_lot_id),
    'online', (select count(distinct coalesce(visitor, user_id::text))
                 from public.page_views
                where lot_id = p_lot_id
                  and created_at > now() - interval '5 minutes')
  ) into result;
  return result;
end;
$$;
revoke all on function public.lot_view_count(bigint) from public;
grant execute on function public.lot_view_count(bigint) to anon, authenticated;

notify pgrst, 'reload schema';
