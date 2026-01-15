// app/(app)/home/index.tsx
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';

const SET_LOGOS = {
  'base-set': require('@/assets/images/base-set-logo-january-8th-1999.png'),
  'jungle': require('@/assets/images/jungle-set-logo-june-15th-1999.png'),
  'fossil': require('@/assets/images/fossil-set-logo-october-9th-1999.png'),
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

export default function TabHome() {
  const { width: screenWidth } = useWindowDimensions();

  // EXACT SAME LOGO SIZING AS LOGIN
  const CARD_MAX_WIDTH = 420;
  const cardWidth = Math.min(screenWidth - 40, CARD_MAX_WIDTH);
  const logoWrapWidth = cardWidth;
  const logoWrapHeight = Math.round(logoWrapWidth * 0.34);
  const LOGO_SCALE = 1.9;

  return (
    <View style={styles.root}>
      <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
        <View style={styles.bgOverlay} />

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View
              style={[
                styles.logoWrap,
                { width: logoWrapWidth, height: logoWrapHeight },
              ]}
            >
              <Image
                source={LOGO_IMAGE}
                style={[styles.logoImage, { transform: [{ scale: LOGO_SCALE }] }]}
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
                    {SET_LOGOS[set.assetKey as keyof typeof SET_LOGOS] ? (
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

  header: {
    alignItems: 'center',
    marginBottom: 20, // reduced space under logo
  },

  logoWrap: {
    alignItems: 'center',
    justifyContent: 'flex-start', // bias logo upward
    paddingTop: 12,               // space ABOVE logo
    overflow: 'hidden',
  },

  logoImage: {
    width: '100%',
    height: '100%',
  },

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

  setLogoContainer: {
    width: 120,
    height: 80,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  setLogo: { width: '100%', height: '100%' },

  setLogoPlaceholder: {
    width: 110,
    height: 70,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  setName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },

  setDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
});
