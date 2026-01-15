// app/(app)/sets/[setid].tsx
import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  ImageBackground,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { getSetById } from '@/services/sets';
import { getCardsBySet, getRarityTag, getCardNumberDisplay } from '@/services/cards';
import { getCollectionItemsByCard } from '@/services/collection';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/types/database';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');

type TcgCard = Database['public']['Tables']['tcg_cards']['Row'];
type TcgSet = Database['public']['Tables']['tcg_sets']['Row'];

export default function SetDetailScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const { user } = useAuth();

  const [set, setSet] = useState<TcgSet | null>(null);
  const [cards, setCards] = useState<TcgCard[]>([]);
  const [ownedCardIds, setOwnedCardIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'owned' | 'needed'>('all');

  useEffect(() => {
    loadSetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId]);

  async function loadSetData() {
    if (!setId) return;

    try {
      const [setData, cardsData] = await Promise.all([getSetById(setId), getCardsBySet(setId)]);

      setSet(setData);
      setCards(cardsData);

      if (user) {
        const allItems = await Promise.all(
          cardsData.map((card) => getCollectionItemsByCard(user.id, card.id))
        );
        const owned = new Set(allItems.flatMap((items, idx) => (items.length > 0 ? [cardsData[idx].id] : [])));
        setOwnedCardIds(owned);
      }
    } catch (error) {
      console.error('Error loading set:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCards = useMemo(() => {
    let result = cards;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (card) => card.name.toLowerCase().includes(query) || card.number.toLowerCase().includes(query)
      );
    }

    if (activeTab === 'owned') result = result.filter((card) => ownedCardIds.has(card.id));
    if (activeTab === 'needed') result = result.filter((card) => !ownedCardIds.has(card.id));

    return result;
  }, [cards, searchQuery, activeTab, ownedCardIds]);

  const groupedCards = useMemo(() => {
    const groups: Record<string, TcgCard[]> = { Pokémon: [], Trainer: [], Energy: [] };
    filteredCards.forEach((card) => {
      const type = card.supertype || 'Pokémon';
      if (groups[type]) groups[type].push(card);
      else groups['Pokémon'].push(card);
    });
    return groups;
  }, [filteredCards]);

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

  if (!set) {
    return (
      <View style={styles.root}>
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
          <View style={styles.bgOverlay} />
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Set Not Found</Text>
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
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.85}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>{set.name}</Text>
            <Text style={styles.subtitle}>
              {filteredCards.length} of {cards.length} cards
            </Text>
          </View>

          <View style={styles.searchBar}>
            <Search size={20} color="rgba(255,255,255,0.55)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or number..."
              placeholderTextColor="rgba(255,255,255,0.55)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.tabActive]}
              onPress={() => setActiveTab('all')}
              activeOpacity={0.9}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'owned' && styles.tabActive]}
              onPress={() => setActiveTab('owned')}
              activeOpacity={0.9}
            >
              <Text style={[styles.tabText, activeTab === 'owned' && styles.tabTextActive]}>Owned</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'needed' && styles.tabActive]}
              onPress={() => setActiveTab('needed')}
              activeOpacity={0.9}
            >
              <Text style={[styles.tabText, activeTab === 'needed' && styles.tabTextActive]}>Needed</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {Object.entries(groupedCards).map(([supertype, groupCards]) => {
              if (groupCards.length === 0) return null;

              return (
                <View key={supertype} style={styles.section}>
                  <Text style={styles.sectionTitle}>{supertype}</Text>

                  <View style={styles.cardsGrid}>
                    {groupCards.map((card) => (
                      <TouchableOpacity key={card.id} style={styles.cardItem} onPress={() => {}} activeOpacity={0.85}>
                        {card.small_image_url ? (
                          <Image source={{ uri: card.small_image_url }} style={styles.cardImage} resizeMode="contain" />
                        ) : (
                          <View style={styles.placeholderImage}>
                            <Text style={styles.placeholderText}>?</Text>
                          </View>
                        )}

                        <View style={styles.cardInfo}>
                          <Text style={styles.cardName} numberOfLines={1}>
                            {card.name}
                          </Text>

                          <Text style={styles.cardNumber}>
                            {getCardNumberDisplay(card.number, set.printed_total, set.total)}
                          </Text>

                          {card.rarity && (
                            <View style={styles.rarityTag}>
                              <Text style={styles.rarityTagText}>{getRarityTag(card.rarity)}</Text>
                            </View>
                          )}

                          {ownedCardIds.has(card.id) && (
                            <View style={styles.ownedBadge}>
                              <Text style={styles.ownedBadgeText}>✓ Owned</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
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

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'center' },

  // ✅ safe top padding so it never hides behind your header bar
  pageHeader: { paddingHorizontal: 20, paddingTop: 78, paddingBottom: 12, alignItems: 'center' },
  backButton: { alignSelf: 'flex-start', marginBottom: 8 },
  backText: { fontSize: 16, color: '#DC0A2D', fontWeight: '900' },

  title: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#fff' },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(220,10,45,0.22)' },
  tabText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '900' },
  tabTextActive: { color: '#DC0A2D' },

  content: { flex: 1 },
  contentContainer: { paddingBottom: 140 },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },

  cardItem: {
    width: '47%',
    margin: '1.5%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  cardImage: { width: '100%', height: 160, borderRadius: 8, marginBottom: 8 },

  placeholderImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  placeholderText: { fontSize: 32, color: 'rgba(255,255,255,0.55)', fontWeight: '900' },

  cardInfo: { gap: 4 },
  cardName: { fontSize: 14, fontWeight: '900', color: '#fff' },
  cardNumber: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  rarityTag: {
    backgroundColor: 'rgba(255,152,0,0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.55)',
  },
  rarityTagText: { fontSize: 10, color: '#ff9500', fontWeight: '900' },

  ownedBadge: {
    backgroundColor: 'rgba(52,199,89,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.55)',
  },
  ownedBadgeText: { color: '#34c759', fontSize: 11, fontWeight: '900' },
});
