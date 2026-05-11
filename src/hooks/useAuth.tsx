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
    // Fetch roles: try SECURITY DEFINER RPC first (bypasses RLS), then fall back
    // to direct table query. The RPC requires get_my_roles() to exist in Supabase.
    const fetchRoles = async (userId: string): Promise<UserRole[]> => {
      console.log("[auth] fetchRoles START — userId:", userId);

      // Hard 5-second timeout so fetchRoles can never hang and block setLoading(false)
      const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([p, new Promise<T>(r => setTimeout(() => r(fallback), ms))]);

      // 1. Try SECURITY DEFINER RPC (bypasses RLS)
      try {
        const result = await withTimeout(
          supabase.rpc("get_my_roles" as any),
          3000,
          { data: null, error: new Error("rpc timeout") }
        );
        const { data, error } = result as any;
        console.log("[auth] fetchRoles RPC result — data:", data, "error:", error?.message ?? error);
        if (!error && Array.isArray(data)) {
          console.log("[auth] fetchRoles → roles from RPC:", data);
          return data as UserRole[];
        }
      } catch (e) {
        console.warn("[auth] fetchRoles RPC threw:", e);
      }

      // 2. Fallback: direct table query
      console.log("[auth] fetchRoles falling back to direct table query");
      try {
        const result = await withTimeout(
          supabase.from("user_roles").select("role").eq("user_id", userId),
          3000,
          { data: null, error: new Error("direct query timeout") }
        );
        const { data, error } = result as any;
        console.log("[auth] fetchRoles direct query result — data:", data, "error:", error?.message ?? error);
        if (!error && data) {
          const roles = data.map((r: any) => r.role as UserRole);
          console.log("[auth] fetchRoles → roles from direct query:", roles);
          return roles;
        }
      } catch (e) {
        console.warn("[auth] fetchRoles direct query threw:", e);
      }

      console.warn("[auth] fetchRoles → returning [] (all methods failed)");
      return [];
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[auth] onAuthStateChange — event: ${event}, user: ${session?.user?.email ?? "null"}`);

        if (event === 'SIGNED_OUT') {
          clearSupabaseStorage();
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Best-effort: seed lesson_progress rows on first login (non-blocking)
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
          console.log("[auth] setRoles →", userRoles, "| setLoading(false) next");
          setRoles(userRoles);
        } else {
          console.log("[auth] no session user — setRoles([]) | setLoading(false) next");
          setRoles([]);
        }

        setLoading(false);
        console.log("[auth] setLoading(false) called ✓");
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
