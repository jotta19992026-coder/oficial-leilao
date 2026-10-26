-- Leilão Oficial — migração 002: dados dos clientes no perfil + funções do painel admin.
-- Execute no SQL Editor do Supabase DEPOIS do schema.sql. Pode ser executado mais de uma vez.

-- ------------------------------------------------------------
-- 1) Dados do cliente coletados no cadastro (usados também no contrato)
-- ------------------------------------------------------------
alter table public.profiles add column if not exists cpf text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists address text;

-- O cadastro envia nome, CPF, telefone e endereço em user_metadata; o gatilho copia para profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, cpf, phone, address)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data->>'address', '')), '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public;

-- ------------------------------------------------------------
-- 2) Sem confirmação de e-mail: confirma as contas que ficaram pendentes
--    (desligue também "Confirm email" em Authentication > Sign In / Providers > Email).
-- ------------------------------------------------------------
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

-- ------------------------------------------------------------
-- 3) Painel: todos os clientes com resumo de lances (somente admin)
-- ------------------------------------------------------------
create or replace function public.admin_clients()
returns table (
  id uuid,
  name text,
  email text,
  cpf text,
  phone text,
  address text,
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
    p.id, p.name, p.email, p.cpf, p.phone, p.address, p.role, p.created_at,
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

-- Lotes em que um cliente deu lance (para gerar o contrato de arrematação).
create or replace function public.admin_client_lots(p_user_id uuid)
returns table (
  lot_id bigint,
  n integer,
  title text,
  my_max numeric,
  current_price numeric,
  ends_at timestamptz,
  auction_label text,
  is_leading boolean
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
    l.id, l.n, l.title,
    max(b.amount) as my_max,
    l.current_price, l.ends_at, l.auction_label,
    (max(b.amount) = l.current_price) as is_leading
  from public.bids b
  join public.lots l on l.id = b.lot_id
  where b.user_id = p_user_id and b.status = 'active'
  group by l.id
  order by max(b.created_at) desc;
end;
$$;
revoke all on function public.admin_client_lots(uuid) from public;
grant execute on function public.admin_client_lots(uuid) to authenticated;

notify pgrst, 'reload schema';
