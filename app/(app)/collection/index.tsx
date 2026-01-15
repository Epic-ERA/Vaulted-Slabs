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
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getCollectionItems, createCollectionItem } from '@/services/collection';
import { getCardById, getCardsBySet } from '@/services/cards';
import { getAllSets } from '@/services/sets';
import type { Database } from '@/types/database';
import { CheckCircle, Plus, X } from 'lucide-react-native';
import { GRADING_COMPANIES, VARIANTS } from '@/lib/constants';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');

type CollectionItem = Database['public']['Tables']['collection_items']['Row'];

interface EnrichedItem extends CollectionItem {
  cardName?: string;
  cardImage?: string | null;
  cardNumber?: string;
}

type TcgSet = Database['public']['Tables']['tcg_sets']['Row'];
type TcgCard = Database['public']['Tables']['tcg_cards']['Row'];

export default function CollectionScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState<'set' | 'card' | 'details'>('set');
  const [sets, setSets] = useState<TcgSet[]>([]);
  const [cards, setCards] = useState<TcgCard[]>([]);
  const [selectedSet, setSelectedSet] = useState<TcgSet | null>(null);
  const [selectedCard, setSelectedCard] = useState<TcgCard | null>(null);
  const [setSearch, setSetSearch] = useState('');
  const [cardSearch, setCardSearch] = useState('');

  const [conditionType, setConditionType] = useState<'graded' | 'raw'>('raw');
  const [gradingCompany, setGradingCompany] = useState('RAW');
  const [gradeValue, setGradeValue] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [variant, setVariant] = useState('');
  const [notes, setNotes] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [saving, setSaving] = useState(false);

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

  async function openAddModal() {
    setShowAddModal(true);
    setAddStep('set');
    resetForm();

    try {
      const allSets = await getAllSets();
      setSets(allSets);
    } catch (error) {
      console.error('Error loading sets:', error);
      Alert.alert('Error', 'Failed to load sets');
    }
  }

  function resetForm() {
    setSelectedSet(null);
    setSelectedCard(null);
    setSetSearch('');
    setCardSearch('');
    setConditionType('raw');
    setGradingCompany('RAW');
    setGradeValue('');
    setCertNumber('');
    setVariant('');
    setNotes('');
    setPurchasePrice('');
  }

  async function selectSet(set: TcgSet) {
    setSelectedSet(set);
    setAddStep('card');

    try {
      const cardsInSet = await getCardsBySet(set.id);
      setCards(cardsInSet);
    } catch (error) {
      console.error('Error loading cards:', error);
      Alert.alert('Error', 'Failed to load cards');
    }
  }

  function selectCard(card: TcgCard) {
    setSelectedCard(card);
    setAddStep('details');
  }

  async function saveToCollection() {
    if (!user || !selectedCard) return;

    setSaving(true);
    try {
      await createCollectionItem({
        user_id: user.id,
        card_id: selectedCard.id,
        condition_type: conditionType,
        grading_company: conditionType === 'graded' ? (gradingCompany as any) : null,
        grade_value: gradeValue ? parseFloat(gradeValue) : null,
        cert_number: certNumber || null,
        variant: variant ? (variant as any) : null,
        notes: notes || null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
      });

      Alert.alert('Success', 'Card added to your collection!');
      setShowAddModal(false);
      loadCollection();
    } catch (error) {
      console.error('Error saving to collection:', error);
      Alert.alert('Error', 'Failed to add card to collection');
    } finally {
      setSaving(false);
    }
  }

  const filteredSets = sets.filter((s) => s.name.toLowerCase().includes(setSearch.toLowerCase()));
  const filteredCards = cards.filter((c) => c.name.toLowerCase().includes(cardSearch.toLowerCase()));

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
              <Text style={styles.emptyText}>Add your first card to start building your collection</Text>

              <TouchableOpacity style={styles.addButton} onPress={openAddModal} activeOpacity={0.8}>
                <Plus size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Card</Text>
              </TouchableOpacity>
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
            <View>
              <Text style={styles.title}>My Collection</Text>
              <Text style={styles.subtitle}>{items.length} items</Text>
            </View>
            <TouchableOpacity style={styles.addButtonHeader} onPress={openAddModal} activeOpacity={0.8}>
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
            {items.map((item) => (
              <TouchableOpacity key={item.id} style={styles.itemCard} activeOpacity={0.85}>
                <View style={styles.cardImageContainer}>
                  {item.cardImage ? (
                    <Image source={{ uri: item.cardImage }} style={styles.cardImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Text style={styles.placeholderText}>?</Text>
                    </View>
                  )}
                </View>

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

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {addStep === 'set' ? 'Select Set' : addStep === 'card' ? 'Select Card' : 'Card Details'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} activeOpacity={0.7}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {addStep === 'set' && (
              <View style={styles.modalContent}>
                <TextInput
                  value={setSearch}
                  onChangeText={setSetSearch}
                  placeholder="Search sets..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.searchInput}
                />
                <ScrollView style={styles.modalScroll}>
                  {filteredSets.map((set) => (
                    <TouchableOpacity
                      key={set.id}
                      style={styles.listItem}
                      onPress={() => selectSet(set)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.listItemTitle}>{set.name}</Text>
                      <Text style={styles.listItemSub}>{set.series}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {addStep === 'card' && (
              <View style={styles.modalContent}>
                <TouchableOpacity style={styles.backButton} onPress={() => setAddStep('set')} activeOpacity={0.7}>
                  <Text style={styles.backButtonText}>← Back to Sets</Text>
                </TouchableOpacity>

                <TextInput
                  value={cardSearch}
                  onChangeText={setCardSearch}
                  placeholder="Search cards..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.searchInput}
                />
                <ScrollView style={styles.modalScroll}>
                  {filteredCards.map((card) => (
                    <TouchableOpacity
                      key={card.id}
                      style={styles.cardListItem}
                      onPress={() => selectCard(card)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cardListImageContainer}>
                        {card.small_image_url ? (
                          <Image source={{ uri: card.small_image_url }} style={styles.cardListImage} resizeMode="contain" />
                        ) : (
                          <View style={styles.placeholderSmall}>
                            <Text style={styles.placeholderSmallText}>?</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.cardListInfo}>
                        <Text style={styles.listItemTitle}>{card.name}</Text>
                        <Text style={styles.listItemSub}>#{card.number} • {card.rarity}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {addStep === 'details' && (
              <View style={styles.modalContent}>
                <TouchableOpacity style={styles.backButton} onPress={() => setAddStep('card')} activeOpacity={0.7}>
                  <Text style={styles.backButtonText}>← Back to Cards</Text>
                </TouchableOpacity>

                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.formLabel}>Condition *</Text>
                  <View style={styles.segmentedControl}>
                    <TouchableOpacity
                      style={[styles.segment, conditionType === 'raw' && styles.segmentActive]}
                      onPress={() => setConditionType('raw')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.segmentText, conditionType === 'raw' && styles.segmentTextActive]}>Raw</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.segment, conditionType === 'graded' && styles.segmentActive]}
                      onPress={() => setConditionType('graded')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.segmentText, conditionType === 'graded' && styles.segmentTextActive]}>
                        Graded
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {conditionType === 'graded' && (
                    <>
                      <Text style={styles.formLabel}>Grading Company</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                        {GRADING_COMPANIES.map((gc) => (
                          <TouchableOpacity
                            key={gc.value}
                            style={[styles.chip, gradingCompany === gc.value && styles.chipActive]}
                            onPress={() => setGradingCompany(gc.value)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.chipText, gradingCompany === gc.value && styles.chipTextActive]}>
                              {gc.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <Text style={styles.formLabel}>Grade Value</Text>
                      <TextInput
                        value={gradeValue}
                        onChangeText={setGradeValue}
                        placeholder="e.g., 10"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        keyboardType="numeric"
                        style={styles.textInput}
                      />

                      <Text style={styles.formLabel}>Cert Number</Text>
                      <TextInput
                        value={certNumber}
                        onChangeText={setCertNumber}
                        placeholder="Certificate number"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        style={styles.textInput}
                      />
                    </>
                  )}

                  <Text style={styles.formLabel}>Variant</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {VARIANTS.map((v) => (
                      <TouchableOpacity
                        key={v.value}
                        style={[styles.chip, variant === v.value && styles.chipActive]}
                        onPress={() => setVariant(variant === v.value ? '' : v.value)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, variant === v.value && styles.chipTextActive]}>{v.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.formLabel}>Purchase Price ($)</Text>
                  <TextInput
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    placeholder="Optional"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    keyboardType="numeric"
                    style={styles.textInput}
                  />

                  <Text style={styles.formLabel}>Notes</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Optional notes"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    multiline
                    numberOfLines={3}
                    style={[styles.textInput, styles.textArea]}
                  />

                  <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={saveToCollection}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Add to Collection'}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  addButtonHeader: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DC0A2D',
    justifyContent: 'center',
    alignItems: 'center',
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
  cardImageContainer: {
    width: 80,
    height: 112,
    borderRadius: 4,
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: { width: '100%', height: '100%', borderRadius: 4 },
  placeholderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
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

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC0A2D',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalScroll: {
    flex: 1,
  },
  backButton: {
    paddingVertical: 12,
    marginBottom: 12,
  },
  backButtonText: {
    color: '#DC0A2D',
    fontSize: 16,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  listItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  listItemSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  cardListItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardListImageContainer: {
    width: 50,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    marginRight: 12,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardListImage: {
    width: '100%',
    height: '100%',
  },
  placeholderSmall: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderSmallText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  cardListInfo: {
    flex: 1,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#DC0A2D',
  },
  segmentText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#fff',
  },
  chipScroll: {
    marginBottom: 12,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipActive: {
    backgroundColor: '#DC0A2D',
    borderColor: '#DC0A2D',
  },
  chipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#DC0A2D',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
