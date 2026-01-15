// app/(app)/collection/index.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getCollectionItems } from '@/services/collection';
import { getCardById } from '@/services/cards';
import type { Database } from '@/types/database';
import { CheckCircle } from 'lucide-react-native';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');

type CollectionItem = Database['public']['Tables']['collection_items']['Row'];

interface EnrichedItem extends CollectionItem {
  cardName?: string;
  cardImage?: string | null;
  cardNumber?: string;
}

export default function CollectionScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadCollection() {
    if (!user) return;

    try {
      const collectionItems = await getCollectionItems(user.id);

      const enriched = await Promise.all(
        collectionItems.map(async (item) => {
          const card = await getCardById(item.card_id);
          return {
            ...item,
            cardName: card?.name,
            cardImage: card?.small_image_url,
            cardNumber: card?.number,
          };
        })
      );

      setItems(enriched);
    } catch (error) {
      console.error('Error loading collection:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
          <View style={styles.bgOverlay} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DC0A2D" />
          </View>
        </ImageBackground>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.root}>
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
          <View style={styles.bgOverlay} />

          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>My Collection</Text>
              <Text style={styles.subtitle}>0 items</Text>
            </View>

            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Items Yet</Text>
              <Text style={styles.emptyText}>
                Start adding cards to your collection from the Sets tab
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
        <View style={styles.bgOverlay} />

        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>My Collection</Text>
            <Text style={styles.subtitle}>{items.length} items</Text>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
            {items.map((item) => (
              <TouchableOpacity key={item.id} style={styles.itemCard} activeOpacity={0.85}>
                {item.cardImage ? (
                  <Image source={{ uri: item.cardImage }} style={styles.cardImage} resizeMode="contain" />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>?</Text>
                  </View>
                )}

                <View style={styles.itemInfo}>
                  <Text style={styles.cardName}>{item.cardName || 'Unknown'}</Text>
                  <Text style={styles.cardNumber}>#{item.cardNumber}</Text>

                  <View style={styles.gradingInfo}>
                    {item.condition_type === 'graded' ? (
                      <>
                        <Text style={styles.gradingText}>
                          {item.grading_company} {item.grade_label || item.grade_value}
                        </Text>
                        {item.cert_number && <Text style={styles.certText}>Cert: {item.cert_number}</Text>}
                      </>
                    ) : (
                      <Text style={styles.gradingText}>Raw</Text>
                    )}
                  </View>

                  {item.variant && (
                    <Text style={styles.variantText}>{item.variant.replace(/_/g, ' ')}</Text>
                  )}

                  {item.psa_verified && (
                    <View style={styles.verifiedBadge}>
                      <CheckCircle size={14} color="#34c759" />
                      <Text style={styles.verifiedText}>PSA Verified</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bg: { flex: 1, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },

  container: { flex: 1, backgroundColor: 'transparent' },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },

  // ✅ consistent header spacing + centered titles
  header: {
    paddingHorizontal: 20,
    paddingTop: 78,
    paddingBottom: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.80)',
    textAlign: 'center',
    marginTop: 6,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 140,
    backgroundColor: 'transparent',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    color: '#fff',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },

  content: { flex: 1, paddingHorizontal: 16 },
  contentPad: { paddingTop: 6, paddingBottom: 140 },

  itemCard: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cardImage: { width: 80, height: 112, borderRadius: 4, marginRight: 16 },
  placeholderImage: {
    width: 80,
    height: 112,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  placeholderText: { fontSize: 24, color: 'rgba(255,255,255,0.5)' },

  itemInfo: { flex: 1, justifyContent: 'center' },
  cardName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  cardNumber: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 8 },

  gradingInfo: { marginBottom: 4 },
  gradingText: { fontSize: 14, fontWeight: '500', color: '#DC0A2D' },
  certText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  variantText: { fontSize: 12, color: '#ff9500', textTransform: 'capitalize', marginTop: 4 },

  verifiedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  verifiedText: { fontSize: 12, color: '#34c759', fontWeight: '600' },
});
