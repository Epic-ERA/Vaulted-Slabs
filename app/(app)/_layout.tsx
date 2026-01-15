// app/(app)/_layout.tsx
import React, { useEffect, useRef } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  ActivityIndicator,
  View,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');
const POKEBALL_ICON = require('@/assets/images/pokeball-icon.jpg');

function AppHeader() {
  const { user, signOut, isLoggingOut } = useAuth();

  const handleLogout = async () => {
    // ✅ ONLY sign out here.
    // The AppLayout effect is the single redirect point to "/".
    await signOut();
  };

  if (!user) return null;

  return (
    <View style={styles.appHeader}>
      <View style={styles.headerCenter}>
        <TouchableOpacity
          style={[styles.headerButton, styles.profileButton]}
          onPress={() => {
            // Use Expo Router's Link navigation
            const { router } = require('expo-router');
            router.push('/(app)/profile');
          }}
          activeOpacity={0.85}
          disabled={isLoggingOut}
        >
          <Text style={styles.headerButtonText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.headerButton, styles.logoutButton, isLoggingOut && styles.buttonDisabled]}
          onPress={handleLogout}
          activeOpacity={0.85}
          disabled={isLoggingOut}
        >
          <Text style={styles.headerButtonText}>{isLoggingOut ? 'Logging out...' : 'Log out'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { loading, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();

  // Track redirect state to prevent loops
  const hasRedirectedRef = useRef(false);
  const isRedirectingRef = useRef(false);

  // Handle auth-based navigation in useEffect to avoid render-phase issues
  useEffect(() => {
    // Skip during loading or if already redirecting
    if (loading || isRedirectingRef.current) return;

    // Check if we're currently in the (app) group
    const inAppGroup = segments[0] === '(app)';

    // If user logged out and we're in the app group, redirect once
    if (!user && inAppGroup && !hasRedirectedRef.current) {
      console.log('[ROUTING] User logged out, redirecting to home');
      hasRedirectedRef.current = true;
      isRedirectingRef.current = true;

      // Small delay to ensure auth state is settled
      setTimeout(() => {
        router.replace('/');
        // Reset after navigation completes
        setTimeout(() => {
          isRedirectingRef.current = false;
        }, 100);
      }, 50);
    }

    // Reset redirect flag when user logs back in
    if (user && hasRedirectedRef.current) {
      console.log('[ROUTING] User logged in, resetting redirect flag');
      hasRedirectedRef.current = false;
      isRedirectingRef.current = false;
    }
  }, [loading, user, segments, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC0A2D" />
      </View>
    );
  }

  // If not logged in, show loading while navigation happens
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC0A2D" />
      </View>
    );
  }

  console.log('[ROUTING] User authenticated, rendering app layout');

  const HEADER_HEIGHT = 50;
  const scenePaddingTop = insets.top + HEADER_HEIGHT + 10;
  const bottomInset = Platform.OS === 'ios' ? insets.bottom : 0;
  const TAB_BAR_HEIGHT = 78 + bottomInset;

  const renderIcon = (focused: boolean) => (
    <Image
      source={POKEBALL_ICON}
      style={focused ? styles.pokeballActive : styles.pokeballInactive}
      resizeMode="contain"
    />
  );

  return (
    <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
      <View style={styles.bgOverlay} />

      <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
        <AppHeader />
      </View>

      <Tabs
        initialRouteName="sets/index"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#DC0A2D',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.70)',
          tabBarLabelStyle: { fontSize: 12, fontWeight: '900' },
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: TAB_BAR_HEIGHT,
            paddingTop: 12,
            paddingBottom: 12 + bottomInset,
            backgroundColor: 'rgba(0,0,0,0.88)',
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.12)',
          },
          lazy: true,
        }}
      >
        {/* ✅ hide anything that tries to show as a tab */}
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="home/index" options={{ href: null }} />

        {/* ✅ VISIBLE TABS — EXACTLY: Analytics, Collection, Scan, Search, Sets */}
        <Tabs.Screen
          name="analytics/index"
          options={{ title: 'Analytics', tabBarIcon: ({ focused }) => renderIcon(focused) }}
        />
        <Tabs.Screen
          name="collection/index"
          options={{ title: 'Collection', tabBarIcon: ({ focused }) => renderIcon(focused) }}
        />
        <Tabs.Screen
          name="scan/index"
          options={{ title: 'Scan', tabBarIcon: ({ focused }) => renderIcon(focused) }}
        />
        <Tabs.Screen
          name="search/index"
          options={{ title: 'Search', tabBarIcon: ({ focused }) => renderIcon(focused) }}
        />
        <Tabs.Screen
          name="sets/index"
          options={{ title: 'Sets', tabBarIcon: ({ focused }) => renderIcon(focused) }}
        />

        {/* hidden routes */}
        <Tabs.Screen name="profile/index" options={{ href: null }} />
        <Tabs.Screen name="admin/index" options={{ href: null }} />
        <Tabs.Screen name="sets/[setId]" options={{ href: null }} />
      </Tabs>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },

  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },

  appHeader: {
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
  },

  headerCenter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },

  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  profileButton: { backgroundColor: '#1D4ED8' },
  logoutButton: { backgroundColor: '#DC0A2D' },
  buttonDisabled: { opacity: 0.5 },

  headerButtonText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  pokeballActive: { width: 80, height: 80, opacity: 1 },
  pokeballInactive: { width: 68, height: 68, opacity: 0.85 },
});
