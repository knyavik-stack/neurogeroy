-- Keep only the normalized 15-argument game result RPC used by the Worker.
-- The exact signatures matter because PostgreSQL overload resolution otherwise
-- permits legacy clients to call obsolete SECURITY DEFINER functions.
drop function if exists public.record_lightning_session(bigint,text,text,integer,integer,integer);
drop function if exists public.record_game_session(bigint,text,text,text,integer,integer,integer,integer,numeric);
drop function if exists public.record_game_session(bigint,text,text,text,integer,integer,integer,integer,numeric,integer,integer,integer,integer);
