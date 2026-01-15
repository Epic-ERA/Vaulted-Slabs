// app/(app)/scan/index.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ImageBackground } from 'react-native';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');

export default function ScanScreen() {
  const [ready, setReady] = useState(false);

  function handleEnableCamera() {
    setReady(true);
    Alert.alert('Scan', 'Camera wiring is next. This page is ready for Expo Camera integration.');
  }

  function handleQuickAdd() {
    Alert.alert('Quick Add', 'Hook this button to your quick-add flow (manual entry, photo upload, etc.)');
  }

  return (
    <View style={styles.root}>
      <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
        <View style={styles.bgOverlay} />

        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Scan</Text>
            <Text style={styles.subtitle}>Camera / quick add</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Camera</Text>
            <Text style={styles.cardSub}>
              This is a placeholder screen so your 6-tab layout is complete.
              Next step is wiring Expo Camera + scanning (barcode/QR/label).
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleEnableCamera} activeOpacity={0.9}>
              <Text style={styles.primaryText}>{ready ? 'Camera Ready (Stub)' : 'Enable Camera (Stub)'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleQuickAdd} activeOpacity={0.9}>
              <Text style={styles.secondaryText}>Quick Add (Manual)</Text>
            </TouchableOpacity>
          </View>
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

  card: {
    margin: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cardSub: { color: 'rgba(255,255,255,0.75)', marginTop: 8, lineHeight: 20 },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: '#DC0A2D',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  secondaryBtn: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
