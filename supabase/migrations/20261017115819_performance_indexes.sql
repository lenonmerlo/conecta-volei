create index if not exists games_day_date_time_idx
on public.games (day, date, time);

create index if not exists game_registrations_active_main_game_idx
on public.game_registrations (game_id)
where left_at is null and slot = 'main';

create index if not exists game_teams_game_team_name_idx
on public.game_teams (game_id, team_name);

create index if not exists announcements_active_created_at_idx
on public.announcements (created_at desc)
where active = true;