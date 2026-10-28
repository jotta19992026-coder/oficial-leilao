-- Leilão Oficial — migração 005: foto do documento no cadastro (opcional).
-- Execute no SQL Editor do Supabase. Pode ser executado mais de uma vez (idempotente).
-- O upload é feito pelo próprio navegador do usuário em: bucket PRIVADO user-docs
-- (a foto do documento só pode ser vista pelo dono da conta e pelo admin).

-- ------------------------------------------------------------
-- 1) Perfil guarda o caminho do documento no bucket
-- ------------------------------------------------------------
alter table public.profiles add column if not exists doc_url text;

-- O usuário grava SÓ o caminho do próprio documento — sem poder tocar em
-- name, cpf, phone, address, role etc. (não precisa de policy de update no perfil).
create or replace function public.user_set_doc_url(p_doc_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Faça login antes de enviar o documento.' using errcode = '42501';
  end if;
  update public.profiles
    set doc_url = nullif(left(btrim(p_doc_url), 500), ''), updated_at = now()
  where id = auth.uid();
end;
$$;
revoke all on function public.user_set_doc_url(text) from public;
grant execute on function public.user_set_doc_url(text) to authenticated;

-- ------------------------------------------------------------
-- 2) Bucket PRIVADO user-docs: imagens de até 10 MB (foto do RG/CNH)
--    O caminho é <id-do-usuário>/<arquivo>; cada um só enxerga a própria pasta.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('user-docs', 'user-docs', false)
on conflict (id) do nothing;

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'user-docs';

drop policy if exists user_docs_insert on storage.objects;
create policy user_docs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'user-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists user_docs_select on storage.objects;
create policy user_docs_select on storage.objects
  for select to authenticated
  using (bucket_id = 'user-docs' and
    ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists user_docs_delete on storage.objects;
create policy user_docs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'user-docs' and
    ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ------------------------------------------------------------
-- 3) Painel: lista de clientes passa a incluir quem enviou documento
--    (a versão da migração 002 não tem a coluna nova — Postgres não permite
--    trocar o tipo de retorno com create or replace; apagar e recriar)
-- ------------------------------------------------------------
drop function if exists public.admin_clients();

create or replace function public.admin_clients()
returns table (
  id uuid,
  name text,
  email text,
  cpf text,
  phone text,
  address text,
  doc_url text,
  role public.app_role,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  bid_count bigint,
  max_bid numeric,
  last_bid_at timestamptz,
  leading_lots bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores.' using errcode = '42501';
  end if;
  return query
  select
    p.id, p.name, p.email, p.cpf, p.phone, p.address, p.doc_url, p.role, p.created_at,
    u.last_sign_in_at,
    count(b.id) as bid_count,
    max(b.amount) as max_bid,
    max(b.created_at) as last_bid_at,
    (
      select count(*) from public.lots l
      where l.current_price is not null
        and exists (
          select 1 from public.bids b2
          where b2.lot_id = l.id and b2.user_id = p.id and b2.status = 'active' and b2.amount = l.current_price
        )
    ) as leading_lots
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join public.bids b on b.user_id = p.id and b.status = 'active'
  group by p.id, u.last_sign_in_at
  order by p.created_at desc;
end;
$$;
revoke all on function public.admin_clients() from public;
grant execute on function public.admin_clients() to authenticated;

notify pgrst, 'reload schema';
