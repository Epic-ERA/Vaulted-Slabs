// app/(app)/search/index.tsx
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { searchCards } from '@/services/cards';
import { lookupPSACert, type PSACertData } from '@/services/psa';
import type { Database } from '@/types/database';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');

type TcgCard = Database['public']['Tables']['tcg_cards']['Row'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'cards' | 'psa'>('cards');
  const [cardResults, setCardResults] = useState<TcgCard[]>([]);
  const [psaResult, setPsaResult] = useState<PSACertData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setCardResults([]);
    setPsaResult(null);

    try {
      if (searchMode === 'cards') {
        const results = await searchCards(query.trim());
        setCardResults(results);
      } else {
        const certNumber = query.trim();
        if (!/^\d+$/.test(certNumber)) {
          setError('Please enter a valid PSA cert number (numbers only)');
          return;
        }
        const result = await lookupPSACert(certNumber);
        if (result) {
          setPsaResult(result);
        } else {
          setError('PSA cert not found. Please check the number and try again.');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(searchMode === 'cards' ? 'Error searching cards' : 'Error looking up PSA cert');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
        <View style={styles.bgOverlay} />

        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Search</Text>
            <Text style={styles.subtitle}>Find cards or lookup PSA certs</Text>
          </View>

          <View style={styles.searchWrap}>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segment, searchMode === 'cards' && styles.segmentActive]}
                onPress={() => {
                  setSearchMode('cards');
                  setCardResults([]);
                  setPsaResult(null);
                  setError(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentText, searchMode === 'cards' && styles.segmentTextActive]}>
                  Cards
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, searchMode === 'psa' && styles.segmentActive]}
                onPress={() => {
                  setSearchMode('psa');
                  setCardResults([]);
                  setPsaResult(null);
                  setError(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentText, searchMode === 'psa' && styles.segmentTextActive]}>
                  PSA Cert
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchMode === 'cards' ? 'Search cards...' : 'Enter PSA cert number...'}
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                keyboardType={searchMode === 'psa' ? 'numeric' : 'default'}
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch} activeOpacity={0.8}>
                <Text style={styles.searchButtonText}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#DC0A2D" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : searchMode === 'cards' && cardResults.length > 0 ? (
              cardResults.map((card) => (
                <TouchableOpacity key={card.id} style={styles.resultCard} activeOpacity={0.85}>
                  <View style={styles.cardImageContainer}>
                    {card.small_image_url ? (
                      <Image
                        source={{ uri: card.small_image_url }}
                        style={styles.cardResultImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Text style={styles.placeholderText}>?</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.resultTitle}>{card.name}</Text>
                    <Text style={styles.resultSub}>
                      #{card.number} • {card.rarity || 'Unknown'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : searchMode === 'psa' && psaResult ? (
              <View style={styles.psaResultContainer}>
                <Text style={styles.psaTitle}>PSA Cert #{psaResult.PSACert.CertNumber}</Text>

                {psaResult.PSACert.FrontImageURL && (
                  <View style={styles.psaImageContainer}>
                    <Image
                      source={{ uri: psaResult.PSACert.FrontImageURL }}
                      style={styles.psaImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                <View style={styles.psaInfoCard}>
                  <View style={styles.psaRow}>
                    <Text style={styles.psaLabel}>Grade:</Text>
                    <Text style={styles.psaValue}>{psaResult.PSACert.CardGrade}</Text>
                  </View>
                  <View style={styles.psaRow}>
                    <Text style={styles.psaLabel}>Label:</Text>
                    <Text style={styles.psaValue}>{psaResult.PSACert.CardLabel}</Text>
                  </View>
                  <View style={styles.psaRow}>
                    <Text style={styles.psaLabel}>Card:</Text>
                    <Text style={styles.psaValue}>{psaResult.PSACert.CardName}</Text>
                  </View>
                  {psaResult.PSACert.Year && (
                    <View style={styles.psaRow}>
                      <Text style={styles.psaLabel}>Year:</Text>
                      <Text style={styles.psaValue}>{psaResult.PSACert.Year}</Text>
                    </View>
                  )}
                  {psaResult.PSACert.Brand && (
                    <View style={styles.psaRow}>
                      <Text style={styles.psaLabel}>Brand:</Text>
                      <Text style={styles.psaValue}>{psaResult.PSACert.Brand}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.addToCollectionButton}
                  onPress={() => Alert.alert('Add to Collection', 'This will pre-fill the add card form')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addToCollectionText}>Add to Collection</Text>
                </TouchableOpacity>
              </View>
            ) : !query.trim() ? (
              <Text style={styles.muted}>
                {searchMode === 'cards' ? 'Type to search cards...' : 'Enter a PSA cert number to lookup...'}
              </Text>
            ) : null}
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

  header: { paddingHorizontal: 20, paddingTop: 78, paddingBottom: 14, alignItems: 'center' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.75)', marginTop: 6, fontSize: 14, textAlign: 'center' },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },

  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
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

  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#DC0A2D',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  content: { padding: 16, paddingBottom: 140 },
  muted: { color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },

  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 12,
    fontSize: 16,
  },

  errorContainer: {
    backgroundColor: 'rgba(220, 10, 45, 0.2)',
    borderWidth: 1,
    borderColor: '#DC0A2D',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  errorText: {
    color: '#DC0A2D',
    fontSize: 15,
    textAlign: 'center',
  },

  resultCard: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImageContainer: {
    width: 60,
    height: 84,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    marginRight: 12,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardResultImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
  },
  cardInfo: {
    flex: 1,
  },
  resultTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  resultSub: { color: 'rgba(255,255,255,0.75)', marginTop: 4, fontSize: 13 },

  psaResultContainer: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  psaTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  psaImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 16,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  psaImage: {
    width: '100%',
    height: '100%',
  },
  psaInfoCard: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  psaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  psaLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  psaValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '800',
  },
  addToCollectionButton: {
    backgroundColor: '#DC0A2D',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addToCollectionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
