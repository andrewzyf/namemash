import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { toContender, type Contender, type ContenderRow, type SmashResult } from './types';
import seedRoster from '../data/seed-roster.json';

export async function fetchLeaderboard(): Promise<Contender[]> {
  const { data, error } = await supabase
    .from('contenders')
    .select('*')
    .order('smash_rating', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ContenderRow[]).map(toContender);
}

export function extractCategories(items: Contender[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    if (item.category) set.add(item.category);
  }
  return [...set].sort();
}

export async function castVote(winnerId: string, loserId: string): Promise<SmashResult> {
  const { data, error } = await supabase.rpc('record_smash', {
    winner_id: winnerId,
    loser_id: loserId,
  });
  if (error) throw new Error(error.message);
  return data as SmashResult;
}

export async function addContender(name: string, category: string | null): Promise<Contender> {
  const { data, error } = await supabase
    .from('contenders')
    .insert({ name, category })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`"${name}" is already in the roster.`);
    }
    throw new Error(error.message);
  }
  return toContender(data as ContenderRow);
}

export async function seedRosterIfEmpty(): Promise<number> {
  const { count, error: countError } = await supabase
    .from('contenders')
    .select('id', { count: 'exact', head: true });

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) return 0;

  const { error } = await supabase.from('contenders').insert(seedRoster);
  if (error) throw new Error(error.message);
  return seedRoster.length;
}

export function subscribeToContenders(onChange: (payload: RealtimePostgresChangesPayload<ContenderRow>) => void) {
  const channel = supabase
    .channel('contenders-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contenders' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
