// app/(app)/analytics/index.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getAllSetCompletions, getGradingBreakdown } from '@/services/analytics';
import { getCollectionItems } from '@/services/collection';
import type { SetCompletion, GradingBreakdown } from '@/services/analytics';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');

export default function AnalyticsScreen() {
  const { user, isAdmin } = useAuth();
  const [completions, setCompletions] = useState<SetCompletion[]>([]);
  const [gradingData, setGradingData] = useState<GradingBreakdown[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadAnalytics() {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [completionData, items] = await Promise.all([
        getAllSetCompletions(user.id),
        getCollectionItems(user.id),
      ]);

      setCompletions(completionData);
      setGradingData(getGradingBreakdown(items));

      const totalEstimated = completionData.reduce((sum, set) => sum + set.estimatedValue, 0);
      setTotalValue(totalEstimated);
    } catch (error) {
      console.error('Error loading analytics:', error);
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

  return (
    <View style={styles.root}>
      <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
        <View style={styles.bgOverlay} />

        <View style={styles.container}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/(app)/admin')}
              activeOpacity={0.8}
            >
              <Text style={styles.adminButtonText}>Admin Dashboard</Text>
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>Collection insights and value</Text>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
            <View style={styles.card}>
              <Text style={[styles.cardTitle, styles.centerText]}>Total Estimated Value</Text>
              <Text style={[styles.valueText, styles.centerText]}>${totalValue.toFixed(2)}</Text>
              <Text style={[styles.valueNote, styles.centerText]}>Based on admin pricing data</Text>
            </View>

            <View style={styles.card}>
              <Text style={[styles.cardTitle, styles.centerText]}>Set Completion</Text>
              {completions.length === 0 ? (
                <Text style={[styles.emptyText, styles.centerText]}>No sets in collection yet</Text>
              ) : (
                completions.map((set) => (
                  <View key={set.setId} style={styles.setItem}>
                    <Text style={[styles.setName, styles.centerText]}>{set.setName}</Text>

                    {/* keep bar full width, but center it */}
                    <View style={styles.progressBarWrap}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${set.completionPercent}%` }]} />
                      </View>
                    </View>

                    {/* center these */}
                    <View style={styles.setStatsCentered}>
                      <Text style={[styles.statText, styles.centerText]}>
                        {set.ownedCards}/{set.totalCards} unique cards
                      </Text>
                      <Text style={[styles.statText, styles.centerText]}>
                        {set.completionPercent.toFixed(1)}%
                      </Text>
                    </View>

                    <Text style={[styles.setValue, styles.centerText]}>
                      Est. ${set.estimatedValue.toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={[styles.cardTitle, styles.centerText]}>Grading Breakdown</Text>
              {gradingData.length === 0 ? (
                <Text style={[styles.emptyText, styles.centerText]}>No graded cards yet</Text>
              ) : (
                gradingData.map((item) => (
                  <View key={item.company} style={styles.breakdownItemCentered}>
                    <Text style={[styles.breakdownLabel, styles.centerText]}>{item.company}</Text>
                    <Text style={[styles.breakdownValue, styles.centerText]}>{item.count}</Text>
                  </View>
                ))
              )}
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

  container: { flex: 1, backgroundColor: 'transparent' },

  adminButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(29, 78, 216, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 78,
    marginBottom: 12,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ✅ prevents title being covered by the top header (email/logout)
  header: { padding: 20, paddingTop: 14, paddingBottom: 14, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.80)', textAlign: 'center', marginTop: 6 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },

  content: { flex: 1, paddingHorizontal: 16 },
  contentPad: { paddingTop: 16, paddingBottom: 140 },

  card: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  // ✅ shared helper
  centerText: { textAlign: 'center' },

  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },

  valueText: { fontSize: 32, fontWeight: 'bold', color: '#34c759', marginBottom: 4 },
  valueNote: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },

  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic' },

  setItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  setName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 8 },

  // ✅ keep bar width but center it within the card
  progressBarWrap: { alignItems: 'center' },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: '#DC0A2D', borderRadius: 4 },

  // ✅ stacked + centered instead of spaced-left/right
  setStatsCentered: { alignItems: 'center', gap: 4, marginBottom: 4 },
  statText: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },

  setValue: { fontSize: 16, fontWeight: '800', color: '#34c759', marginTop: 6 },

  // ✅ centered breakdown rows
  breakdownItemCentered: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  breakdownLabel: { fontSize: 16, color: '#fff' },
  breakdownValue: { fontSize: 16, fontWeight: '600', color: '#DC0A2D', marginTop: 4 },
});
