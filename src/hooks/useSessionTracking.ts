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
const HEARTBEAT_MS         = 30_000; // More frequent heartbeat (30s instead of 60s)
const IDLE_THRESHOLD_MS    = 60 * 1000; // 1 minute
const RETRY_DELAY_MS       = 5_000;    // Retry failed updates after 5s

export const RESET_TIME_EVENT = "musicable:reset-time";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "touchmove", "pointerdown"] as const;

// Detect device type
function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return "ipad";
  if (/iPhone/.test(ua)) return "iphone";
  if (/Android/.test(ua)) return "android";
  if (/Mobile/.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Records a user_sessions row on every login and updates duration_seconds on a
 * 60-second heartbeat. Idle time (no activity for >1 min) is excluded from the
 * recorded duration. Uses sessionStorage so a tab refresh continues the same row.
 * Dispatch a "musicable:reset-time" event to zero the in-memory counter.
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

    const onResetTime = () => {
      activeSecondsRef.current = 0;
      sessionStorage.setItem(SESSION_ACTIVE_KEY, "0");
    };
    window.addEventListener(RESET_TIME_EVENT, onResetTime);

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
      const deviceType = getDeviceType();
      const userAgent = navigator.userAgent;

      let sessionId: string | null = null;
      let retries = 0;
      const maxRetries = 3;

      // Retry logic for creating session (in case of network issues)
      while (!sessionId && retries < maxRetries) {
        const { data, error } = await (supabase as any)
          .from("user_sessions")
          .insert({
            user_id: user.id,
            device_type: deviceType,
            user_agent: userAgent,
            started_at: new Date(now).toISOString(),
          })
          .select("id")
          .single();

        if (!error && data?.id) {
          sessionId = data.id;
        } else {
          retries++;
          if (retries < maxRetries) {
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }

      if (sessionId && mounted) {
        sessionIdRef.current     = sessionId;
        activeSecondsRef.current = 0;
        lastActiveRef.current    = now;
        lastTickRef.current      = now;
        sessionStorage.setItem(SESSION_ID_KEY,    sessionId);
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

      // Only accumulate time if the user was active in the last minute
      if (idleMs < IDLE_THRESHOLD_MS) {
        activeSecondsRef.current += Math.round(intervalMs / 1000);
        sessionStorage.setItem(SESSION_ACTIVE_KEY, activeSecondsRef.current.toString());
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) accessTokenRef.current = session.access_token;

      // Update session with retry logic
      let retries = 0;
      while (retries < 2) {
        try {
          const { error } = await (supabase as any)
            .from("user_sessions")
            .update({
              duration_seconds: activeSecondsRef.current,
              last_activity_at: new Date().toISOString(),
            })
            .eq("id", sessionIdRef.current);

          if (!error) break;
          retries++;
        } catch {
          retries++;
        }
      }
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

      // Use sendBeacon for reliable delivery on unload (works on iPad/mobile)
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            `${SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`,
            JSON.stringify({
              ended_at:         new Date().toISOString(),
              duration_seconds: finalSecs,
            })
          );
        } else {
          // Fallback for older browsers
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
        }
      } catch (err) {
        console.error("[session] failed to record session end:", err);
      }
    };

    window.addEventListener("beforeunload", onUnload);

    return () => {
      mounted = false;
      clearInterval(heartbeat);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity));
      window.removeEventListener(RESET_TIME_EVENT, onResetTime);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [user?.id]);
}
