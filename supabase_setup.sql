-- NameMash: Supabase schema, Elo ("Smash") function, Realtime, and RLS.
-- Paste this whole file into the Supabase SQL Editor and run it once.

-- ---------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------
create table if not exists contenders (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 60),
  category text default 'General',
  smash_rating integer not null default 1200,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_contenders_rating on contenders (smash_rating desc);

-- Ship full before/after row images on change events, so realtime
-- subscribers (see src/lib/contenders.ts) can diff old vs. new rating
-- to render "+18 Smashes" style deltas without a second round trip.
alter table contenders replica identity full;

-- ---------------------------------------------------------------------
-- 2. Atomic Elo ("Smash") update function
-- ---------------------------------------------------------------------
-- Locks both rows (in a fixed id order, to avoid deadlocking against a
-- concurrent call for the same pair in the opposite direction), computes
-- the standard logistic Elo update with K=32, and applies both writes in
-- one statement-level transaction. Returns the deltas + new ratings so
-- the client can animate "+X / -X Smashes" without a follow-up query.
create or replace function record_smash(winner_id uuid, loser_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k constant integer := 32;
  rec record;
  winner_rating integer;
  loser_rating integer;
  expected_winner double precision;
  expected_loser double precision;
  winner_delta integer;
  loser_delta integer;
  new_winner_rating integer;
  new_loser_rating integer;
begin
  if winner_id = loser_id then
    raise exception 'winner_id and loser_id must differ';
  end if;

  -- Lock both rows in a consistent order (by id) so two simultaneous,
  -- opposite-direction votes on the same pair can never deadlock.
  for rec in
    select id, smash_rating from contenders
    where id in (winner_id, loser_id)
    order by id
    for update
  loop
    if rec.id = winner_id then
      winner_rating := rec.smash_rating;
    else
      loser_rating := rec.smash_rating;
    end if;
  end loop;

  if winner_rating is null or loser_rating is null then
    raise exception 'One or both contenders were not found';
  end if;

  expected_winner := 1.0 / (1 + power(10, (loser_rating - winner_rating) / 400.0));
  expected_loser  := 1.0 / (1 + power(10, (winner_rating - loser_rating) / 400.0));

  winner_delta := round(k * (1 - expected_winner));
  loser_delta  := round(k * (0 - expected_loser));

  new_winner_rating := winner_rating + winner_delta;
  new_loser_rating  := loser_rating + loser_delta;

  update contenders set smash_rating = new_winner_rating, wins = wins + 1 where id = winner_id;
  update contenders set smash_rating = new_loser_rating, losses = losses + 1 where id = loser_id;

  return jsonb_build_object(
    'winner_id', winner_id,
    'winner_rating', new_winner_rating,
    'winner_delta', winner_delta,
    'loser_id', loser_id,
    'loser_rating', new_loser_rating,
    'loser_delta', loser_delta
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Realtime
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table contenders;

-- ---------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------
alter table contenders enable row level security;

-- Anyone can read the roster / leaderboard.
create policy "Public read access"
  on contenders for select
  using (true);

-- Anyone can add a contender via the Roster admin UI. Rating/wins/losses
-- can only change through record_smash (SECURITY DEFINER, below) — there
-- is no public UPDATE or DELETE policy, so votes can't be forged or
-- ratings tampered with directly from the client.
create policy "Public insert access"
  on contenders for insert
  with check (
    char_length(trim(name)) between 1 and 60
    and smash_rating = 1200
    and wins = 0
    and losses = 0
  );

-- record_smash runs as SECURITY DEFINER (owner privileges), so it bypasses
-- RLS internally; this grant just lets anon/authenticated clients call it.
grant execute on function record_smash(uuid, uuid) to anon, authenticated;
