import { useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  ?.trim().replace(/^["']|["']$/g, "") ?? "";
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  ?.trim().replace(/^["']|["']$/g, "") ?? "";

const SESSION_ID_KEY    = "musicable_sess_id";
const SESSION_START_KEY = "musicable_sess_start";
const SESSION_USER_KEY  = "musicable_sess_user";
const HEARTBEAT_MS      = 60_000; // update DB every 60 s

/**
 * Records a user_sessions row on every login, updates duration_seconds on a
 * 60-second heartbeat, and fires a keepalive PATCH on page close.
 * Uses sessionStorage so a tab refresh continues the same row rather than
 * creating a duplicate.
 */
export function useSessionTracking(user: User | null) {
  const sessionIdRef    = useRef<string | null>(null);
  const startTimeRef    = useRef<number>(0);
  const accessTokenRef  = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !mounted) return;
      accessTokenRef.current = session.access_token;

      // Reuse existing tab-session only if it belongs to this user (handles page refresh).
      // A different user ID or missing entry means a fresh login — create a new row.
      const existingId    = sessionStorage.getItem(SESSION_ID_KEY);
      const existingStart = sessionStorage.getItem(SESSION_START_KEY);
      const existingUser  = sessionStorage.getItem(SESSION_USER_KEY);
      if (existingId && existingStart && existingUser === user.id) {
        sessionIdRef.current = existingId;
        startTimeRef.current = parseInt(existingStart, 10);
        return;
      }

      // Clear any stale/cross-user session before creating a new one
      sessionStorage.removeItem(SESSION_ID_KEY);
      sessionStorage.removeItem(SESSION_START_KEY);
      sessionStorage.removeItem(SESSION_USER_KEY);

      // New login — insert a session row
      startTimeRef.current = Date.now();
      const { data, error } = await (supabase as any)
        .from("user_sessions")
        .insert({ user_id: user.id })
        .select("id")
        .single();

      if (!error && data?.id && mounted) {
        sessionIdRef.current = data.id;
        sessionStorage.setItem(SESSION_ID_KEY,    data.id);
        sessionStorage.setItem(SESSION_START_KEY, startTimeRef.current.toString());
        sessionStorage.setItem(SESSION_USER_KEY,  user.id);
      }
    };

    init();

    // Heartbeat: persist elapsed time so data is never stale by more than 60 s
    const heartbeat = setInterval(async () => {
      if (!sessionIdRef.current) return;

      // Keep the token fresh
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) accessTokenRef.current = session.access_token;

      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      await (supabase as any)
        .from("user_sessions")
        .update({ duration_seconds: duration })
        .eq("id", sessionIdRef.current);
    }, HEARTBEAT_MS);

    // Best-effort final update when the tab closes (keepalive survives page unload)
    const onUnload = () => {
      if (!sessionIdRef.current || !accessTokenRef.current || !SUPABASE_URL) return;
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      try {
        fetch(`${SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`, {
          method: "PATCH",
          headers: {
            apikey:           SUPABASE_KEY,
            Authorization:    `Bearer ${accessTokenRef.current}`,
            "Content-Type":   "application/json",
            Prefer:           "return=minimal",
          },
          body: JSON.stringify({
            ended_at:         new Date().toISOString(),
            duration_seconds: duration,
          }),
          keepalive: true,
        });
      } catch {}
    };

    window.addEventListener("beforeunload", onUnload);

    return () => {
      mounted = false;
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [user?.id]); // re-run only if the user identity changes
}
