// app/(app)/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AppIndex() {
  const router = useRouter();

  useEffect(() => {
    // ✅ IMPORTANT:
    // / (app)/home is no longer a stable target (and may not exist).
    // Always land on a real, stable tab route.
    router.replace('/(app)/sets');
  }, [router]);

  // ✅ Render nothing while we redirect (prevents render-loop issues on web)
  return null;
}
