import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { getCardsBySet } from './cards';
import { getCollectionItems } from './collection';

type CollectionItem = Database['public']['Tables']['collection_items']['Row'];
type AdminCardPrice = Database['public']['Tables']['admin_card_prices']['Row'];

export interface SetCompletion {
  setId: string;
  setName: string;
  totalCards: number;
  ownedCards: number;
  neededCards: number;
  completionPercent: number;
  ownedCount: number;
  estimatedValue: number;
}

export interface GradingBreakdown {
  company: string;
  count: number;
}

export interface GradeBreakdown {
  grade: string;
  count: number;
}

export interface VariantBreakdown {
  variant: string;
  count: number;
}

export async function calculateSetCompletion(
  userId: string,
  setId: string
): Promise<SetCompletion> {
  const cards = await getCardsBySet(setId);
  const items = await getCollectionItems(userId);

  const setItems = items.filter((item) =>
    cards.some((card) => card.id === item.card_id)
  );

  const uniqueCardIds = new Set(setItems.map((item) => item.card_id));

  const { data: setData } = await supabase
    .from('tcg_sets')
    .select('name')
    .eq('id', setId)
    .maybeSingle();

  const estimatedValue = await calculateCollectionValue(setItems);

  return {
    setId,
    setName: (setData as any)?.name || 'Unknown Set',
    totalCards: cards.length,
    ownedCards: uniqueCardIds.size,
    neededCards: cards.length - uniqueCardIds.size,
    completionPercent: cards.length > 0 ? (uniqueCardIds.size / cards.length) * 100 : 0,
    ownedCount: setItems.length,
    estimatedValue,
  };
}

export async function getAllSetCompletions(userId: string): Promise<SetCompletion[]> {
  const { data: sets } = await supabase.from('tcg_sets').select('id');
  if (!sets || sets.length === 0) return [];

  const completions = await Promise.all(
    sets.map((set: any) => calculateSetCompletion(userId, set.id))
  );

  return completions.filter((c) => c.ownedCount > 0);
}

export function getGradingBreakdown(items: CollectionItem[]): GradingBreakdown[] {
  const breakdown = new Map<string, number>();

  items.forEach((item) => {
    const company = item.grading_company || 'RAW';
    breakdown.set(company, (breakdown.get(company) || 0) + 1);
  });

  return Array.from(breakdown.entries())
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count);
}

export function getGradeBreakdown(items: CollectionItem[]): GradeBreakdown[] {
  const breakdown = new Map<string, number>();

  items.forEach((item) => {
    if (item.condition_type === 'graded' && item.grade_label) {
      breakdown.set(item.grade_label, (breakdown.get(item.grade_label) || 0) + 1);
    }
  });

  return Array.from(breakdown.entries())
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => b.count - a.count);
}

export function getVariantBreakdown(items: CollectionItem[]): VariantBreakdown[] {
  const breakdown = new Map<string, number>();

  items.forEach((item) => {
    const variant = item.variant || 'standard';
    breakdown.set(variant, (breakdown.get(variant) || 0) + 1);
  });

  return Array.from(breakdown.entries())
    .map(([variant, count]) => ({ variant, count }))
    .sort((a, b) => b.count - a.count);
}

async function calculateCollectionValue(items: CollectionItem[]): Promise<number> {
  let totalValue = 0;

  for (const item of items) {
    const price = await findBestMatchingPrice(
      item.card_id,
      item.grading_company,
      item.grade_value,
      item.variant
    );
    if (price) {
      totalValue += price.avg_price;
    }
  }

  return totalValue;
}

async function findBestMatchingPrice(
  cardId: string,
  company: string | null,
  gradeValue: number | null,
  variant: string | null
): Promise<AdminCardPrice | null> {
  const { data: prices } = await supabase
    .from('admin_card_prices')
    .select('*')
    .eq('card_id', cardId)
    .order('as_of_month', { ascending: false });

  if (!prices || prices.length === 0) return null;

  const priceList = prices as AdminCardPrice[];

  const exactMatch = priceList.find(
    (p) =>
      p.grading_company === (company || 'ANY') &&
      p.grade_value === gradeValue &&
      p.variant === variant
  );
  if (exactMatch) return exactMatch;

  const companyGradeMatch = priceList.find(
    (p) => p.grading_company === (company || 'ANY') && p.grade_value === gradeValue
  );
  if (companyGradeMatch) return companyGradeMatch;

  const companyMatch = priceList.find((p) => p.grading_company === (company || 'ANY'));
  if (companyMatch) return companyMatch;

  return priceList[0];
}
