-- Extensible game registry and per-player aggregate stats.
create table if not exists public.games (
  code text primary key,
  title text not null,
  skill_domain text not null,
  enabled boolean not null default true,
  sort_order integer not null default 100,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (code ~ '^[a-z0-9_]{2,64}$')
);
alter table public.games enable row level security;

create table if not exists public.player_game_stats (
  player_id uuid not null references public.players(id) on delete cascade,
  game_code text not null references public.games(code) on update cascade,
  sessions_count integer not null default 0 check (sessions_count >= 0),
  best_score integer,
  best_reaction_ms integer check (best_reaction_ms is null or best_reaction_ms > 0),
  best_accuracy_percent numeric check (best_accuracy_percent is null or (best_accuracy_percent >= 0 and best_accuracy_percent <= 100)),
  last_played_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (player_id, game_code)
);
alter table public.player_game_stats enable row level security;

insert into public.games (code,title,skill_domain,enabled,sort_order,config) values
('lightning','Молния','reaction',true,10,'{"version":1}'::jsonb),
('memory_grid','Память-сетка','working_memory',true,20,'{"version":1}'::jsonb),
('switcher','Переключатель','cognitive_flexibility',true,30,'{"version":1}'::jsonb),
('focus_ribbon','Фокус-лента','sustained_attention',true,40,'{"version":1}'::jsonb),
('pattern','Паттерн','pattern_recognition',false,50,'{"version":1}'::jsonb),
('dual_stream','Двойной поток','divided_attention',false,60,'{"version":1}'::jsonb)
on conflict (code) do update set title=excluded.title,skill_domain=excluded.skill_domain,sort_order=excluded.sort_order,config=excluded.config,updated_at=now();

create index if not exists player_game_stats_game_code_idx on public.player_game_stats (game_code,updated_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end;
$$;
drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at before update on public.games for each row execute function public.set_updated_at();
drop trigger if exists player_game_stats_set_updated_at on public.player_game_stats;
create trigger player_game_stats_set_updated_at before update on public.player_game_stats for each row execute function public.set_updated_at();