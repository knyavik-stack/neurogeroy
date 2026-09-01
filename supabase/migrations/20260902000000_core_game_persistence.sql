create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  first_name text,
  username text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  game_code text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  reaction_ms integer,
  score integer,
  created_at timestamptz not null default now(),
  constraint reaction_ms_positive check (reaction_ms is null or reaction_ms > 0),
  constraint reaction_ms_reasonable check (reaction_ms is null or reaction_ms <= 10000)
);

create index if not exists game_sessions_player_id_idx on public.game_sessions(player_id);
create index if not exists game_sessions_game_code_created_at_idx on public.game_sessions(game_code, created_at desc);

alter table public.players enable row level security;
alter table public.game_sessions enable row level security;

create or replace function public.record_lightning_session(
  p_telegram_id bigint,
  p_first_name text,
  p_username text,
  p_reaction_ms integer,
  p_difficulty integer default 1,
  p_false_starts integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
  v_session public.game_sessions;
  v_score integer;
  v_experience integer;
  v_coins integer;
begin
  if p_telegram_id is null or p_reaction_ms is null then raise exception 'invalid input'; end if;
  if p_reaction_ms < 1 or p_reaction_ms > 10000 then raise exception 'invalid reaction'; end if;
  if p_difficulty < 1 or p_difficulty > 3 then raise exception 'invalid difficulty'; end if;
  if p_false_starts < 0 or p_false_starts > 20 then raise exception 'invalid false starts'; end if;

  insert into public.players (telegram_id, first_name, username, last_seen_at)
  values (p_telegram_id, p_first_name, p_username, now())
  on conflict (telegram_id) do update set
    first_name = excluded.first_name,
    username = excluded.username,
    last_seen_at = now()
  returning * into v_player;

  v_score := greatest(0, least(1000, round(1000 - (p_reaction_ms * 1.5) + ((p_difficulty - 1) * 75) - (p_false_starts * 50))::integer));
  v_experience := 10 + (p_difficulty * 5) + case when v_score >= 700 then 10 else 0 end;
  v_coins := 2 + p_difficulty + case when v_score >= 800 then 2 else 0 end;

  insert into public.game_sessions (player_id, game_code, started_at, completed_at, reaction_ms, score)
  values (v_player.id, 'lightning', now() - make_interval(secs => least(p_reaction_ms, 10000) / 1000.0), now(), p_reaction_ms, v_score)
  returning * into v_session;

  return jsonb_build_object('player_id', v_player.id, 'session_id', v_session.id, 'reaction_ms', v_session.reaction_ms, 'score', v_score, 'experience_earned', v_experience, 'coins_earned', v_coins);
end;
$$;

revoke all on function public.record_lightning_session(bigint,text,text,integer,integer,integer) from public;
grant execute on function public.record_lightning_session(bigint,text,text,integer,integer,integer) to service_role;
