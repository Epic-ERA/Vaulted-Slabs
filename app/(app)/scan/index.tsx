// app/(app)/scan/index.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Camera, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');

export default function ScanScreen() {
  const { isAdmin } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);

  async function handleEnableCamera() {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Camera scanning is not available on web. Please use the mobile app.');
      return;
    }

    if (!permission) {
      return;
    }

    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Camera permission is required to scan barcodes.');
        return;
      }
    }

    setCameraActive(true);
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scanning) return;

    setScanning(true);
    setCameraActive(false);

    if (/^\d{8,10}$/.test(data)) {
      Alert.alert(
        'PSA Cert Detected',
        `Scanned cert number: ${data}\n\nWould you like to lookup this PSA certificate?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setScanning(false) },
          {
            text: 'Lookup',
            onPress: () => {
              setScanning(false);
              router.push(`/(app)/search?mode=psa&query=${data}`);
            },
          },
        ]
      );
    } else {
      Alert.alert('Barcode Scanned', `Data: ${data}\n\nUse this to search for cards or add manually.`, [
        { text: 'OK', onPress: () => setScanning(false) },
      ]);
    }
  }

  function handleQuickAdd() {
    router.push('/(app)/collection');
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.root}>
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
          <View style={styles.bgOverlay} />

          {isAdmin && (
            <View style={styles.topButtonContainer}>
              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => router.push('/(app)/admin')}
                activeOpacity={0.8}
              >
                <Text style={styles.adminButtonText}>Admin Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Scan</Text>
              <Text style={styles.subtitle}>Barcode scanner</Text>
            </View>

            <View style={styles.card}>
              <Camera size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.cardTitle}>Camera Not Available on Web</Text>
              <Text style={styles.cardSub}>
                Camera scanning is only available on mobile devices. Please use the mobile app to scan barcodes.
              </Text>

              <TouchableOpacity style={styles.secondaryBtn} onPress={handleQuickAdd} activeOpacity={0.9}>
                <Text style={styles.secondaryText}>Add Card Manually</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  if (cameraActive) {
    return (
      <View style={styles.root}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'code128', 'code39', 'code93', 'ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setCameraActive(false)} activeOpacity={0.8}>
                <X size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.scanArea}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanText}>Position barcode within the frame</Text>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  if (!permission) {
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

        {isAdmin && (
          <View style={styles.topButtonContainer}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/(app)/admin')}
              activeOpacity={0.8}
            >
              <Text style={styles.adminButtonText}>Admin Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Scan</Text>
            <Text style={styles.subtitle}>Barcode scanner</Text>
          </View>

          <View style={styles.card}>
            <Camera size={48} color="rgba(255,255,255,0.5)" />
            <Text style={styles.cardTitle}>Scan Barcodes</Text>
            <Text style={styles.cardSub}>
              Scan PSA certification labels, card barcodes, or QR codes to quickly add cards to your collection.
            </Text>

            {!permission.granted && (
              <Text style={styles.permissionText}>Camera permission is required to scan barcodes.</Text>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={handleEnableCamera} activeOpacity={0.9}>
              <Text style={styles.primaryText}>
                {permission.granted ? 'Enable Camera' : 'Grant Camera Permission'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleQuickAdd} activeOpacity={0.9}>
              <Text style={styles.secondaryText}>Add Card Manually</Text>
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

  container: { flex: 1, backgroundColor: 'transparent', paddingTop: 130 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  topButtonContainer: {
    position: 'absolute',
    top: 74,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
  },
  adminButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(29, 78, 216, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, alignItems: 'center' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.75)', marginTop: 6, fontSize: 14, textAlign: 'center' },

  card: {
    margin: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  cardSub: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    lineHeight: 20,
    textAlign: 'center',
  },

  permissionText: {
    color: '#ff9500',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },

  primaryBtn: {
    marginTop: 20,
    backgroundColor: '#DC0A2D',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  secondaryBtn: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  secondaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cameraHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scanFrame: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: '#DC0A2D',
    borderRadius: 20,
    backgroundColor: 'rgba(220, 10, 45, 0.1)',
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
