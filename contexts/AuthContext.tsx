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
  isLoggingOut: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  displayName: 'Guest',
  isLoggingOut: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ✅ Prevent redundant state writes (reduces rerender churn on web)
  const lastUserIdRef = useRef<string | null>(null);
  const lastSessionAccessTokenRef = useRef<string | null>(null);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const applySession = (nextSession: Session | null, event?: string) => {
      if (!mounted) return;

      const nextUser = nextSession?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const nextAccessToken = (nextSession as any)?.access_token ?? null;

      // Only update if something actually changed
      const userChanged = nextUserId !== lastUserIdRef.current;
      const sessionChanged = nextAccessToken !== lastSessionAccessTokenRef.current;

      if (userChanged || sessionChanged) {
        console.log(`[AUTH] ${event || 'SESSION_CHANGE'}:`, {
          userId: nextUserId,
          wasLoggedIn: !!lastUserIdRef.current,
          isLoggedIn: !!nextUserId,
        });
      }

      if (sessionChanged) {
        lastSessionAccessTokenRef.current = nextAccessToken;
        setSession(nextSession);
      }
      if (userChanged) {
        lastUserIdRef.current = nextUserId;
        setUser(nextUser);

        // Clear logout state when user changes
        if (!nextUserId && isLoggingOutRef.current) {
          console.log('[AUTH] Logout complete, clearing logout state');
          isLoggingOutRef.current = false;
          setIsLoggingOut(false);
        }
      }

      // Loading should end exactly once we know the auth state
      setLoading(false);
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      applySession(data.session ?? null, 'INITIAL_SESSION');
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.log('[AUTH] Auth state change event:', event);
      applySession(nextSession ?? null, event);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch user role from database
  useEffect(() => {
    async function fetchUserRole() {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!error && data) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setIsAdmin(false);
      }
    }

    fetchUserRole();
  }, [user?.id]);

  async function signOut() {
    // Prevent multiple simultaneous logout calls
    if (isLoggingOutRef.current) {
      console.log('[AUTH] Logout already in progress, ignoring duplicate call');
      return;
    }

    console.log('[AUTH] Starting logout...');
    isLoggingOutRef.current = true;
    setIsLoggingOut(true);

    try {
      // Let the Supabase auth listener update state exactly once
      await supabase.auth.signOut();
      console.log('[AUTH] signOut() completed');
    } catch (error) {
      console.error('[AUTH] Logout error:', error);
      // Reset logout state on error
      isLoggingOutRef.current = false;
      setIsLoggingOut(false);
    }
  }

  const displayName = user?.email ?? 'Guest';

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      loading,
      isAdmin,
      displayName,
      isLoggingOut,
      signOut,
    }),
    [user, session, loading, isAdmin, displayName, isLoggingOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
