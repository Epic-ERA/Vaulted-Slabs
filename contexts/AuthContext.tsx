// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  displayName: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  displayName: 'Guest',
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Prevent redundant state writes (reduces rerender churn on web)
  const lastUserIdRef = useRef<string | null>(null);
  const lastSessionAccessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;

      const nextUser = nextSession?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const nextAccessToken = (nextSession as any)?.access_token ?? null;

      // Only update if something actually changed
      const userChanged = nextUserId !== lastUserIdRef.current;
      const sessionChanged = nextAccessToken !== lastSessionAccessTokenRef.current;

      if (sessionChanged) {
        lastSessionAccessTokenRef.current = nextAccessToken;
        setSession(nextSession);
      }
      if (userChanged) {
        lastUserIdRef.current = nextUserId;
        setUser(nextUser);
      }

      // Loading should end exactly once we know the auth state
      setLoading(false);
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      applySession(data.session ?? null);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    // ✅ Do not manually set user/session here.
    // Let the Supabase auth listener update state exactly once.
    await supabase.auth.signOut();
  }

  const isAdmin = user?.app_metadata?.role === 'admin';
  const displayName = user?.email ?? 'Guest';

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      loading,
      isAdmin,
      displayName,
      signOut,
    }),
    [user, session, loading, isAdmin, displayName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
