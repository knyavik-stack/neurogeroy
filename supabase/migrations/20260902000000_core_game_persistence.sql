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
