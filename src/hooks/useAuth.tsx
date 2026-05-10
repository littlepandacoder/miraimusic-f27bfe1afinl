import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Dev-only helpers to quickly reproduce the raw GoTrue response when debugging 400s
// These read the same envs as the client (strip surrounding quotes if present).
const _rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const _rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const _stripQuotes = (s?: string) => s?.trim().replace(/^['\"]|['\"]$/g, "") || "";
const DEV_SUPABASE_URL = _stripQuotes(_rawUrl);
const DEV_SUPABASE_PUBLISHABLE_KEY = _stripQuotes(_rawKey);

type UserRole = "admin" | "teacher" | "student";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: UserRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  // debug: last raw auth error (DEV only)
  lastAuthError: any | null;
  clearLastAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAuthError, setLastAuthError] = useState<any | null>(null);

  // Helper: remove all Supabase-related keys from localStorage without clearing unrelated data
  const clearSupabaseStorage = () => {
    try {
      const keysToRemove: string[] = [];
      // Collect all keys first (don't modify during iteration)
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (/^sb-/i.test(k) || /^supabase\./i.test(k) || /^sb_/i.test(k))) {
          keysToRemove.push(k);
        }
      }
      
      // Remove the identified keys
      keysToRemove.forEach(k => localStorage.removeItem(k));
      if (import.meta.env.DEV) {
        console.debug(`[auth] cleared ${keysToRemove.length} Supabase storage keys`);
      }
      return keysToRemove.length;
    } catch (e) {
      console.warn('[auth] error clearing storage:', e);
      return 0;
    }
  };

  useEffect(() => {
    // Fetch roles with one automatic retry to survive transient lock contention.
    const fetchRoles = async (userId: string): Promise<UserRole[]> => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) await new Promise(r => setTimeout(r, 600));
          const { data, error } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);
          if (error) throw error;
          return (data?.map(r => r.role as UserRole)) ?? [];
        } catch (err: any) {
          if (attempt === 1) {
            console.warn("[auth] Could not fetch user roles after retry:", err?.message ?? err);
          }
        }
      }
      return [];
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (import.meta.env.DEV) {
          console.debug(`[auth] event=${event} user=${session?.user?.email ?? 'null'}`);
        }

        // Supabase fires SIGNED_OUT when a refresh token is invalid or signOut() is called.
        // Clear stale storage so the bad token doesn't cause repeated 400s.
        if (event === 'SIGNED_OUT') {
          clearSupabaseStorage();
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Best-effort: seed lesson_progress rows on first login
          (async () => {
            try {
              const uid = session.user.id;
              const { data: existing } = await (supabase as any)
                .from('lesson_progress').select('id').eq('student_id', uid).limit(1);
              if (!existing?.length) {
                const { data: lessons } = await (supabase as any).from('module_lessons').select('id');
                if (lessons?.length) {
                  await (supabase as any).from('lesson_progress').upsert(
                    lessons.map((l: any) => ({ lesson_id: l.id, student_id: uid, completed: false, watched_seconds: 0 })),
                    { onConflict: ['lesson_id', 'student_id'] }
                  );
                }
              }
            } catch (e) {
              console.debug('ensureUserProgress failed (non-blocking):', e);
            }
          })();

          const userRoles = await fetchRoles(session.user.id);
          setRoles(userRoles);
        } else {
          setRoles([]);
        }

        setLoading(false);
      }
    );

    // NOTE: getSession() is intentionally NOT called here.
    // Supabase v2 fires INITIAL_SESSION through onAuthStateChange automatically,
    // so a separate getSession() call would race for the same internal lock and
    // cause "lock was stolen" errors that break role fetching.

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const msg = 'No network connection. Please check your internet connection and try again.';
        if (import.meta.env.DEV) setLastAuthError({ message: msg });
        return { error: new Error(msg) };
      }

      let data: any = null;
      let error: any = null;

      try {
        const res = await supabase.auth.signInWithPassword({ email, password });
        data = res.data;
        error = res.error;
      } catch (fetchErr: any) {
        const msg = String(fetchErr?.message || fetchErr || 'Network error while contacting auth server');
        if (import.meta.env.DEV) console.debug('[auth] network/fetch error during signIn:', msg);
        if (import.meta.env.DEV) setLastAuthError({ message: msg });
        return { error: new Error(msg) };
      }
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[auth] signInWithPassword result', { data, error });
      }

      if (import.meta.env.DEV && error && (error as any)?.status === 400 && DEV_SUPABASE_URL && DEV_SUPABASE_PUBLISHABLE_KEY) {
        try {
          const debugResp = await fetch(`${DEV_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: DEV_SUPABASE_PUBLISHABLE_KEY },
            body: JSON.stringify({ email, password }),
          });
          const text = await debugResp.text();
          // eslint-disable-next-line no-console
          console.debug('[auth][dev-debug] raw token endpoint response', { status: debugResp.status, body: text });
        } catch (dbgErr) {
          // eslint-disable-next-line no-console
          console.warn('[auth][dev-debug] failed to fetch token endpoint for debug:', dbgErr);
        }
      }

      if (error) {
        if (import.meta.env.DEV) setLastAuthError(error);
        const msg = (error as any).message || 'Invalid email or password';
        return { error: new Error(msg) };
      }

      // onAuthStateChange handles all state updates (session, user, roles) on SIGNED_IN
      return { error: null };
    } catch (err) {
      console.error("Sign in error:", err);
      if (import.meta.env.DEV) setLastAuthError(err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearSupabaseStorage();
    setUser(null);
    setSession(null);
    setRoles([]);
  };

  const hasRole = (role: UserRole) => roles.includes(role);

  const clearLastAuthError = () => setLastAuthError(null);

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, signIn, signOut, hasRole, lastAuthError, clearLastAuthError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
