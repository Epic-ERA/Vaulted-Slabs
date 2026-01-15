// app/(app)/profile/index.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');

// ✅ Prevent content being hidden behind bottom tab bar (web + mobile)
const TAB_BAR_GUARD_PX = 120;

type ProfileRow = {
  id: string;
  email: string | null;

  full_name: string | null;
  display_name: string | null;
  username: string | null;

  favorite_pokemon: string | null;
  collecting_focus: string | null;

  // New structured location (we’ll add these columns in SQL next)
  country: string | null;
  region: string | null; // state / province / area
  city: string | null;

  updated_at: string | null;
  created_at: string | null;
};

// ---------------------------
// Simple universal dropdown (no extra deps)
// ---------------------------
function SelectField({
  label,
  value,
  placeholder,
  disabled,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const display = value?.trim() ? value : placeholder;

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => !disabled && setOpen(true)}
        style={[styles.select, disabled && { opacity: 0.55 }]}
        disabled={disabled}
      >
        <Text style={[styles.selectText, !value ? styles.selectPlaceholder : null]} numberOfLines={1}>
          {display}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.modalCloseBtn} activeOpacity={0.9}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.9}
                onPress={() => {
                  onSelect(item);
                  setOpen(false);
                }}
              >
                <Text style={styles.optionText}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ padding: 14 }}>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '800' }}>No options available</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------
