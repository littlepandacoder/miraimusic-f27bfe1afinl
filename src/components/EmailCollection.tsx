import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Mail } from "lucide-react";
// Ensure this path exactly matches where your saveEmail function lives
import { saveEmail } from "@/lib/signupService";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface EmailCollectionProps {
  onComplete: (email: string, docId: string) => void;
}

export const EmailCollection = ({ onComplete }: EmailCollectionProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, signOut } = useAuth();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // 1. Save to Firestore
      const docId = await saveEmail(email);
      console.log("Firebase success! Saved with ID:", docId);

      // 2. Short delay to prevent the 'removeChild' crash during transition
      setTimeout(() => {
        onComplete(email, docId);
      }, 150);

    } catch (err: any) {
      console.error("Error in handleSubmit:", err);
      
      // Precise error messages for debugging
      if (err.code === 'permission-denied') {
        setError("Firebase Rules error: Check your Firestore 'Rules' tab.");
      } else {
        setError("Failed to save email. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const handleGoogleSignup = async () => {
    try {
      setGoogleLoading(true);
      setError("");

      // Verify network connection
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setError("No internet connection. Please check your connection and try again.");
        setGoogleLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error("[signup] Google OAuth error:", error);
        setError(error.message || "Failed to sign up with Google. Please try again.");
        setGoogleLoading(false);
      }
      // If no error, Supabase will redirect to Google, so we don't reset googleLoading
    } catch (err) {
      console.error("[signup] Google signup error:", err);
      setError("An unexpected error occurred. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/50 to-background flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md bg-card/50 border-border/30 p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-pink/20 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-pink" />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-3 tracking-tighter">
            MUSICABLE
          </h1>
          <p className="text-muted-foreground text-sm">
            Start learning for $17/month. Unlock 900+ lessons.
          </p>
          {user && (
            <p className="text-xs text-muted-foreground mt-3">
              Signed in as {user.email}.{" "}
              <button
                type="button"
                onClick={handleLogout}
                className="underline hover:text-foreground transition-colors"
              >
                Log out
              </button>
            </p>
          )}
        </div>

        {/* Google Signup */}
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center gap-3 border-border py-6"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
        >
          {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          <span>Sign up with Google</span>
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-foreground/60 ml-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-background/50 border border-border/30 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink/50 transition-all"
              disabled={loading || googleLoading}
              autoComplete="email"
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-medium animate-in fade-in zoom-in-95">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-pink hover:bg-pink/90 text-white font-bold py-7 text-lg rounded-xl shadow-lg shadow-pink/20 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 size={20} className="animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              "Get Instant Access"
            )}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center opacity-70">
            No credit card required to start.
          </p>
        </form>

        <div className="mt-8 pt-6 border-t border-border/20 grid grid-cols-2 gap-y-2 gap-x-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-pink text-lg">✓</span> Pro Feedback
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-pink text-lg">✓</span> All Skill Levels
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-pink text-lg">✓</span> Smart Notation
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-pink text-lg">✓</span> Mobile App
          </div>
        </div>
      </Card>
    </div>
  );
};