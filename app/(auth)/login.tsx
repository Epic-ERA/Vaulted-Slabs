// app/(auth)/login.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { signIn, signUp } from '@/services/auth';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');
const LOGO_IMAGE = require('@/assets/images/vaulted-slabs-logo.jpg');

export default function LoginScreen() {
  const { width: screenWidth } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const CARD_MAX_WIDTH = 420;
  const cardWidth = Math.min(screenWidth - 40, CARD_MAX_WIDTH);
  const logoWrapWidth = cardWidth;
  const logoWrapHeight = Math.round(logoWrapWidth * 0.34);
  const LOGO_SCALE = 1.9;

  async function handleSubmit() {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }

      // ✅ CRITICAL: route to a stable, real tab route.
      // Home is removed from tabs; /sets is safe + always exists.
      router.replace('/(app)/analytics');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
      <View style={styles.bgOverlay} />

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.card, { maxWidth: CARD_MAX_WIDTH }]}>
          <View style={[styles.logoWrap, { width: logoWrapWidth, height: logoWrapHeight }]}>
            <Image
              source={LOGO_IMAGE}
              style={[styles.logoImage, { transform: [{ scale: LOGO_SCALE }] }]}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.subtitle}>{isSignUp ? 'Create your account' : 'Sign in to your account'}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonPrimaryText}>{isSignUp ? 'Create Account' : 'Log In'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Create one"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.85}>
            <Text style={styles.backLink}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 16,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  logoWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 10 },
  logoImage: { width: '100%', height: '100%' },
  subtitle: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 16, fontSize: 14 },
  input: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: '#fff',
    fontSize: 16,
  },
  buttonPrimary: {
    width: '100%',
    height: 56,
    backgroundColor: '#DC0A2D',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  buttonPrimaryText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  buttonDisabled: { opacity: 0.6 },
  switchText: { marginTop: 16, color: '#DC0A2D', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  backLink: { marginTop: 14, color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center' },
  error: { color: '#ff3b30', marginBottom: 12, textAlign: 'center' },
});
