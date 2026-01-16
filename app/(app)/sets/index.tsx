// app/(app)/sets/index.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { router } from 'expo-router';
import { getAllSets } from '@/services/sets';
import { STARTER_SETS, SET_LOGO_ASSETS } from '@/lib/constants';
import type { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');

type TcgSet = Database['public']['Tables']['tcg_sets']['Row'];

export default function SetsScreen() {
  const { isAdmin } = useAuth();
  const [sets, setSets] = useState<TcgSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSets() {
    try {
      const allSets = await getAllSets();
      const starterSetIds = STARTER_SETS.map((s) => s.id);
      const filtered = allSets.filter((set) => starterSetIds.includes(set.id));

      const ordered = starterSetIds
        .map((id) => filtered.find((set) => set.id === id))
        .filter((set): set is TcgSet => set !== undefined);

      setSets(ordered);
    } catch (error) {
      console.error('Error loading sets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadSets();
    setRefreshing(false);
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

  if (sets.length === 0) {
    return (
      <View style={styles.root}>
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
          <View style={styles.bgOverlay} />

          {isAdmin && (
            <View style={styles.topButtonContainer}>
              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => router.push('/(app)/admin')}
                activeOpacity={0.8}
              >
                <Text style={styles.adminButtonText}>Admin Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Pokémon Sets</Text>
              <Text style={styles.subtitle}>Browse your collection by set</Text>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.emptyContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC0A2D" />}
            >
              <Text style={styles.emptyTitle}>No Sets Available</Text>
              <Text style={styles.emptyText}>Data not synced yet. Admin must run Starter Sync.</Text>

              {isAdmin && (
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={() => router.push('/(app)/admin?tab=sync')}
                  activeOpacity={0.9}
                >
                  <Text style={styles.syncButtonText}>Go to Sync</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
        <View style={styles.bgOverlay} />

        {isAdmin && (
          <View style={styles.topButtonContainer}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/(app)/admin')}
              activeOpacity={0.8}
            >
              <Text style={styles.adminButtonText}>Admin Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Pokémon TCG Sets</Text>
            <Text style={styles.subtitle}>Browse your collection by set</Text>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC0A2D" />}
          >
            <View style={styles.grid}>
              {sets.map((set) => {
              const starterInfo = STARTER_SETS.find((s) => s.id === set.id);
              const assetKey = starterInfo?.assetKey;
              const logoAsset = assetKey ? SET_LOGO_ASSETS[assetKey] : null;
              const remoteLogoUrl = set.logo_url || set.symbol_url;

              return (
                <TouchableOpacity
                  key={set.id}
                  style={styles.setCard}
                  onPress={() => router.push(`/(app)/sets/${set.id}`)}
                  activeOpacity={0.85}
                >
                  <View style={styles.logoContainer}>
                    <View style={styles.logoBackground}>
                      {logoAsset ? (
                        <Image source={logoAsset} style={styles.logo} resizeMode="contain" />
                      ) : remoteLogoUrl ? (
                        <Image source={{ uri: remoteLogoUrl }} style={styles.logo} resizeMode="contain" />
                      ) : (
                        <View style={styles.placeholderLogo}>
                          <Text style={styles.placeholderText}>{set.name[0]}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.setInfo}>
                    <Text style={styles.setName}>{set.name}</Text>
                    <Text style={styles.setDetails}>
                      {set.series} • {set.total || '?'} cards
                    </Text>
                    <Text style={styles.releaseDate}>
                      {set.release_date ? new Date(set.release_date).toLocaleDateString() : 'Unknown'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            </View>
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

  container: { flex: 1, backgroundColor: 'transparent', paddingTop: 130 },
  content: { flex: 1, paddingHorizontal: 16 },
  contentContainer: { paddingTop: 6, paddingBottom: 140 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },

  topButtonContainer: {
    position: 'absolute',
    top: 74,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
  },
  adminButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(29, 78, 216, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 6 },

  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, paddingBottom: 140 },
  emptyTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8, color: '#fff', textAlign: 'center' },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 20 },
  syncButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#DC0A2D', borderRadius: 10 },
  syncButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  grid: {},
  setCard: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  logoContainer: { width: 80, height: 80, marginRight: 16, justifyContent: 'center', alignItems: 'center' },
  logoBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  logo: { width: '100%', height: '100%' },

  placeholderLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  placeholderText: { fontSize: 32, fontWeight: '900', color: 'rgba(255,255,255,0.55)' },

  setInfo: { flex: 1 },
  setName: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 4 },
  setDetails: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  releaseDate: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
});
