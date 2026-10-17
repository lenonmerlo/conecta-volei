alter table public.game_registrations
add column if not exists slot_entered_at timestamp with time zone;

update public.game_registrations
set slot_entered_at = coalesce(registered_at, now())
where slot_entered_at is null;

-- Corrige convidados que já haviam sido migrados antes desta coluna existir.
-- Eles ficam depois dos membros que aguardavam na quinta/sexta e antes de
-- novos jogadores que entrarem ao longo do sábado.
with ranked_guest_waitlist as (
  select
    gr.id,
    (
      (g.date - 1)::timestamp
      at time zone 'America/Sao_Paulo'
    ) + (
      row_number() over (
        partition by gr.game_id
        order by gr.registered_at, gr.id
      ) * interval '1 millisecond'
    ) as migrated_at
  from public.game_registrations gr
  join public.games g
    on g.id = gr.game_id
  left join public.players p
    on p.id = gr.player_id
  where g.day = 'sunday'
    and gr.slot = 'waitlist'
    and gr.left_at is null
    and (
      gr.player_id is null
      or p.type = 'guest'
    )
)

update public.game_registrations gr
set slot_entered_at = ranked_guest_waitlist.migrated_at
from ranked_guest_waitlist
where gr.id = ranked_guest_waitlist.id;

alter table public.game_registrations
alter column slot_entered_at set default now();

alter table public.game_registrations
alter column slot_entered_at set not null;

create index if not exists game_registrations_active_slot_order_idx
on public.game_registrations (
  game_id,
  slot,
  slot_entered_at,
  id
)
where left_at is null;

comment on column public.game_registrations.slot_entered_at is
'Momento em que a inscrição entrou no slot atual; usado para ordenar as listas.';