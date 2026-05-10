import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Music } from "lucide-react";
import { Loader2 } from "lucide-react";

interface WelcomeInfo {
  name: string;
  isNew: boolean;
  destination: string;
}

const AuthCallback = () => {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  const welcomed = useRef(false);
  const destRef = useRef("/dashboard");
  const [welcome, setWelcome] = useState<WelcomeInfo | null>(null);

  // Effect 1 — detect user + build welcome state (runs whenever user/roles/loading change)
  useEffect(() => {
    if (loading) return;

    if (!user) {
      const t = setTimeout(() => navigate("/login", { replace: true }), 3000);
      return () => clearTimeout(t);
    }

    if (welcomed.current) return; // already handled — don't reset the timer
    welcomed.current = true;

    const rawName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "there";
    const firstName = rawName.split(" ")[0];
    const isNew = new Date(user.created_at).getTime() > Date.now() - 90_000;
    const destination = roles.length > 0 ? "/dashboard" : "/signup";

    destRef.current = destination;
    setWelcome({ name: firstName, isNew, destination });
  }, [user, roles, loading, navigate]);

  // Effect 2 — navigate after 2.5 s once welcome is shown.
  // Only depends on `welcome` (set once) so role re-renders can't cancel this timer.
  useEffect(() => {
    if (!welcome) return;
    const t = setTimeout(
      () => navigate(destRef.current, { replace: true }),
      2500
    );
    return () => clearTimeout(t);
  }, [welcome, navigate]);

  // Loading spinner while session is being established
  if (!welcome) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Signing you in…</p>
        </div>
      </div>
    );
  }

  // Big centred welcome card
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center animate-slide-up space-y-6 max-w-lg w-full">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-pulse-glow">
            <Music className="w-12 h-12 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-primary font-semibold text-xl uppercase tracking-widest">
            {welcome.isNew ? "Account Created" : "Signed In"}
          </p>
          <h1 className="text-5xl sm:text-6xl font-black text-foreground leading-tight">
            {welcome.isNew ? "Welcome," : "Welcome back,"}
            <br />
            <span className="text-primary">{welcome.name}!</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            {welcome.isNew
              ? "Your musical journey starts now."
              : "Great to see you again. Let's keep going."}
          </p>
        </div>

        <div className="w-full max-w-xs mx-auto h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ animation: "progress-shrink 2.5s linear forwards" }}
          />
        </div>
        <p className="text-xs text-muted-foreground">Taking you to your dashboard…</p>
      </div>

      <style>{`
        @keyframes progress-shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default AuthCallback;
