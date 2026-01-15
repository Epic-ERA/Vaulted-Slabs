// app/(app)/_layout.tsx
import React, { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
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
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();

  const handleLogout = async () => {
    // ✅ ONLY sign out here.
    // The AppLayout effect is the single redirect point to "/".
    await signOut();
  };

  if (!user) return null;

  return (
    <View style={styles.appHeader}>
      <View style={styles.headerCenter}>
        {isAdmin ? (
          <TouchableOpacity
            style={[styles.headerButton, styles.adminButton]}
            onPress={() => router.push('/(app)/admin')}
            activeOpacity={0.85}
          >
            <Text style={styles.headerButtonText}>Admin</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.headerButton, styles.profileButton]}
          onPress={() => router.push('/(app)/profile')}
          activeOpacity={0.85}
        >
          <Text style={styles.headerButtonText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.headerButton, styles.logoutButton]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.headerButtonText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const router = useRouter();
  const { loading, user } = useAuth();
  const insets = useSafeAreaInsets();

  // ✅ Avoid repeated replace() calls
  const kickedOutRef = useRef(false);

  useEffect(() => {
    if (!loading && !user && !kickedOutRef.current) {
      kickedOutRef.current = true;
      router.replace('/');
    }
    if (!loading && user) {
      kickedOutRef.current = false;
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC0A2D" />
      </View>
    );
  }

  if (!user) {
    // ✅ Stable frame while navigation happens
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC0A2D" />
      </View>
    );
  }

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
  adminButton: { backgroundColor: 'rgba(255,255,255,0.08)' },

  headerButtonText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  pokeballActive: { width: 80, height: 80, opacity: 1 },
  pokeballInactive: { width: 68, height: 68, opacity: 0.85 },
});
