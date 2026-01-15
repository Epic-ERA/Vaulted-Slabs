// app/index.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const SET_LOGOS = {
  'base-set': require('@/assets/images/base-set-logo-january-8th-1999.png'),
  jungle: require('@/assets/images/jungle-set-logo-june-15th-1999.png'),
  fossil: require('@/assets/images/fossil-set-logo-october-9th-1999.png'),
  'base-set-2': require('@/assets/images/base-set-2-logo-february-23rd-2000.png'),
  'team-rocket': require('@/assets/images/team-rocket-logo-april-23rd-2000.png'),
  'wizards-promos': require('@/assets/images/wizards-black-star-promos-logo-june-30th-1999.png'),
  'gym-heroes': require('@/assets/images/gym-heroes-logo-august-13th-2000.png'),
  'gym-challenge': require('@/assets/images/gym-challenge-logo-october-15th-2000.png'),
};

const CLASSIC_SETS = [
  { id: 'base1', name: 'Base Set', assetKey: 'base-set', releaseDate: 'Jan 1999' },
  { id: 'base2', name: 'Jungle', assetKey: 'jungle', releaseDate: 'Jun 1999' },
  { id: 'base3', name: 'Fossil', assetKey: 'fossil', releaseDate: 'Oct 1999' },
  { id: 'base4', name: 'Base Set 2', assetKey: 'base-set-2', releaseDate: 'Feb 2000' },
  { id: 'base5', name: 'Team Rocket', assetKey: 'team-rocket', releaseDate: 'Apr 2000' },
  { id: 'basep', name: 'Wizards Promos', assetKey: 'wizards-promos', releaseDate: 'Jul 1999' },
  { id: 'gym1', name: 'Gym Heroes', assetKey: 'gym-heroes', releaseDate: 'Aug 2000' },
  { id: 'gym2', name: 'Gym Challenge', assetKey: 'gym-challenge', releaseDate: 'Oct 2000' },
];

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');
const LOGO_IMAGE = require('@/assets/images/vaulted-slabs-logo.jpg');

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

  // ✅ Web-safe redirect guard: prevents infinite update depth loops.
  const redirectedRef = useRef(false);

  useEffect(() => {
    // If logged in, go straight into the app.
    // IMPORTANT: route to a REAL tab route (NOT /home).
    if (!loading && user && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace('/(app)/sets');
    }

    // If logged out again, allow future redirects after next login.
    if (!loading && !user) {
      redirectedRef.current = false;
    }
  }, [loading, user]);

  const isMobileLike = screenWidth < 700;

  const mobileWrapWidth = Math.min(screenWidth - 40, 420);
  const mobileWrapHeight = 180;
  const mobileScale = 1.9;

  const TILE_WIDTH = 160;
  const TILE_GAP = 16;
  const FIVE_TILE_WIDTH = TILE_WIDTH * 5 + TILE_GAP * 4;

  const webWrapWidth = Math.min(screenWidth - 40, FIVE_TILE_WIDTH * 1.6);
  const webWrapHeight = Math.round(webWrapWidth * 0.24);
  const webScale = 2.4;

  const logoWrapWidth = isMobileLike ? mobileWrapWidth : webWrapWidth;
  const logoWrapHeight = isMobileLike ? mobileWrapHeight : webWrapHeight;
  const logoScale = isMobileLike ? mobileScale : webScale;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC0A2D" />
      </View>
    );
  }

  // ✅ While redirecting a logged-in user, render a stable frame (no <Redirect/>).
  if (user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC0A2D" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
        <View style={styles.bgOverlay} />

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View
              style={[
                styles.logoWrap,
                {
                  width: logoWrapWidth,
                  height: logoWrapHeight,
                  paddingTop: isMobileLike ? 0 : 12,
                },
              ]}
            >
              <Image
                source={LOGO_IMAGE}
                style={[styles.logoImage, { transform: [{ scale: logoScale }] }]}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={styles.setsSection}>
            <View style={styles.setsGrid}>
              {CLASSIC_SETS.map((set) => (
                <TouchableOpacity
                  key={set.id}
                  style={styles.setTile}
                  onPress={() => router.push(`/(app)/sets/${set.id}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.setLogoContainer}>
                    {set.assetKey && SET_LOGOS[set.assetKey as keyof typeof SET_LOGOS] ? (
                      <Image
                        source={SET_LOGOS[set.assetKey as keyof typeof SET_LOGOS]}
                        style={styles.setLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.setLogoPlaceholder} />
                    )}
                  </View>
                  <Text style={styles.setName}>{set.name}</Text>
                  <Text style={styles.setDate}>{set.releaseDate}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.buttonPrimary} onPress={() => router.push('/(auth)/login')} activeOpacity={0.9}>
              <Text style={styles.buttonPrimaryText}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonSecondary} onPress={() => router.push('/(auth)/login')} activeOpacity={0.9}>
              <Text style={styles.buttonSecondaryText}>Create Account</Text>
            </TouchableOpacity>

            <Text style={styles.guestLink}>Continue as Guest (coming soon)</Text>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bg: { flex: 1, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },

  header: { alignItems: 'center', marginBottom: 28 },

  logoWrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },

  setsSection: { width: '100%', maxWidth: 1000, marginBottom: 40 },
  setsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },

  setTile: {
    width: 160,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  setLogoContainer: { width: 120, height: 80, marginBottom: 12, justifyContent: 'center', alignItems: 'center' },
  setLogo: { width: '100%', height: '100%' },
  setLogoPlaceholder: {
    width: 110,
    height: 70,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  setName: { fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 4 },
  setDate: { fontSize: 11, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  actionsSection: { width: '100%', maxWidth: 420, gap: 16 },
  buttonPrimary: {
    width: '100%',
    height: 56,
    backgroundColor: '#DC0A2D',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimaryText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  buttonSecondary: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DC0A2D',
  },
  buttonSecondaryText: { color: '#DC0A2D', fontSize: 18, fontWeight: 'bold' },
  guestLink: { fontSize: 16, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 8 },
});
