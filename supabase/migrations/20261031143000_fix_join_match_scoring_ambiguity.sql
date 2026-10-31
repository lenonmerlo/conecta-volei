create or replace function public.join_match_scoring(
  p_game_id text,
  p_access_code text,
  p_scorer_name text,
  p_scorer_role text
)
returns table (
  scorer_id uuid,
  access_token uuid,
  scorer_name text,
  scorer_role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  access_row public.match_scoring_access;
  scorer_row public.match_scorers;
begin
  select msa.* into access_row
  from public.match_scoring_access as msa
  where msa.game_id = p_game_id;

  if access_row is null
     or not access_row.enabled
     or access_row.access_code <> trim(p_access_code)
     or (access_row.expires_at is not null and access_row.expires_at <= now()) then
    raise exception 'Código inválido ou marcação encerrada.';
  end if;

  if p_scorer_role not in ('attack_block', 'serve_defense_setting') then
    raise exception 'Função de anotador inválida.';
  end if;

  update public.match_scorers as ms
  set active = false
  where ms.game_id = p_game_id
    and ms.active = true
    and ms.last_seen_at < now() - interval '5 minutes';

  if exists (
    select 1
    from public.match_scorers as ms
    where ms.game_id = p_game_id
      and ms.scorer_role = p_scorer_role
      and ms.active = true
  ) then
    raise exception 'Essa função já está ocupada por outro anotador.';
  end if;

  insert into public.match_scorers (game_id, scorer_name, scorer_role)
  values (p_game_id, trim(p_scorer_name), p_scorer_role)
  returning * into scorer_row;

  return query select
    scorer_row.id,
    scorer_row.access_token,
    scorer_row.scorer_name,
    scorer_row.scorer_role;
end;
$$;

grant execute on function public.join_match_scoring(text, text, text, text)
  to anon, authenticated;

notify pgrst, 'reload schema';
