import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
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

const log  = import.meta.env.DEV ? console.log.bind(console)  : () => {};
const warn = import.meta.env.DEV ? console.warn.bind(console) : () => {};
const dbg  = import.meta.env.DEV ? console.debug.bind(console): () => {};

/* ── Roles cache ─────────────────────────────────────────────────────────────
   Stores roles in localStorage so returning users never see a loading spinner.
   TTL is 10 minutes; stale on sign-out or when fresh fetch returns new values.
──────────────────────────────────────────────────────────────────────────── */
const ROLES_CACHE_KEY = 'musicable_roles_v1';
const ROLES_CACHE_TTL = 10 * 60 * 1000; // 10 min

function getCachedRoles(userId: string): UserRole[] | null {
  try {
    const raw = localStorage.getItem(ROLES_CACHE_KEY);
    if (!raw) return null;
    const { uid, roles, ts } = JSON.parse(raw);
    if (uid !== userId) return null;
    if (Date.now() - ts > ROLES_CACHE_TTL) return null;
    return Array.isArray(roles) && roles.length > 0 ? roles : null;
  } catch { return null; }
}

function setCachedRoles(userId: string, roles: UserRole[]) {
  try {
    localStorage.setItem(ROLES_CACHE_KEY, JSON.stringify({ uid: userId, roles, ts: Date.now() }));
  } catch {}
}

