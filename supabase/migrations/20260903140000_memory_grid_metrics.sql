alter table public.game_sessions add column if not exists duration_ms integer, add column if not exists error_count integer default 0, add column if not exists grid_size integer, add column if not exists pattern_length integer, add column if not exists input_timing_ms jsonb;

alter table public.game_sessions add constraint game_sessions_duration_ms_check check (duration_ms is null or (duration_ms > 0 and duration_ms <= 120000));
alter table public.game_sessions add constraint game_sessions_error_count_check check (error_count is null or error_count between 0 and 1000);
alter table public.game_sessions add constraint game_sessions_grid_size_check check (grid_size is null or grid_size between 2 and 10);
alter table public.game_sessions add constraint game_sessions_pattern_length_check check (pattern_length is null or pattern_length between 1 and 100);
alter table public.game_sessions add constraint game_sessions_input_timing_check check (input_timing_ms is null or jsonb_typeof(input_timing_ms)='array');

-- The canonical function is deployed by the Supabase migration sequence and accepts the new metrics.
