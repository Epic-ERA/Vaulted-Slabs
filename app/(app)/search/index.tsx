// app/(app)/search/index.tsx
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');

type QuickResult = {
  id: string;
  title: string;
  subtitle: string;
};

export default function SearchScreen() {
  const [q, setQ] = useState('');

  const results = useMemo<QuickResult[]>(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return [
      { id: '1', title: 'Base Set', subtitle: 'Set • Jan 1999' },
      { id: '2', title: 'Charizard', subtitle: 'Card • Example result' },
      { id: '3', title: 'Team Rocket', subtitle: 'Set • Apr 2000' },
    ].filter((r) => `${r.title} ${r.subtitle}`.toLowerCase().includes(query));
  }, [q]);

  return (
    <View style={styles.root}>
      <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
        <View style={styles.bgOverlay} />

        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Search</Text>
            <Text style={styles.subtitle}>Find sets and cards fast</Text>
          </View>

          <View style={styles.searchWrap}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search sets, cards, PSA cert #..."
              placeholderTextColor="rgba(255,255,255,0.55)"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {!q.trim() ? (
              <Text style={styles.muted}>Type to search…</Text>
            ) : results.length === 0 ? (
              <Text style={styles.muted}>No results for “{q.trim()}”.</Text>
            ) : (
              results.map((r) => (
                <TouchableOpacity key={r.id} style={styles.resultCard} activeOpacity={0.85}>
                  <Text style={styles.resultTitle}>{r.title}</Text>
                  <Text style={styles.resultSub}>{r.subtitle}</Text>
                </TouchableOpacity>
              ))
            )}
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
  input: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },

  content: { padding: 16, paddingBottom: 140 },
  muted: { color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' },

  resultCard: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  resultTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  resultSub: { color: 'rgba(255,255,255,0.75)', marginTop: 4, fontSize: 13 },
});
