import { useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  ?.trim().replace(/^["']|["']$/g, "") ?? "";
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  ?.trim().replace(/^["']|["']$/g, "") ?? "";

const SESSION_ID_KEY       = "musicable_sess_id";
const SESSION_START_KEY    = "musicable_sess_start";
const SESSION_USER_KEY     = "musicable_sess_user";
const SESSION_ACTIVE_KEY   = "musicable_sess_active_secs";
const HEARTBEAT_MS         = 60_000;
const IDLE_THRESHOLD_MS    = 5 * 60 * 1000; // 5 minutes

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Records a user_sessions row on every login and updates duration_seconds on a
 * 60-second heartbeat. Idle time (no activity for >5 min) is excluded from the
 * recorded duration. Uses sessionStorage so a tab refresh continues the same row.
 */
export function useSessionTracking(user: User | null) {
  const sessionIdRef     = useRef<string | null>(null);
  const accessTokenRef   = useRef<string | null>(null);
  const lastActiveRef    = useRef<number>(Date.now());
  const activeSecondsRef = useRef<number>(0);
  const lastTickRef      = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const onActivity = () => { lastActiveRef.current = Date.now(); };
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !mounted) return;
      accessTokenRef.current = session.access_token;

      const existingId    = sessionStorage.getItem(SESSION_ID_KEY);
      const existingStart = sessionStorage.getItem(SESSION_START_KEY);
      const existingUser  = sessionStorage.getItem(SESSION_USER_KEY);
      const existingActive = sessionStorage.getItem(SESSION_ACTIVE_KEY);

      if (existingId && existingStart && existingUser === user.id) {
        sessionIdRef.current   = existingId;
        activeSecondsRef.current = existingActive ? parseInt(existingActive, 10) : 0;
        lastActiveRef.current  = Date.now();
        lastTickRef.current    = Date.now();
        return;
      }

      sessionStorage.removeItem(SESSION_ID_KEY);
      sessionStorage.removeItem(SESSION_START_KEY);
      sessionStorage.removeItem(SESSION_USER_KEY);
      sessionStorage.removeItem(SESSION_ACTIVE_KEY);

      const now = Date.now();
      const { data, error } = await (supabase as any)
        .from("user_sessions")
        .insert({ user_id: user.id })
        .select("id")
        .single();

      if (!error && data?.id && mounted) {
        sessionIdRef.current     = data.id;
        activeSecondsRef.current = 0;
        lastActiveRef.current    = now;
        lastTickRef.current      = now;
        sessionStorage.setItem(SESSION_ID_KEY,    data.id);
        sessionStorage.setItem(SESSION_START_KEY, now.toString());
        sessionStorage.setItem(SESSION_USER_KEY,  user.id);
        sessionStorage.setItem(SESSION_ACTIVE_KEY, "0");
      }
    };

    init();

    const heartbeat = setInterval(async () => {
      if (!sessionIdRef.current) return;

      const now              = Date.now();
      const idleMs           = now - lastActiveRef.current;
      const intervalMs       = now - lastTickRef.current;
      lastTickRef.current    = now;

      // Only accumulate time if the user was active in the last 5 minutes
      if (idleMs < IDLE_THRESHOLD_MS) {
        activeSecondsRef.current += Math.round(intervalMs / 1000);
        sessionStorage.setItem(SESSION_ACTIVE_KEY, activeSecondsRef.current.toString());
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) accessTokenRef.current = session.access_token;

      await (supabase as any)
        .from("user_sessions")
        .update({ duration_seconds: activeSecondsRef.current })
        .eq("id", sessionIdRef.current);
    }, HEARTBEAT_MS);

    const onUnload = () => {
      if (!sessionIdRef.current || !accessTokenRef.current || !SUPABASE_URL) return;

      const now        = Date.now();
      const idleMs     = now - lastActiveRef.current;
      const intervalMs = now - lastTickRef.current;

      let finalSecs = activeSecondsRef.current;
      if (idleMs < IDLE_THRESHOLD_MS) {
        finalSecs += Math.round(intervalMs / 1000);
      }

      try {
        fetch(`${SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`, {
          method: "PATCH",
          headers: {
            apikey:          SUPABASE_KEY,
            Authorization:   `Bearer ${accessTokenRef.current}`,
            "Content-Type":  "application/json",
            Prefer:          "return=minimal",
          },
          body: JSON.stringify({
            ended_at:         new Date().toISOString(),
            duration_seconds: finalSecs,
          }),
          keepalive: true,
        });
      } catch {}
    };

    window.addEventListener("beforeunload", onUnload);

    return () => {
      mounted = false;
      clearInterval(heartbeat);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity));
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [user?.id]);
}
