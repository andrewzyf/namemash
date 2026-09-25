-- NameMash: Invite-code gating (single-device binding) + vote attribution.
-- Paste this whole file into the Supabase SQL Editor and run it once,
-- after supabase_setup.sql has already been applied.

-- ---------------------------------------------------------------------
-- 1. Invite codes table
-- ---------------------------------------------------------------------
create table if not exists invite_codes (
  code text primary key,
  assigned_to text not null,
  bound_device_id text,
  is_active boolean not null default true,
  times_used int not null default 0,
  last_used_at timestamp with time zone default now()
);

alter table invite_codes enable row level security;
-- No public select/insert/update policies: invite codes (and which device
-- they're bound to) are never readable or writable directly by clients.
-- All access goes through verify_invite_code (SECURITY DEFINER) below,
-- and codes are managed by admins from the Supabase dashboard / SQL editor.

-- ---------------------------------------------------------------------
-- 2. verify_invite_code RPC (single-device binding, "Method 1")
-- ---------------------------------------------------------------------
create or replace function verify_invite_code(user_code text, client_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  if user_code is null or client_device_id is null or trim(client_device_id) = '' then
    return jsonb_build_object('success', false, 'message', 'Missing invite code or device id.');
  end if;

  select * into rec from invite_codes where code = trim(user_code) for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Invalid invite code.');
  end if;

  if not rec.is_active then
    return jsonb_build_object('success', false, 'message', 'This invite code has been deactivated.');
  end if;

  if rec.bound_device_id is null then
    -- First use: bind this code to the requesting device.
    update invite_codes
      set bound_device_id = client_device_id,
          times_used = times_used + 1,
          last_used_at = now()
      where code = rec.code;
  elsif rec.bound_device_id = client_device_id then
    -- Same device as before: allow, just bump usage stats.
    update invite_codes
      set times_used = times_used + 1,
          last_used_at = now()
      where code = rec.code;
  else
    -- Bound to a different device: reject.
    return jsonb_build_object(
      'success', false,
      'message', 'This invite code is already bound to another device.'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'assigned_to', rec.assigned_to,
    'code', rec.code
  );
end;
$$;

grant execute on function verify_invite_code(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Votes attribution table
-- ---------------------------------------------------------------------
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid not null references contenders(id),
  loser_id uuid not null references contenders(id),
  voter_code text,
  voter_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_votes_created_at on votes (created_at desc);

alter table votes enable row level security;
-- No public select/insert policies: votes are only ever written by
-- record_smash (SECURITY DEFINER, below), and are visible to admins via
-- the Supabase dashboard / SQL editor / service role, not to clients.

-- ---------------------------------------------------------------------
-- 4. record_smash: same Elo update as supabase_setup.sql, now with
--    optional voter attribution logged to the votes table.
-- ---------------------------------------------------------------------
drop function if exists record_smash(uuid, uuid);

create or replace function record_smash(
  winner_id uuid,
  loser_id uuid,
  voter_code text default null,
  voter_name text default null
)
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

  insert into votes (winner_id, loser_id, voter_code, voter_name)
  values (winner_id, loser_id, voter_code, voter_name);

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

grant execute on function record_smash(uuid, uuid, text, text) to anon, authenticated;
