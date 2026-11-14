-- ============================================================
-- 007 — Excluir usuário pelo painel administrativo
-- Rode no SQL Editor do Supabase (uma vez). Idempotente.
--
-- admin_delete_user(p_user_id):
--   * só administradores (is_admin());
--   * não exclui a própria conta nem outra conta admin;
--   * apaga a conta em auth.users -> profiles cai em cascata;
--   * lances do usuário continuam no histórico do lote (bids.user_id vira null,
--     regra "on delete set null" do schema), para não alterar preço/contagem;
--   * registra a exclusão em audit_logs (nome/e-mail no payload).
-- O arquivo do documento (bucket user-docs) é apagado pelo painel antes da chamada.
-- ============================================================

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores.' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'Usuário não informado.' using errcode = '22023';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Você não pode excluir a sua própria conta.' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = p_user_id;
  if found and v_profile.role = 'admin' then
    raise exception 'Contas de administrador não podem ser excluídas pelo painel.' using errcode = '42501';
  end if;
  if not found and not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Usuário não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, payload)
  values (auth.uid(), 'user.deleted', 'profiles', p_user_id::text,
          jsonb_build_object('name', v_profile.name, 'email', v_profile.email));

  delete from auth.users where id = p_user_id;
  delete from public.profiles where id = p_user_id; -- caso o perfil não tenha conta em auth.users
end;
$$;
revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

notify pgrst, 'reload schema';
