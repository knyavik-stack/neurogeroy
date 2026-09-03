alter table public.game_sessions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.game_sessions add constraint game_sessions_metadata_object check (jsonb_typeof(metadata) = 'object');

drop function if exists public.record_game_session(bigint,text,text,text,integer,integer,integer,integer,numeric,integer,integer,integer,integer,jsonb);

create function public.record_game_session(
  p_telegram_id bigint,
  p_first_name text,
  p_username text,
  p_game_code text,
  p_score integer,
  p_difficulty integer default 1,
  p_reaction_ms integer default null,
  p_false_starts integer default 0,
  p_accuracy_percent numeric default null,
  p_duration_ms integer default null,
  p_error_count integer default 0,
  p_grid_size integer default null,
  p_pattern_length integer default null,
  p_input_timing_ms jsonb default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v_player public.players; v_session public.game_sessions; v_game public.games; v_experience integer; v_coins integer;
begin
  if p_telegram_id is null or p_game_code is null then raise exception 'invalid input'; end if;
  select * into v_game from public.games where code=p_game_code and enabled=true;
  if not found then raise exception 'game unavailable'; end if;
  if p_score is null or p_score<0 or p_score>1000000 then raise exception 'invalid score'; end if;
  if p_difficulty<1 or p_difficulty>20 then raise exception 'invalid difficulty'; end if;
  if p_reaction_ms is not null and (p_reaction_ms<1 or p_reaction_ms>60000) then raise exception 'invalid reaction'; end if;
  if p_false_starts<0 or p_false_starts>100 then raise exception 'invalid false starts'; end if;
  if p_accuracy_percent is not null and (p_accuracy_percent<0 or p_accuracy_percent>100) then raise exception 'invalid accuracy'; end if;
  if p_duration_ms is not null and (p_duration_ms<1 or p_duration_ms>120000) then raise exception 'invalid duration'; end if;
  if p_error_count<0 or p_error_count>1000 then raise exception 'invalid errors'; end if;
  if p_grid_size is not null and (p_grid_size<2 or p_grid_size>10) then raise exception 'invalid grid size'; end if;
  if p_pattern_length is not null and (p_pattern_length<1 or p_pattern_length>100) then raise exception 'invalid pattern length'; end if;
  if p_input_timing_ms is not null and (jsonb_typeof(p_input_timing_ms)<>'array' or jsonb_array_length(p_input_timing_ms)>100) then raise exception 'invalid input timing'; end if;
  if p_metadata is null or jsonb_typeof(p_metadata)<>'object' then raise exception 'invalid metadata'; end if;
  insert into public.players(telegram_id,first_name,username,last_seen_at) values(p_telegram_id,p_first_name,p_username,now()) on conflict(telegram_id) do update set first_name=excluded.first_name,username=excluded.username,last_seen_at=now() returning * into v_player;
  v_experience:=10+least(40,p_difficulty*3)+case when p_score>=700 then 10 else 0 end;
  v_coins:=2+least(10,p_difficulty)+case when p_score>=800 then 2 else 0 end;
  update public.players set experience=experience+v_experience,coins=coins+v_coins where id=v_player.id returning * into v_player;
  insert into public.game_sessions(player_id,game_code,started_at,completed_at,reaction_ms,score,accuracy_percent,false_starts,difficulty_level,experience_earned,coins_earned,duration_ms,error_count,grid_size,pattern_length,input_timing_ms,metadata)
  values(v_player.id,p_game_code,now()-coalesce(make_interval(secs=>p_duration_ms/1000.0),interval '0'),now(),p_reaction_ms,p_score,p_accuracy_percent,p_false_starts,p_difficulty,v_experience,v_coins,p_duration_ms,p_error_count,p_grid_size,p_pattern_length,p_input_timing_ms,p_metadata) returning * into v_session;
  insert into public.player_game_stats(player_id,game_code,sessions_count,best_score,best_reaction_ms,best_accuracy_percent,last_played_at) values(v_player.id,p_game_code,1,p_score,p_reaction_ms,p_accuracy_percent,now())
  on conflict(player_id,game_code) do update set sessions_count=public.player_game_stats.sessions_count+1,best_score=greatest(coalesce(public.player_game_stats.best_score,0),excluded.best_score),best_reaction_ms=case when excluded.best_reaction_ms is null then public.player_game_stats.best_reaction_ms when public.player_game_stats.best_reaction_ms is null then excluded.best_reaction_ms else least(public.player_game_stats.best_reaction_ms,excluded.best_reaction_ms) end,best_accuracy_percent=greatest(coalesce(public.player_game_stats.best_accuracy_percent,0),coalesce(excluded.best_accuracy_percent,0)),last_played_at=now(),updated_at=now();
  return jsonb_build_object('player_id',v_player.id,'session_id',v_session.id,'game_code',p_game_code,'score',p_score,'experience_earned',v_experience,'coins_earned',v_coins,'total_experience',v_player.experience,'total_coins',v_player.coins,'level',v_player.level,'duration_ms',p_duration_ms,'error_count',p_error_count,'metadata',p_metadata);
end; $$;
revoke all on function public.record_game_session(bigint,text,text,text,integer,integer,integer,integer,numeric,integer,integer,integer,integer,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.record_game_session(bigint,text,text,text,integer,integer,integer,integer,numeric,integer,integer,integer,integer,jsonb,jsonb) to service_role;
