//services/cards.ts
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type TcgCard = Database['public']['Tables']['tcg_cards']['Row'];

export interface CardFilters {
  search?: string;
  condition?: 'graded' | 'raw' | 'any';
  gradingCompany?: string;
  gradeMin?: number;
  gradeMax?: number;
  variant?: string;
  ownedOnly?: boolean;
  neededOnly?: boolean;
}

export async function getCardsBySet(setId: string): Promise<TcgCard[]> {
  const { data, error } = await supabase
    .from('tcg_cards')
    .select('*')
    .eq('set_id', setId);

  if (error) throw error;
  return sortCards(data || []);
}

export async function getCardById(cardId: string): Promise<TcgCard | null> {
  const { data, error } = await supabase
    .from('tcg_cards')
    .select('*')
    .eq('id', cardId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function searchCards(query: string, limit: number = 20): Promise<TcgCard[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('tcg_cards')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export function sortCards(cards: TcgCard[]): TcgCard[] {
  return cards.sort((a, b) => {
    const aNum = extractLeadingNumber(a.number);
    const bNum = extractLeadingNumber(b.number);

    if (aNum !== null && bNum !== null && aNum !== bNum) {
      return aNum - bNum;
    }

    if (aNum !== null && bNum === null) return -1;
    if (aNum === null && bNum !== null) return 1;

    const stringCompare = a.number.localeCompare(b.number);
    if (stringCompare !== 0) return stringCompare;

    const aRarityOrder = getRarityOrder(a.rarity);
    const bRarityOrder = getRarityOrder(b.rarity);
    return aRarityOrder - bRarityOrder;
  });
}

function extractLeadingNumber(cardNumber: string): number | null {
  const match = cardNumber.match(/^\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function getRarityOrder(rarity: string | null): number {
  if (!rarity) return 999;
  const lowerRarity = rarity.toLowerCase();
  if (lowerRarity.includes('holo') && !lowerRarity.includes('non-holo')) return 0;
  if (lowerRarity.includes('non-holo')) return 1;
  return 2;
}

export function getRarityTag(rarity: string | null): string {
  if (!rarity) return 'Variant';
  const lowerRarity = rarity.toLowerCase();
  if (lowerRarity.includes('holo') && !lowerRarity.includes('non-holo')) return 'Holo';
  if (lowerRarity.includes('non-holo')) return 'Non-Holo';
  return 'Variant';
}

export function getCardNumberDisplay(
  cardNumber: string,
  printedTotal: number | null,
  total: number | null
): string {
  const totalToUse = printedTotal || total || '?';
  return `${cardNumber}/${totalToUse}`;
}
