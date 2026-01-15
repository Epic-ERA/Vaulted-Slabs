// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      {/* ✅ CRITICAL: Keep the root navigator tree STABLE.
          DO NOT conditionally render different Stack trees based on auth state.
          That pattern is what causes the maximum update depth loop on web. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="+not-found" />
      </Stack>

      <StatusBar style="auto" />
    </AuthProvider>
  );
}
