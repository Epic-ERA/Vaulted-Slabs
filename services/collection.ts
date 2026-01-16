//services/collection.ts
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type CollectionItem = Database['public']['Tables']['collection_items']['Row'];
type CollectionItemInsert = Database['public']['Tables']['collection_items']['Insert'];
type CollectionItemUpdate = Database['public']['Tables']['collection_items']['Update'];
type CollectionItemImage = Database['public']['Tables']['collection_item_images']['Row'];

/**
 * Supabase errors can be vague in-app. This helper makes them actionable.
 * It preserves the original error but adds context for RLS / FK / enum issues.
 */
function throwWithContext(context: string, error: any): never {
  const code = error?.code ? ` [${error.code}]` : '';
  const msg = error?.message || 'Unknown error';
  const hint = error?.hint ? ` | hint: ${error.hint}` : '';
  const details = error?.details ? ` | details: ${error.details}` : '';

  // Common gotchas -> give you a direct next step
  let extra = '';
  if (error?.code === '42501') {
    extra =
      ' | Likely RLS denied. Check table RLS policies for select/insert/update/delete.';
  } else if (error?.code === '23503') {
    extra =
      ' | Foreign key failed. Ensure tcg_cards(id) exists for card_id and auth user exists for user_id.';
  } else if (error?.code === '22P02') {
    extra =
      ' | Invalid UUID/enum format. Check that ids/enums match your DB types.';
  } else if (error?.code === '23505') {
    extra =
      ' | Unique constraint hit. You may already have this slab/card (e.g., unique user/company/cert index).';
  } else if (error?.code === '42703') {
    extra =
      ' | Column not found. Your DB schema is missing a column you are inserting/updating.';
  }

  throw new Error(`${context}${code}: ${msg}${hint}${details}${extra}`);
}

export async function getCollectionItems(userId: string): Promise<CollectionItem[]> {
  const { data, error } = await supabase
    .from('collection_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throwWithContext('getCollectionItems', error);
  return data || [];
}

export async function getCollectionItemsByCard(
  userId: string,
  cardId: string
): Promise<CollectionItem[]> {
  const { data, error } = await supabase
    .from('collection_items')
    .select('*')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .order('created_at', { ascending: false });

  if (error) throwWithContext('getCollectionItemsByCard', error);
  return data || [];
}

export async function getCollectionItem(itemId: string): Promise<CollectionItem | null> {
  const { data, error } = await supabase
    .from('collection_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (error) throwWithContext('getCollectionItem', error);
  return data;
}

export async function createCollectionItem(
  item: CollectionItemInsert
): Promise<CollectionItem> {
  // Important: `.single()` will throw if RLS blocks or insert returns 0 rows.
  // We keep your flow, but add better diagnostics and a guard.
  const { data, error } = await supabase
    .from('collection_items')
    .insert(item as any)
    .select('*')
    .single();

  if (error) throwWithContext('createCollectionItem', error);
  if (!data) throw new Error('createCollectionItem: Insert succeeded but no row returned (check RLS + select policy).');
  return data;
}

export async function updateCollectionItem(
  itemId: string,
  updates: CollectionItemUpdate
): Promise<CollectionItem> {
  // Your `as never` can hide shape problems; use `as any` (still safe) but keep behavior.
  const { data, error } = await supabase
    .from('collection_items')
    .update(updates as any)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) throwWithContext('updateCollectionItem', error);
  if (!data) throw new Error('updateCollectionItem: Update succeeded but no row returned (check RLS + select policy).');
  return data;
}

export async function deleteCollectionItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('id', itemId);

  if (error) throwWithContext('deleteCollectionItem', error);
}

export async function getItemImages(itemId: string): Promise<CollectionItemImage[]> {
  const { data, error } = await supabase
    .from('collection_item_images')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });

  if (error) throwWithContext('getItemImages', error);
  return data || [];
}

export async function addItemImage(
  itemId: string,
  imagePath: string,
  kind: 'front' | 'back' | 'label' | 'other'
): Promise<CollectionItemImage> {
  const { data, error } = await supabase
    .from('collection_item_images')
    .insert({
      item_id: itemId,
      image_path: imagePath,
      kind,
    } as any)
    .select('*')
    .single();

  if (error) throwWithContext('addItemImage', error);
  if (!data) throw new Error('addItemImage: Insert succeeded but no row returned (check RLS + select policy).');
  return data;
}

export async function deleteItemImage(imageId: string): Promise<void> {
  const { error } = await supabase
    .from('collection_item_images')
    .delete()
    .eq('id', imageId);

  if (error) throwWithContext('deleteItemImage', error);
}

export async function uploadImage(
  userId: string,
  file: Blob,
  fileName: string
): Promise<string> {
  const filePath = `${userId}/${Date.now()}_${fileName}`;

  // Note: explicit options avoid platform quirks.
  // - upsert false prevents accidental overwrites
  // - contentType helps some browsers render correctly when signed
  const contentType =
    // @ts-ignore (Blob.type exists in runtime)
    typeof (file as any)?.type === 'string' && (file as any).type ? (file as any).type : undefined;

  const { error } = await supabase.storage
    .from('collection-images')
    .upload(filePath, file, {
      upsert: false,
      ...(contentType ? { contentType } : {}),
    });

  if (error) throwWithContext('uploadImage', error);
  return filePath;
}

export async function getSignedImageUrl(imagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('collection-images')
    .createSignedUrl(imagePath, 3600);

  if (error) throwWithContext('getSignedImageUrl', error);
  if (!data?.signedUrl) throw new Error('getSignedImageUrl: signedUrl missing from response.');
  return data.signedUrl;
}

export async function verifyPSACert(
  collectionItemId: string,
  certNumber: string,
  expectedCardId: string
): Promise<any> {
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/psa-verify-cert`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session.access_token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({
        collection_item_id: collectionItemId,
        cert_number: certNumber,
        expected_card_id: expectedCardId,
      }),
    }
  );

  if (!response.ok) {
    // Keep your behavior but improve reliability if response isn't JSON
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }
    throw new Error(errorData?.error || `Verification failed (${response.status})`);
  }

  return response.json();
}
