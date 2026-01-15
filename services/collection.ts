//services/collection.ts
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type CollectionItem = Database['public']['Tables']['collection_items']['Row'];
type CollectionItemInsert = Database['public']['Tables']['collection_items']['Insert'];
type CollectionItemUpdate = Database['public']['Tables']['collection_items']['Update'];
type CollectionItemImage = Database['public']['Tables']['collection_item_images']['Row'];

export async function getCollectionItems(userId: string): Promise<CollectionItem[]> {
  const { data, error } = await supabase
    .from('collection_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
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

  if (error) throw error;
  return data || [];
}

export async function getCollectionItem(itemId: string): Promise<CollectionItem | null> {
  const { data, error } = await supabase
    .from('collection_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createCollectionItem(
  item: CollectionItemInsert
): Promise<CollectionItem> {
  const { data, error } = await supabase
    .from('collection_items')
    .insert(item as any)
    .select()
    .single();

  if (error) throw error;
  return data!;
}

export async function updateCollectionItem(
  itemId: string,
  updates: CollectionItemUpdate
): Promise<CollectionItem> {
  const { data, error } = await supabase
    .from('collection_items')
    .update(updates as never)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data!;
}

export async function deleteCollectionItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function getItemImages(itemId: string): Promise<CollectionItemImage[]> {
  const { data, error } = await supabase
    .from('collection_item_images')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });

  if (error) throw error;
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
    .select()
    .single();

  if (error) throw error;
  return data!;
}

export async function deleteItemImage(imageId: string): Promise<void> {
  const { error } = await supabase
    .from('collection_item_images')
    .delete()
    .eq('id', imageId);

  if (error) throw error;
}

export async function uploadImage(
  userId: string,
  file: Blob,
  fileName: string
): Promise<string> {
  const filePath = `${userId}/${Date.now()}_${fileName}`;

  const { error } = await supabase.storage
    .from('collection-images')
    .upload(filePath, file);

  if (error) throw error;
  return filePath;
}

export async function getSignedImageUrl(imagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('collection-images')
    .createSignedUrl(imagePath, 3600);

  if (error) throw error;
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
    const errorData = await response.json();
    throw new Error(errorData.error || 'Verification failed');
  }

  return response.json();
}
