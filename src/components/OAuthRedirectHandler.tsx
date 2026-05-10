import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Handles the OAuth hash redirect without orphaning Supabase's internal lock.
 *
 * When Google OAuth completes, Supabase lands the browser on the root URL with
 * #access_token=... in the hash. The Supabase SDK picks up the tokens and fires
 * onAuthStateChange SIGNED_IN. This component waits for that to finish (i.e.,
 * loading=false) then uses React Router's navigate — which does NOT trigger a
 * full page reload — to move the user to /auth/callback. That avoids the
 * "lock was not released within 5000ms" warning caused by navigating away mid-handler.
 */
const OAuthRedirectHandler = () => {
  const { loading } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (!window.location.hash.includes("access_token")) return;
    if (loading) return;

    handled.current = true;
    // Strip the hash so it doesn't linger in browser history
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
    navigate("/auth/callback", { replace: true });
  }, [loading, navigate]);

  return null;
};

export default OAuthRedirectHandler;
