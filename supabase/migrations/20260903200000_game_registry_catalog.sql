alter table public.games add column if not exists route text;

update public.games set route='/games/memory-grid' where code='memory_grid';
update public.games set route='/' where code='lightning';

create or replace view public.player_game_analytics as
select
  player_id,
  game_code,
  count(*)::bigint as sessions_count,
  max(score) as best_score,
  round(avg(score)::numeric, 2) as average_score,
  round(avg(accuracy_percent)::numeric, 2) as average_accuracy_percent,
  round(avg(duration_ms)::numeric, 2) as average_duration_ms,
  round(avg(error_count)::numeric, 2) as average_error_count,
  max(grid_size) as max_grid_size,
  count(*) filter (where accuracy_percent = 100 and coalesce(error_count,0)=0)::bigint as perfect_sessions,
  max(created_at) as last_played_at
from public.game_sessions
group by player_id, game_code;

comment on view public.player_game_analytics is 'Aggregate per-player game analytics; raw session telemetry remains in game_sessions.';
alter view public.player_game_analytics set (security_invoker = true);
revoke all on public.player_game_analytics from anon, authenticated;
grant select on public.player_game_analytics to service_role;
