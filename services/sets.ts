//services/sets.ts
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type TcgSet = Database['public']['Tables']['tcg_sets']['Row'];

export async function getAllSets(): Promise<TcgSet[]> {
  const { data, error } = await supabase
    .from('tcg_sets')
    .select('*')
    .order('release_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getSetById(setId: string): Promise<TcgSet | null> {
  const { data, error } = await supabase
    .from('tcg_sets')
    .select('*')
    .eq('id', setId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSetLogoAsset(setId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('set_logo_assets')
    .select('local_asset_key')
    .eq('set_id', setId)
    .maybeSingle();

  if (error) throw error;
  return (data as any)?.local_asset_key || null;
}
