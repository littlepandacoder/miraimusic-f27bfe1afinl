import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { wasOAuthRedirect } from "@/lib/oauthState";

/**
 * Handles the OAuth hash redirect without orphaning Supabase's internal lock.
 *
 * When Google OAuth completes, Supabase lands the browser on the root URL (or
 * /auth/callback) with #access_token=... in the hash. The Supabase SDK picks up
 * the tokens, clears the hash, and fires onAuthStateChange SIGNED_IN — all before
 * loading becomes false.
 *
 * wasOAuthRedirect is captured at module-load time (before Supabase clears the
 * hash), so both this component and Index.tsx can reliably detect an OAuth flow.
 *
 * This component waits for loading=false then uses React Router navigate (no full
 * page reload) so we don't orphan Supabase's internal lock.
 */
const OAuthRedirectHandler = () => {
  const { loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!wasOAuthRedirect) return;
    if (loading) return;
    // Already on callback page — AuthCallback handles everything
    if (window.location.pathname === "/auth/callback") return;

    navigate("/auth/callback", { replace: true });
  }, [loading, navigate]);

  return null;
};

export default OAuthRedirectHandler;
