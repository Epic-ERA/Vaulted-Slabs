// components/collection/add-card-modal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { getAllSets } from '@/services/sets';
import { getCardsBySet } from '@/services/cards';
import { createCollectionItem } from '@/services/collection';
import { GRADING_COMPANIES, VARIANTS } from '@/lib/constants';
import type { Database } from '@/types/database';

type TcgSet = Database['public']['Tables']['tcg_sets']['Row'];
type TcgCard = Database['public']['Tables']['tcg_cards']['Row'];

type Step = 'set' | 'card' | 'details';

type Props = {
  visible: boolean;
  userId: string | null | undefined;
  onClose: () => void;
  onSaved: () => void; // call to refresh list
};

export default function AddCardModal({ visible, userId, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>('set');
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
  const [loadingSets, setLoadingSets] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  function resetAll() {
    setStep('set');
    setSets([]);
    setCards([]);
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
    setSaving(false);
    setLoadingSets(false);
    setLoadingCards(false);
  }

  // Load sets when opened
  useEffect(() => {
    if (!visible) return;
    resetAll();

    (async () => {
      try {
        setLoadingSets(true);
        const allSets = await getAllSets();
        setSets(allSets ?? []);
      } catch (e: any) {
        console.error('AddCardModal getAllSets error:', e);
        Alert.alert('Error', e?.message ?? 'Failed to load sets');
      } finally {
        setLoadingSets(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filteredSets = useMemo(() => {
    const q = setSearch.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter((s) => (s.name ?? '').toLowerCase().includes(q));
  }, [sets, setSearch]);

  const filteredCards = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => (c.name ?? '').toLowerCase().includes(q));
  }, [cards, cardSearch]);

  async function handleSelectSet(s: TcgSet) {
    setSelectedSet(s);
    setSelectedCard(null);
    setCards([]);
    setCardSearch('');
    setStep('card');

    try {
      setLoadingCards(true);
      const cardsInSet = await getCardsBySet(s.id);
      setCards(cardsInSet ?? []);
    } catch (e: any) {
      console.error('AddCardModal getCardsBySet error:', e);
      Alert.alert('Error', e?.message ?? 'Failed to load cards');
      setStep('set');
    } finally {
      setLoadingCards(false);
    }
  }

  function handleSelectCard(c: TcgCard) {
    setSelectedCard(c);
    setStep('details');
  }

  function validate() {
    if (!userId) return 'You must be logged in.';
    if (!selectedCard) return 'Please select a card.';

    if (conditionType === 'graded') {
      const gv = gradeValue.trim();
      if (!gv) return 'Grade value is required for graded cards.';
      const parsed = Number(gv);
      if (!Number.isFinite(parsed)) return 'Grade value must be a number.';
      if (parsed < 0 || parsed > 10) return 'Grade value must be between 0 and 10.';
      // cert optional, but strongly recommended:
      // if (!certNumber.trim()) return 'Cert number is required for graded cards.';
    }

    const pp = purchasePrice.trim();
    if (pp) {
      const parsed = Number(pp);
      if (!Number.isFinite(parsed)) return 'Purchase price must be a number.';
      if (parsed < 0) return 'Purchase price cannot be negative.';
    }

    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) {
      Alert.alert('Fix Required', err);
      return;
    }
    if (!userId || !selectedCard) return;

    setSaving(true);
    try {
      await createCollectionItem({
        user_id: userId,
        card_id: selectedCard.id,

        condition_type: conditionType,

        grading_company: conditionType === 'graded' ? (gradingCompany as any) : null,
        grade_value: conditionType === 'graded' ? Number(gradeValue) : null,
        grade_label: conditionType === 'graded' ? gradeValue.trim() : null,

        cert_number: conditionType === 'graded' ? (certNumber.trim() || null) : null,

        variant: variant ? (variant as any) : null,
        notes: notes.trim() || null,
        purchase_price: purchasePrice.trim() ? Number(purchasePrice) : null,
      });

      Alert.alert('Success', 'Card added to your collection!');
      onClose();
      onSaved();
    } catch (e: any) {
      console.error('AddCardModal createCollectionItem error:', e);

      // common RLS/schema errors
      const msg =
        e?.message ||
        e?.error_description ||
        'Failed to add card. Check Supabase table + RLS policies.';

      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  const title =
    step === 'set' ? 'Select Set' : step === 'card' ? 'Select Card' : 'Card Details';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.kb}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {step === 'set' && (
              <View style={styles.body}>
                <TextInput
                  value={setSearch}
                  onChangeText={setSetSearch}
                  placeholder="Search sets..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.search}
                />

                <ScrollView style={styles.scroll}>
                  {loadingSets ? (
                    <Text style={styles.helperText}>Loading sets…</Text>
                  ) : filteredSets.length === 0 ? (
                    <Text style={styles.helperText}>No sets found.</Text>
                  ) : (
                    filteredSets.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.listItem}
                        onPress={() => handleSelectSet(s)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.listTitle}>{s.name}</Text>
                        <Text style={styles.listSub}>{s.series}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            )}

            {step === 'card' && (
              <View style={styles.body}>
                <TouchableOpacity
                  style={styles.back}
                  onPress={() => setStep('set')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.backText}>← Back to Sets</Text>
                </TouchableOpacity>

                <TextInput
                  value={cardSearch}
                  onChangeText={setCardSearch}
                  placeholder="Search cards..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.search}
                />

                <ScrollView style={styles.scroll}>
                  {loadingCards ? (
                    <Text style={styles.helperText}>Loading cards…</Text>
                  ) : filteredCards.length === 0 ? (
                    <Text style={styles.helperText}>No cards found for this set.</Text>
                  ) : (
                    filteredCards.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.cardRow}
                        onPress={() => handleSelectCard(c)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.thumb}>
                          {c.small_image_url ? (
                            <Image
                              source={{ uri: c.small_image_url }}
                              style={styles.thumbImg}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.thumbPh}>
                              <Text style={styles.thumbPhText}>?</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.cardRowInfo}>
                          <Text style={styles.listTitle}>{c.name}</Text>
                          <Text style={styles.listSub}>
                            #{c.number} • {c.rarity}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            )}

            {step === 'details' && (
              <View style={styles.body}>
                <TouchableOpacity
                  style={styles.back}
                  onPress={() => setStep('card')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.backText}>← Back to Cards</Text>
                </TouchableOpacity>

                <ScrollView style={styles.scroll}>
                  <View style={styles.summary}>
                    <Text style={styles.summaryTitle}>{selectedCard?.name ?? 'Selected Card'}</Text>
                    <Text style={styles.summarySub}>
                      {selectedSet?.name ? `${selectedSet.name} • ` : ''}#{selectedCard?.number ?? ''}
                    </Text>
                  </View>

                  <Text style={styles.label}>Condition *</Text>
                  <View style={styles.segmentWrap}>
                    <TouchableOpacity
                      style={[styles.segment, conditionType === 'raw' && styles.segmentActive]}
                      onPress={() => setConditionType('raw')}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.segmentText, conditionType === 'raw' && styles.segmentTextActive]}>
                        Raw
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.segment, conditionType === 'graded' && styles.segmentActive]}
                      onPress={() => setConditionType('graded')}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.segmentText, conditionType === 'graded' && styles.segmentTextActive]}>
                        Graded
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {conditionType === 'graded' && (
                    <>
                      <Text style={styles.label}>Grading Company</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                        {GRADING_COMPANIES.map((gc: any) => (
                          <TouchableOpacity
                            key={gc.value}
                            style={[styles.chip, gradingCompany === gc.value && styles.chipActive]}
                            onPress={() => setGradingCompany(gc.value)}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.chipText, gradingCompany === gc.value && styles.chipTextActive]}>
                              {gc.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <Text style={styles.label}>Grade Value *</Text>
                      <TextInput
                        value={gradeValue}
                        onChangeText={setGradeValue}
                        placeholder="e.g., 10"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        keyboardType="numeric"
                        style={styles.input}
                      />

                      <Text style={styles.label}>Cert Number</Text>
                      <TextInput
                        value={certNumber}
                        onChangeText={setCertNumber}
                        placeholder="Optional"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        style={styles.input}
                      />
                    </>
                  )}

                  <Text style={styles.label}>Variant</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                    {VARIANTS.map((v: any) => (
                      <TouchableOpacity
                        key={v.value}
                        style={[styles.chip, variant === v.value && styles.chipActive]}
                        onPress={() => setVariant(variant === v.value ? '' : v.value)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.chipText, variant === v.value && styles.chipTextActive]}>
                          {v.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.label}>Purchase Price ($)</Text>
                  <TextInput
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    placeholder="Optional"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    keyboardType="numeric"
                    style={styles.input}
                  />

                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Optional notes"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    multiline
                    numberOfLines={3}
                    style={[styles.input, styles.textArea]}
                  />

                  <TouchableOpacity
                    style={[styles.save, saving && styles.saveDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.9}
                  >
                    <Plus size={18} color="#fff" />
                    <Text style={styles.saveText}>{saving ? 'Saving…' : 'Add to Collection'}</Text>
                  </TouchableOpacity>

                  <View style={{ height: 30 }} />
                </ScrollView>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  kb: { width: '100%' },

  sheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '85%' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },

  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  scroll: { flex: 1 },

  back: { paddingVertical: 10, marginBottom: 10 },
  backText: { color: '#DC0A2D', fontSize: 16, fontWeight: '700' },

  search: {
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

  helperText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, paddingVertical: 12 },

  listItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  listTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  listSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  cardRow: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  thumb: {
    width: 50,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    marginRight: 12,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPh: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbPhText: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },
  cardRowInfo: { flex: 1 },

  summary: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 10,
  },
  summaryTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  summarySub: { color: 'rgba(255,255,255,0.75)', marginTop: 6, fontSize: 13 },

  label: { fontSize: 15, fontWeight: '600', color: '#fff', marginTop: 16, marginBottom: 8 },

  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 10,
  },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  segmentActive: { backgroundColor: '#DC0A2D' },
  segmentText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '700' },
  segmentTextActive: { color: '#fff' },

  chipsRow: { marginBottom: 8 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipActive: { backgroundColor: '#DC0A2D', borderColor: '#DC0A2D' },
  chipText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  input: {
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
  textArea: { height: 80, textAlignVertical: 'top' },

  save: {
    marginTop: 14,
    backgroundColor: '#DC0A2D',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
