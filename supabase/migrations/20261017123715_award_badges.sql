alter table public.players
  add column if not exists badge_mvp boolean not null default false,
  add column if not exists badge_maestro boolean not null default false,
  add column if not exists badge_super_ace boolean not null default false;