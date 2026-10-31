alter table public.games
  add column if not exists statistics_published_at timestamptz,
  add column if not exists statistics_published_by uuid references public.players(id) on delete set null;

create table if not exists public.game_player_stats (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete cascade,
  attack_points integer not null default 0 check (attack_points >= 0),
  aces integer not null default 0 check (aces >= 0),
  block_points integer not null default 0 check (block_points >= 0),
  defenses integer not null default 0 check (defenses >= 0),
  assists integer not null default 0 check (assists >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_player_stats_participant_check check (
    (player_id is not null and guest_id is null)
    or (player_id is null and guest_id is not null)
  )
);

alter table public.game_player_stats enable row level security;

create table if not exists public.match_scoring_access (
  game_id text primary key references public.games(id) on delete cascade,
  access_code text not null check (access_code ~ '^[0-9]{4,8}$'),
  enabled boolean not null default true,
  expires_at timestamptz,
  created_by uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_scorers (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  scorer_name text not null check (char_length(trim(scorer_name)) between 2 and 40),
  scorer_role text not null check (scorer_role in ('attack_block', 'serve_defense_setting')),
  access_token uuid not null unique default gen_random_uuid(),
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.match_stat_events (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  scorer_id uuid not null references public.match_scorers(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete cascade,
  stat_field text not null check (
    stat_field in ('attack_points', 'aces', 'block_points', 'defenses', 'assists')
  ),
  delta smallint not null default 1 check (delta in (-1, 1)),
  client_event_id uuid not null unique,
  undone_at timestamptz,
  created_at timestamptz not null default now(),
  constraint match_stat_events_participant_check check (
    (player_id is not null and guest_id is null)
    or (player_id is null and guest_id is not null)
  )
);

create index if not exists match_scorers_game_active_idx
  on public.match_scorers(game_id, active, scorer_role);

create index if not exists match_stat_events_scorer_created_idx
  on public.match_stat_events(scorer_id, created_at desc);

create unique index if not exists game_player_stats_game_player_unique
  on public.game_player_stats(game_id, player_id)
  where player_id is not null;

create unique index if not exists game_player_stats_game_guest_unique
  on public.game_player_stats(game_id, guest_id)
  where guest_id is not null;

alter table public.match_scoring_access enable row level security;
alter table public.match_scorers enable row level security;
alter table public.match_stat_events enable row level security;

create or replace function public.configure_match_scoring(
  p_game_id text,
  p_access_code text,
  p_expires_at timestamptz default null,
  p_created_by uuid default null
)
returns public.match_scoring_access
language plpgsql
security definer
set search_path = public
as $$
declare
  configured public.match_scoring_access;
begin
  if p_access_code !~ '^[0-9]{4,8}$' then
    raise exception 'O código deve conter de 4 a 8 números.';
  end if;

  insert into public.match_scoring_access (
    game_id,
    access_code,
    enabled,
    expires_at,
    created_by,
    updated_at
  )
  values (
    p_game_id,
    p_access_code,
    true,
    p_expires_at,
    p_created_by,
    now()
  )
  on conflict (game_id) do update
  set access_code = excluded.access_code,
      enabled = true,
      expires_at = excluded.expires_at,
      created_by = excluded.created_by,
      updated_at = now()
  returning * into configured;

  update public.match_scorers
  set active = false
  where game_id = p_game_id and active = true;

  return configured;
end;
$$;

create or replace function public.disable_match_scoring(p_game_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.match_scoring_access
  set enabled = false, updated_at = now()
  where game_id = p_game_id;

  update public.match_scorers
  set active = false
  where game_id = p_game_id and active = true;

  return found;
end;
$$;

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
  select * into access_row
  from public.match_scoring_access
  where game_id = p_game_id;

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

create or replace function public.touch_match_scorer(p_access_token uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.match_scorers
  set last_seen_at = now()
  where access_token = p_access_token and active = true
  returning true;
$$;

create or replace function public.leave_match_scoring(p_access_token uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.match_scorers
  set active = false, last_seen_at = now()
  where access_token = p_access_token
  returning true;
$$;

create or replace function public.record_match_stat_event(
  p_access_token uuid,
  p_player_id uuid,
  p_guest_id uuid,
  p_stat_field text,
  p_client_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  scorer public.match_scorers;
  inserted_event public.match_stat_events;
  stats public.game_player_stats;
begin
  select * into scorer
  from public.match_scorers
  where access_token = p_access_token and active = true
  for update;

  if scorer is null then
    raise exception 'Sessão de anotação expirada.';
  end if;

  if scorer.scorer_role = 'attack_block'
     and p_stat_field not in ('attack_points', 'block_points') then
    raise exception 'Categoria não permitida para este anotador.';
  end if;

  if scorer.scorer_role = 'serve_defense_setting'
     and p_stat_field not in ('aces', 'defenses', 'assists') then
    raise exception 'Categoria não permitida para este anotador.';
  end if;

  if (p_player_id is null) = (p_guest_id is null) then
    raise exception 'Participante inválido.';
  end if;

  if not exists (
    select 1
    from public.game_registrations gr
    where gr.game_id = scorer.game_id
      and gr.slot = 'main'
      and gr.left_at is null
      and (
        (p_player_id is not null and gr.player_id = p_player_id)
        or (p_guest_id is not null and gr.guest_id = p_guest_id)
      )
  ) then
    raise exception 'Participante não está na lista principal.';
  end if;

  insert into public.match_stat_events (
    game_id,
    scorer_id,
    player_id,
    guest_id,
    stat_field,
    client_event_id
  )
  values (
    scorer.game_id,
    scorer.id,
    p_player_id,
    p_guest_id,
    p_stat_field,
    p_client_event_id
  )
  on conflict (client_event_id) do nothing
  returning * into inserted_event;

  if inserted_event is null then
    return jsonb_build_object('duplicate', true);
  end if;

  if p_player_id is not null then
    insert into public.game_player_stats (
      game_id, player_id, attack_points, aces, block_points, defenses, assists, updated_at
    )
    values (
      scorer.game_id,
      p_player_id,
      case when p_stat_field = 'attack_points' then 1 else 0 end,
      case when p_stat_field = 'aces' then 1 else 0 end,
      case when p_stat_field = 'block_points' then 1 else 0 end,
      case when p_stat_field = 'defenses' then 1 else 0 end,
      case when p_stat_field = 'assists' then 1 else 0 end,
      now()
    )
    on conflict (game_id, player_id) where player_id is not null do update
    set attack_points = public.game_player_stats.attack_points + excluded.attack_points,
        aces = public.game_player_stats.aces + excluded.aces,
        block_points = public.game_player_stats.block_points + excluded.block_points,
        defenses = public.game_player_stats.defenses + excluded.defenses,
        assists = public.game_player_stats.assists + excluded.assists,
        updated_at = now()
    returning * into stats;
  else
    insert into public.game_player_stats (
      game_id, guest_id, attack_points, aces, block_points, defenses, assists, updated_at
    )
    values (
      scorer.game_id,
      p_guest_id,
      case when p_stat_field = 'attack_points' then 1 else 0 end,
      case when p_stat_field = 'aces' then 1 else 0 end,
      case when p_stat_field = 'block_points' then 1 else 0 end,
      case when p_stat_field = 'defenses' then 1 else 0 end,
      case when p_stat_field = 'assists' then 1 else 0 end,
      now()
    )
    on conflict (game_id, guest_id) where guest_id is not null do update
    set attack_points = public.game_player_stats.attack_points + excluded.attack_points,
        aces = public.game_player_stats.aces + excluded.aces,
        block_points = public.game_player_stats.block_points + excluded.block_points,
        defenses = public.game_player_stats.defenses + excluded.defenses,
        assists = public.game_player_stats.assists + excluded.assists,
        updated_at = now()
    returning * into stats;
  end if;

  update public.match_scorers
  set last_seen_at = now()
  where id = scorer.id;

  return jsonb_build_object(
    'event_id', inserted_event.id,
    'participant_id', coalesce(inserted_event.player_id, inserted_event.guest_id),
    'stat_field', inserted_event.stat_field,
    'totals', to_jsonb(stats)
  );
end;
$$;

create or replace function public.undo_last_match_stat_event(p_access_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  scorer public.match_scorers;
  event_row public.match_stat_events;
begin
  select * into scorer
  from public.match_scorers
  where access_token = p_access_token and active = true;

  if scorer is null then
    raise exception 'Sessão de anotação expirada.';
  end if;

  select * into event_row
  from public.match_stat_events
  where scorer_id = scorer.id and undone_at is null and delta = 1
  order by created_at desc
  limit 1
  for update;

  if event_row is null then
    raise exception 'Nenhuma marcação disponível para desfazer.';
  end if;

  update public.match_stat_events
  set undone_at = now()
  where id = event_row.id;

  update public.game_player_stats
  set attack_points = case when event_row.stat_field = 'attack_points' then greatest(0, attack_points - 1) else attack_points end,
      aces = case when event_row.stat_field = 'aces' then greatest(0, aces - 1) else aces end,
      block_points = case when event_row.stat_field = 'block_points' then greatest(0, block_points - 1) else block_points end,
      defenses = case when event_row.stat_field = 'defenses' then greatest(0, defenses - 1) else defenses end,
      assists = case when event_row.stat_field = 'assists' then greatest(0, assists - 1) else assists end,
      updated_at = now()
  where game_id = event_row.game_id
    and (
      (event_row.player_id is not null and player_id = event_row.player_id)
      or (event_row.guest_id is not null and guest_id = event_row.guest_id)
    );

  update public.match_scorers
  set last_seen_at = now()
  where id = scorer.id;

  return jsonb_build_object(
    'event_id', event_row.id,
    'participant_id', coalesce(event_row.player_id, event_row.guest_id),
    'stat_field', event_row.stat_field
  );
end;
$$;

grant execute on function public.configure_match_scoring(text, text, timestamptz, uuid) to anon, authenticated;
grant execute on function public.disable_match_scoring(text) to anon, authenticated;
grant execute on function public.join_match_scoring(text, text, text, text) to anon, authenticated;
grant execute on function public.touch_match_scorer(uuid) to anon, authenticated;
grant execute on function public.leave_match_scoring(uuid) to anon, authenticated;
grant execute on function public.record_match_stat_event(uuid, uuid, uuid, text, uuid) to anon, authenticated;
grant execute on function public.undo_last_match_stat_event(uuid) to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_player_stats'
      and policyname = 'game_player_stats_select_anon'
  ) then
    create policy game_player_stats_select_anon
      on public.game_player_stats for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_player_stats'
      and policyname = 'game_player_stats_insert_anon'
  ) then
    create policy game_player_stats_insert_anon
      on public.game_player_stats for insert to anon with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_player_stats'
      and policyname = 'game_player_stats_update_anon'
  ) then
    create policy game_player_stats_update_anon
      on public.game_player_stats for update to anon using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_player_stats'
  ) then
    alter publication supabase_realtime add table public.game_player_stats;
  end if;
end $$;

grant select, insert, update on public.game_player_stats to anon, authenticated;
