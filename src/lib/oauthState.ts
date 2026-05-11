// Evaluated ONCE when the module first loads — before any React component renders
// and before Supabase processes/clears the hash. Captures whether this page load
// started with an OAuth callback so OAuthRedirectHandler and Index.tsx can agree.
export const wasOAuthRedirect =
  window.location.hash.includes("access_token") ||
  window.location.hash.includes("refresh_token") ||
  new URLSearchParams(window.location.search).has("code");
