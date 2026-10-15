-- Push notifications for Conecta Vôlei.
--
-- Required deployment secrets:
--   Supabase Edge Functions:
--     FIREBASE_SERVICE_ACCOUNT_BASE64
--     PUSH_INTERNAL_SECRET
--
--   Supabase Vault:
--     push_internal_secret
--
-- Secrets are intentionally not stored in this migration.

create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null
    references public.players(id)
    on delete cascade,
  token text not null unique,
  enabled boolean not null default true,
  notify_list_open boolean not null default true,
  notify_announcements boolean not null default true,
  notify_promotions boolean not null default true,
  notify_reminders boolean not null default true,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_subscriptions_player_id_idx
  on public.push_subscriptions using btree (player_id);

alter table public.push_subscriptions enable row level security;

revoke all
on table public.push_subscriptions
from public, anon, authenticated;

grant select, update
on table public.push_subscriptions
to service_role;


create or replace function public.save_push_subscription(
  p_player_id uuid,
  p_token text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  saved_id uuid;
begin
  if p_player_id is null or nullif(trim(p_token), '') is null then
    raise exception 'Jogador e token são obrigatórios.';
  end if;

  if not exists (
    select 1
    from public.players
    where id = p_player_id
      and status not in ('pending', 'inactive', 'blocked')
  ) then
    raise exception 'Jogador não autorizado.';
  end if;

  insert into public.push_subscriptions (
    player_id,
    token,
    enabled,
    user_agent,
    updated_at,
    last_seen_at
  )
  values (
    p_player_id,
    trim(p_token),
    true,
    p_user_agent,
    now(),
    now()
  )
  on conflict (token) do update
  set
    player_id = excluded.player_id,
    enabled = true,
    user_agent = excluded.user_agent,
    updated_at = now(),
    last_seen_at = now()
  returning id into saved_id;

  return saved_id;
end;
$function$;

revoke all
on function public.save_push_subscription(uuid, text, text)
from public;

grant execute
on function public.save_push_subscription(uuid, text, text)
to anon, authenticated;


create or replace function public.disable_push_subscription(
  p_player_id uuid,
  p_token text
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
begin
  update public.push_subscriptions
  set
    enabled = false,
    updated_at = now()
  where player_id = p_player_id
    and token = p_token;

  return found;
end;
$function$;

revoke all
on function public.disable_push_subscription(uuid, text)
from public;

grant execute
on function public.disable_push_subscription(uuid, text)
to anon, authenticated;


create or replace function public.dispatch_push_notification(
  p_title text,
  p_body text,
  p_url text default '/',
  p_type text default 'test',
  p_player_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare
  internal_secret text;
  request_id bigint;
begin
  if p_type not in (
    'test',
    'list_open',
    'announcement',
    'promotion',
    'reminder'
  ) then
    raise exception 'Tipo de notificação inválido: %', p_type;
  end if;

  select decrypted_secret
  into internal_secret
  from vault.decrypted_secrets
  where name = 'push_internal_secret'
  limit 1;

  if internal_secret is null then
    raise exception 'Segredo push_internal_secret não encontrado.';
  end if;

  select net.http_post(
    url :=
      'https://ovdsdzcgovzdttcupsmg.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', internal_secret
    ),
    body := jsonb_build_object(
      'title', p_title,
      'body', p_body,
      'url', p_url,
      'type', p_type,
      'playerId', p_player_id
    ),
    timeout_milliseconds := 10000
  )
  into request_id;

  return request_id;
end;
$function$;

revoke all
on function public.dispatch_push_notification(
  text,
  text,
  text,
  text,
  uuid
)
from public, anon, authenticated;

grant execute
on function public.dispatch_push_notification(
  text,
  text,
  text,
  text,
  uuid
)
to service_role;


create or replace function public.notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  notification_title text;
begin
  if new.active is not true then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.active is true then
    return new;
  end if;

  notification_title :=
    case
      when new.urgent then 'Aviso urgente 🚨'
      else 'Novo aviso 📢'
    end;

  begin
    perform public.dispatch_push_notification(
      notification_title,
      left(new.title || ': ' || new.body, 220),
      '/',
      'announcement',
      null
    );
  exception
    when others then
      raise warning
        'Não foi possível enviar a notificação do aviso %: %',
        new.id,
        sqlerrm;
  end;

  return new;
end;
$function$;

revoke all
on function public.notify_announcement_published()
from public, anon, authenticated;

drop trigger if exists announcements_send_push
on public.announcements;

create trigger announcements_send_push
after insert or update of active
on public.announcements
for each row
execute function public.notify_announcement_published();


create or replace function public.notify_registration_promoted()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  recipient_player_id uuid;
  promoted_name text;
  notification_body text;
begin
  if new.slot <> 'main'
    or old.slot = 'main'
    or old.slot not in ('waitlist', 'guests')
  then
    return new;
  end if;

  if new.player_id is not null then
    recipient_player_id := new.player_id;

    select name
    into promoted_name
    from public.players
    where id = new.player_id;

    notification_body :=
      'Você foi promovido para a lista principal!';
  else
    recipient_player_id := new.invited_by;

    if recipient_player_id is null and new.guest_id is not null then
      select invited_by
      into recipient_player_id
      from public.guests
      where id = new.guest_id;
    end if;

    select coalesce(g.name, new.guest_name, 'Seu convidado')
    into promoted_name
    from public.guests g
    where g.id = new.guest_id;

    notification_body :=
      coalesce(promoted_name, 'Seu convidado')
      || ' foi promovido para a lista principal!';
  end if;

  if recipient_player_id is null then
    return new;
  end if;

  begin
    perform public.dispatch_push_notification(
      'Vaga confirmada ✅',
      notification_body,
      '/game/' || new.game_id,
      'promotion',
      recipient_player_id
    );
  exception
    when others then
      raise warning
        'Não foi possível notificar a promoção da inscrição %: %',
        new.id,
        sqlerrm;
  end;

  return new;
end;
$function$;

revoke all
on function public.notify_registration_promoted()
from public, anon, authenticated;

drop trigger if exists registrations_send_promotion_push
on public.game_registrations;

create trigger registrations_send_promotion_push
after update of slot
on public.game_registrations
for each row
when (
  new.slot = 'main'
  and old.slot is distinct from new.slot
)
execute function public.notify_registration_promoted();


create or replace function public.notify_sunday_list_open()
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare
  local_today date :=
    (now() at time zone 'America/Sao_Paulo')::date;
begin
  if extract(isodow from local_today) <> 4 then
    return null;
  end if;

  if not exists (
    select 1
    from public.games
    where day = 'sunday'
      and status = 'active'
      and date = local_today + 3
  ) then
    return null;
  end if;

  return public.dispatch_push_notification(
    'Lista aberta 🏐',
    'A lista de domingo está aberta! Garanta sua vaga.',
    '/',
    'list_open',
    null
  );
end;
$function$;

revoke all
on function public.notify_sunday_list_open()
from public, anon, authenticated;

grant execute
on function public.notify_sunday_list_open()
to service_role;


create or replace function public.notify_sunday_exit_deadline()
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare
  local_today date :=
    (now() at time zone 'America/Sao_Paulo')::date;
  next_game_id text;
begin
  if extract(isodow from local_today) <> 6 then
    return null;
  end if;

  select id
  into next_game_id
  from public.games
  where day = 'sunday'
    and status = 'active'
    and date = local_today + 1
  order by date
  limit 1;

  if next_game_id is null then
    return null;
  end if;

  return public.dispatch_push_notification(
    'Lembrete da lista ⏰',
    'Se não puder mais jogar, retire seu nome da lista até hoje às 21h.',
    '/game/' || next_game_id,
    'reminder',
    null
  );
end;
$function$;

revoke all
on function public.notify_sunday_exit_deadline()
from public, anon, authenticated;

grant execute
on function public.notify_sunday_exit_deadline()
to service_role;


do $migration$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'notify-sunday-list-open'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'notify-sunday-list-open',
    '0 22 * * 4',
    $cron$
      select public.notify_sunday_list_open();
    $cron$
  );

  existing_job_id := null;

  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'notify-sunday-exit-deadline'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'notify-sunday-exit-deadline',
    '0 21 * * 6',
    $cron$
      select public.notify_sunday_exit_deadline();
    $cron$
  );
end;
$migration$;