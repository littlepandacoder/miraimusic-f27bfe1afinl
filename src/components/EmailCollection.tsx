import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Mail } from "lucide-react";
// Ensure this path exactly matches where your saveEmail function lives
import { saveEmail } from "@/lib/signupService"; 

interface EmailCollectionProps {
  onComplete: (email: string, docId: string) => void;
}

export const EmailCollection = ({ onComplete }: EmailCollectionProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
              disabled={loading}
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
            disabled={loading}
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