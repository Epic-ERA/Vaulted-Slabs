import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type AdminCardPrice = Database['public']['Tables']['admin_card_prices']['Row'];
type AdminCardPriceInsert = Database['public']['Tables']['admin_card_prices']['Insert'];
type SyncLog = Database['public']['Tables']['sync_logs']['Row'];

export async function triggerPokemonSync(
  sets?: string[],
  fullSync?: boolean
): Promise<any> {
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pokemon-sync`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session.access_token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ sets, fullSync }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Sync failed');
  }

  return response.json();
}

export async function getLatestSyncLogs(limit = 10): Promise<SyncLog[]> {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function upsertCardPrice(
  price: AdminCardPriceInsert
): Promise<AdminCardPrice> {
  const { data, error } = await supabase
    .from('admin_card_prices')
    .upsert(price as any)
    .select()
    .single();

  if (error) throw error;
  return data!;
}

export async function getCardPrices(cardId: string): Promise<AdminCardPrice[]> {
  const { data, error } = await supabase
    .from('admin_card_prices')
    .select('*')
    .eq('card_id', cardId)
    .order('as_of_month', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function searchCardsForPricing(
  searchTerm: string
): Promise<Array<{ id: string; name: string; set_id: string; number: string }>> {
  const { data, error } = await supabase
    .from('tcg_cards')
    .select('id, name, set_id, number')
    .or(`name.ilike.%${searchTerm}%,number.ilike.%${searchTerm}%`)
    .limit(50);

  if (error) throw error;
  return data || [];
}