function clearRolesCache() {
  try { localStorage.removeItem(ROLES_CACHE_KEY); } catch {}
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAuthError, setLastAuthError] = useState<any | null>(null);
  // Tracks whether INITIAL_SESSION has fired. On page load, Supabase fires SIGNED_IN first
  // (before auth.uid() is ready), then INITIAL_SESSION. We defer role fetching to INITIAL_SESSION
  // so the first SIGNED_IN never triggers a premature subscription check with roles=[].
  const initialSessionFiredRef = useRef(false);
  // Mirrors current roles state so callbacks can read the latest value without stale closures.
  const currentRolesRef = useRef<UserRole[]>([]);

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
        dbg(`[auth] cleared ${keysToRemove.length} Supabase storage keys`);
      }
      return keysToRemove.length;
    } catch (e) {
      warn('[auth] error clearing storage:', e);
      return 0;
    }
  };

  // Keep currentRolesRef in sync so the auth callback can read the latest value.
  useEffect(() => { currentRolesRef.current = roles; }, [roles]);

  useEffect(() => {
    // Fetch roles: try SECURITY DEFINER RPC first (bypasses RLS), then fall back
    // to direct table query. The RPC requires get_my_roles() to exist in Supabase.
    const fetchRoles = async (userId: string): Promise<UserRole[]> => {
      log("[auth] fetchRoles START — userId:", userId);

      // 3-second timeout per attempt — keeps total wait under 6s if both fail
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
        if (!error && Array.isArray(data) && data.length > 0) {
          log("[auth] fetchRoles → roles from RPC:", data);
          return data as UserRole[];
        }
      } catch (e) {
        warn("[auth] fetchRoles RPC threw:", e);
      }

      // 2. Fallback: direct table query
      try {
        const result = await withTimeout(
          supabase.from("user_roles").select("role").eq("user_id", userId),
          3000,
          { data: null, error: new Error("direct query timeout") }
        );
        const { data, error } = result as any;
        if (!error && Array.isArray(data) && data.length > 0) {
          const fetched = data.map((r: any) => r.role as UserRole);
          log("[auth] fetchRoles → roles from direct query:", fetched);
          return fetched;
        }
      } catch (e) {
        warn("[auth] fetchRoles direct query threw:", e);
      }

      warn("[auth] fetchRoles → returning [] (all methods failed)");
      return [];
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        log(`[auth] onAuthStateChange — event: ${event}, user: ${session?.user?.email ?? "null"}`);

        if (event === 'SIGNED_OUT') {
          clearSupabaseStorage();
          clearRolesCache();
          setSession(null);
          setUser(null);
          setRoles([]);
          setLoading(false);
          log("[auth] SIGNED_OUT — cleared state ✓");
          return;
        }

        // TOKEN_REFRESHED: the access token is being silently refreshed — roles haven't changed.
        // Re-fetching roles here causes intermittent timeouts that wipe roles to [] and log the
        // user out to SubscriptionGate. Just update session/user and keep existing roles.
        if (event === 'TOKEN_REFRESHED') {
          log("[auth] TOKEN_REFRESHED — updating session only, roles unchanged:", currentRolesRef.current);
          setSession(session);
          setUser(session?.user ?? null);
          return;
        }

        // On initial page load Supabase fires SIGNED_IN before auth.uid() is usable,
        // so get_my_roles() and direct user_roles queries both time out.
        // INITIAL_SESSION fires ~immediately after and IS reliable.
        // Skip role fetching on the first SIGNED_IN and let INITIAL_SESSION handle it.
        if (event === 'SIGNED_IN' && !initialSessionFiredRef.current) {
          log("[auth] SIGNED_IN (pre-INITIAL_SESSION) — updating user/session, deferring roles to INITIAL_SESSION");
          setSession(session);
          setUser(session?.user ?? null);
          return; // keep loading=true until INITIAL_SESSION completes
        }

        if (event === 'INITIAL_SESSION') {
          initialSessionFiredRef.current = true;
          log("[auth] INITIAL_SESSION — marking initialSessionFired, fetching roles now");
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const uid = session.user.id;

          // Cache-first: serve cached roles immediately so there's no loading spinner
          // for returning users. Fresh roles are fetched in the background.
          const cached = getCachedRoles(uid);
          if (cached) {
            log("[auth] roles cache hit →", cached);
            setRoles(cached);
            currentRolesRef.current = cached;
            setLoading(false); // instant — no spinner
          } else {
            // No cache: show spinner while we fetch
            setLoading(true);
          }

          // Best-effort: seed lesson_progress rows on first login (non-blocking)
          (async () => {
            try {
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
              dbg('ensureUserProgress failed (non-blocking):', e);
            }
          })();

          // Fetch fresh roles (background if cache hit, blocking if not)
          const freshRoles = await fetchRoles(uid);

          if (freshRoles.length > 0) {
            // Got real roles — update state and refresh cache
            setCachedRoles(uid, freshRoles);
            setRoles(freshRoles);
            currentRolesRef.current = freshRoles;
          } else if (!cached) {
            // No cache and fetch failed — fall back to in-memory if present
            if (currentRolesRef.current.length > 0) {
              warn("[auth] fetch failed, keeping in-memory roles:", currentRolesRef.current);
            } else {
              setRoles([]);
              currentRolesRef.current = [];
            }
          }
          // If cache hit but fetch failed, cached roles are already in state — no change needed.

        } else {
          setRoles([]);
          currentRolesRef.current = [];
        }

        setLoading(false);
        log("[auth] setLoading(false) ✓");
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

      log("[auth] signInWithPassword — email:", email, "passwordLength:", password.length);
      try {
        const res = await supabase.auth.signInWithPassword({ email, password });
        data = res.data;
        error = res.error;
        log("[auth] signInWithPassword result — user:", data?.user?.email ?? "null", "error:", error?.message ?? "none", "status:", (error as any)?.status ?? "n/a");
      } catch (fetchErr: any) {
        const msg = String(fetchErr?.message || fetchErr || 'Network error while contacting auth server');
        console.error('[auth] network/fetch error during signIn:', msg);
        if (import.meta.env.DEV) setLastAuthError({ message: msg });
        return { error: new Error(msg) };
      }
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        dbg('[auth] signInWithPassword result', { data, error });
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
          dbg('[auth][dev-debug] raw token endpoint response', { status: debugResp.status, body: text });
        } catch (dbgErr) {
          // eslint-disable-next-line no-console
          warn('[auth][dev-debug] failed to fetch token endpoint for debug:', dbgErr);
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
    // Clear session-tracking keys so the next login always creates a new user_sessions row
    sessionStorage.removeItem("musicable_sess_id");
    sessionStorage.removeItem("musicable_sess_start");
    sessionStorage.removeItem("musicable_sess_user");
    clearRolesCache();
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