// Countries/States/Cities API (global lists)
// Uses countriesnow.space (free public dataset API)
// ---------------------------
async function postJSON(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
async function getJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, displayName, signOut, isAdmin } = useAuth();

  const isSignedIn = !!user?.id;

  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Editable profile fields
  const [fullName, setFullName] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [username, setUsername] = useState('');
  const [favoritePokemon, setFavoritePokemon] = useState('');
  const [collectingFocus, setCollectingFocus] = useState('');

  // Structured location
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');

  // Dropdown options
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  // Account fields
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const currentEmail = useMemo(() => user?.email ?? '', [user?.email]);

  // Load Countries (global)
  useEffect(() => {
    let mounted = true;

    async function loadCountries() {
      try {
        setGeoLoading(true);
        // Returns: { error: false, msg: "...", data: ["Afghanistan", ...] }
        const j = await getJSON('https://countriesnow.space/api/v0.1/countries/iso');
        // Fallback if response shape changes
        const list =
          Array.isArray(j?.data) ? j.data.map((x: any) => x?.name).filter(Boolean) : [];
        if (!mounted) return;
        setCountryOptions(list.length ? list : []);
      } catch {
        // If API blocked/offline, keep empty (UI still works)
        if (!mounted) return;
        setCountryOptions([]);
      } finally {
        if (mounted) setGeoLoading(false);
      }
    }

    loadCountries();
    return () => {
      mounted = false;
    };
  }, []);

  // Load States/Regions when country changes
  useEffect(() => {
    let mounted = true;

    async function loadRegions() {
      if (!country) {
        setRegionOptions([]);
        setCityOptions([]);
        return;
      }

      try {
        setGeoLoading(true);
        // { data: { name: "United States", states: [{ name: "Arizona" }, ...] } }
        const j = await postJSON('https://countriesnow.space/api/v0.1/countries/states', {
          country,
        });
        const states = Array.isArray(j?.data?.states) ? j.data.states.map((s: any) => s?.name).filter(Boolean) : [];
        if (!mounted) return;
        setRegionOptions(states);
        setCityOptions([]);
      } catch {
        if (!mounted) return;
        setRegionOptions([]);
        setCityOptions([]);
      } finally {
        if (mounted) setGeoLoading(false);
      }
    }

    // reset dependent selections
    setRegion('');
    setCity('');
    loadRegions();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  // Load Cities when region changes
  useEffect(() => {
    let mounted = true;

    async function loadCities() {
      if (!country || !region) {
        setCityOptions([]);
        return;
      }

      try {
        setGeoLoading(true);
        // { data: ["Phoenix", ...] }
        const j = await postJSON('https://countriesnow.space/api/v0.1/countries/state/cities', {
          country,
          state: region,
        });
        const cities = Array.isArray(j?.data) ? j.data.filter(Boolean) : [];
        if (!mounted) return;
        setCityOptions(cities);
      } catch {
        if (!mounted) return;
        setCityOptions([]);
      } finally {
        if (mounted) setGeoLoading(false);
      }
    }

    // reset dependent selection
    setCity('');
    loadCities();

    return () => {
      mounted = false;
    };
  }, [country, region]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!isSignedIn) {
        setInitialLoad(false);
        return;
      }

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user!.id)
          .maybeSingle();

        if (error) throw error;

        const row = (data as ProfileRow | null) ?? null;
        if (!mounted) return;

        setFullName(row?.full_name ?? '');
        setDisplayNameInput(row?.display_name ?? (displayName ?? ''));
        setUsername(row?.username ?? '');
        setFavoritePokemon(row?.favorite_pokemon ?? '');
        setCollectingFocus(row?.collecting_focus ?? '');

        setCountry(row?.country ?? '');
        setRegion(row?.region ?? '');
        setCity(row?.city ?? '');

        setNewEmail(currentEmail);
      } catch (e: any) {
        if (!mounted) return;
        setNewEmail(currentEmail);
        Alert.alert(
          'Profile load',
          `Couldn’t load your saved profile yet.\n\nThis is expected until we add the Supabase SQL.\n\nDetails: ${e?.message ?? 'Unknown error'}`
        );
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, user?.id]);

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Logout failed', e?.message ?? 'Unknown error');
    }
  }

  function requireSignedIn(actionLabel: string) {
    if (!isSignedIn) {
      Alert.alert('Sign in required', `You need to sign in to ${actionLabel}.`);
      router.replace('/');
      return false;
    }
    return true;
  }

  async function handleSaveProfile() {
    if (!requireSignedIn('update your profile')) return;

    const cleanUsername = username.trim();
    if (cleanUsername.length > 0) {
      const ok = /^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername);
      if (!ok) {
        Alert.alert('Invalid username', 'Use 3–20 characters: letters, numbers, underscore only.');
        return;
      }
    }

    try {
      setLoading(true);

      const payload: Partial<ProfileRow> = {
        id: user!.id,
        email: currentEmail,

        full_name: fullName.trim() || null,
        display_name: displayNameInput.trim() || null,
        username: cleanUsername || null,

        favorite_pokemon: favoritePokemon.trim() || null,
        collecting_focus: collectingFocus.trim() || null,

        country: country || null,
        region: region || null,
        city: city || null,

        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(payload as any, { onConflict: 'id' });
      if (error) throw error;

      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateEmail() {
    if (!requireSignedIn('change your email')) return;

    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    if (email === currentEmail.toLowerCase()) {
      Alert.alert('No change', 'That email is already on your account.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;

      Alert.alert('Check your email', 'We sent a confirmation link to complete the email change.');
    } catch (e: any) {
      Alert.alert('Email update failed', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPasswordEmail() {
    if (!requireSignedIn('reset your password')) return;

    const email = currentEmail.trim().toLowerCase();
    if (!email) {
      Alert.alert('Missing email', 'No email found on this account.');
      return;
    }

    try {
      setLoading(true);
      const redirectTo = Linking.createURL('/(app)/profile');
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;

      Alert.alert('Password reset sent', 'Check your inbox for the reset link.');
    } catch (e: any) {
      Alert.alert('Reset failed', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetNewPassword() {
    if (!requireSignedIn('set a new password')) return;

    const p1 = newPassword.trim();
    const p2 = confirmPassword.trim();

    if (!p1 || p1.length < 8) {
      Alert.alert('Weak password', 'Use at least 8 characters.');
      return;
    }
    if (p1 !== p2) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');

      Alert.alert('Updated', 'Your password has been updated.');
    } catch (e: any) {
      Alert.alert('Password update failed', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
        <View style={styles.bgOverlay} />

        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>Profile</Text>
              <Text style={styles.subtitle}>Account, security & collector settings</Text>
            </View>

            {/* Account summary */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Account</Text>

              <Text style={styles.label}>Signed in as</Text>
              <Text style={styles.value}>{isSignedIn ? currentEmail : 'Guest'}</Text>

              <Text style={[styles.label, { marginTop: 12 }]}>Display name (current)</Text>
              <Text style={styles.value}>{isSignedIn ? displayName ?? '—' : '—'}</Text>

              {isAdmin && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => router.push('/(app)/admin?tab=sync')}
                  activeOpacity={0.9}
                >
                  <Text style={styles.secondaryText}>Open Admin Dashboard</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.primaryBtn} onPress={handleLogout} activeOpacity={0.9}>
                <Text style={styles.primaryText}>{isSignedIn ? 'Log out' : 'Back to Home'}</Text>
              </TouchableOpacity>
            </View>

            {/* Collector Profile */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Collector Profile</Text>
              <Text style={styles.sectionHint}>
                This is what we’ll use across Collection, Analytics, and future social features.
              </Text>

              <Text style={styles.inputLabel}>Full name</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g., John Smith"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.input}
                editable={isSignedIn}
              />

              <Text style={styles.inputLabel}>Display name</Text>
              <TextInput
                value={displayNameInput}
                onChangeText={setDisplayNameInput}
                placeholder="e.g., PokeCollector"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.input}
                editable={isSignedIn}
              />

              <Text style={styles.inputLabel}>Username</Text>
              <Text style={styles.smallHelp}>3–20 chars. Letters/numbers/_ only.</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="e.g., pokecollector"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="none"
                style={styles.input}
                editable={isSignedIn}
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Favorite Pokémon</Text>
                  <TextInput
                    value={favoritePokemon}
                    onChangeText={setFavoritePokemon}
                    placeholder="e.g., Pikachu"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={styles.input}
                    editable={isSignedIn}
                  />
                </View>

                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Collecting focus</Text>
                  <TextInput
                    value={collectingFocus}
                    onChangeText={setCollectingFocus}
                    placeholder="e.g., Base Set • PSA slabs"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={styles.input}
                    editable={isSignedIn}
                  />
                </View>
              </View>

              {/* ✅ Global structured location (Country -> Region/State -> City) */}
              <Text style={[styles.sectionTitle, { marginTop: 14, fontSize: 14 }]}>Location</Text>
              <Text style={styles.sectionHint}>
                Choose Country → State/Area → City (auto-populated).
              </Text>

              <SelectField
                label="Country"
                value={country}
                placeholder={geoLoading ? 'Loading countries…' : 'Select country'}
                disabled={!isSignedIn || geoLoading}
                options={countryOptions}
                onSelect={(v) => setCountry(v)}
              />

              <SelectField
                label={country === 'United Kingdom' ? 'Area / County' : 'State / Region'}
                value={region}
                placeholder={
                  !country
                    ? 'Select country first'
                    : geoLoading
                    ? 'Loading regions…'
                    : 'Select state/region'
                }
                disabled={!isSignedIn || !country || geoLoading}
                options={regionOptions}
                onSelect={(v) => setRegion(v)}
              />

              <SelectField
                label="City"
                value={city}
                placeholder={
                  !country || !region
                    ? 'Select state/region first'
                    : geoLoading
                    ? 'Loading cities…'
                    : 'Select city'
                }
                disabled={!isSignedIn || !country || !region || geoLoading}
                options={cityOptions}
                onSelect={(v) => setCity(v)}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 14 }]}
                onPress={handleSaveProfile}
                activeOpacity={0.9}
                disabled={!isSignedIn || loading}
              >
                <Text style={styles.primaryText}>{isSignedIn ? 'Save Profile' : 'Sign in to Edit'}</Text>
              </TouchableOpacity>
            </View>

            {/* Security */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Security</Text>
              <Text style={styles.sectionHint}>
                Email changes typically require confirmation. Password reset sends a link.
              </Text>

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="your@email.com"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                editable={isSignedIn}
              />

              <View style={styles.rowTight}>
                <TouchableOpacity
                  style={styles.secondaryBtnFlex}
                  onPress={handleUpdateEmail}
                  activeOpacity={0.9}
                  disabled={!isSignedIn || loading}
                >
                  <Text style={styles.secondaryText}>Update Email</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtnFlex}
                  onPress={handleResetPasswordEmail}
                  activeOpacity={0.9}
                  disabled={!isSignedIn || loading}
                >
                  <Text style={styles.secondaryText}>Send Reset Link</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <Text style={styles.inputLabel}>Set new password (while signed in)</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry
                style={styles.input}
                editable={isSignedIn}
              />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry
                style={styles.input}
                editable={isSignedIn}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 10 }]}
                onPress={handleSetNewPassword}
                activeOpacity={0.9}
                disabled={!isSignedIn || loading}
              >
                <Text style={styles.primaryText}>Update Password</Text>
              </TouchableOpacity>
            </View>

            {(loading || initialLoad) && (
              <View style={styles.loadingPill}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Updating…</Text>
              </View>
            )}

            {/* ✅ GUARANTEED space below last button so tab bar never covers it */}
            <View style={{ height: TAB_BAR_GUARD_PX }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bg: { flex: 1, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  container: { flex: 1, backgroundColor: 'transparent' },

  // ✅ BIG bottom padding so the tab bar never hides bottom buttons
  scrollContent: {
    paddingBottom: TAB_BAR_GUARD_PX,
  },

  header: { paddingHorizontal: 20, paddingTop: 78, paddingBottom: 14, alignItems: 'center' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.75)', marginTop: 6, fontSize: 14, textAlign: 'center' },

  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 16,
  },

  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  sectionHint: { color: 'rgba(255,255,255,0.7)', marginTop: 6, fontSize: 12, fontWeight: '700' },

  label: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '700', marginTop: 10 },
  value: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 6 },

  inputLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '800', marginTop: 12 },
  smallHelp: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '700', marginTop: 4 },

  input: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  // Dropdown field
  select: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 12 : 12,
    justifyContent: 'center',
  },
  selectText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  selectPlaceholder: { color: 'rgba(255,255,255,0.35)' },

  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  col: { flex: 1 },

  rowTight: { flexDirection: 'row', gap: 10, marginTop: 12 },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 14,
    marginBottom: 6,
  },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: '#DC0A2D',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  secondaryBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtnFlex: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  loadingPill: {
    marginTop: 14,
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  loadingText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '900' },

  // Modal dropdown UI
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalSheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 110,
    bottom: 90,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.92)',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: '#fff', fontSize: 14, fontWeight: '900' },
  modalCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalCloseText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  optionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  optionText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
