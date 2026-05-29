import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { saveSubscriptionInfo } from "@/lib/firestore";
import { supabase } from "@/integrations/supabase/client";

interface TrialBillingProps {
  email: string;
  docId: string;
  onboardingData: unknown;
  onComplete: () => void;
}

const TrialBilling = ({ email, docId, onComplete: _onComplete }: TrialBillingProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStartTrial = async () => {
    setError("");

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1 ── Create or sign in to Supabase account
      let userId: string | undefined;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        if (
          signUpError.message.includes("already registered") ||
          signUpError.message.includes("already exists")
        ) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) {
            setError("An account already exists for this email. Please log in at /login.");
            setLoading(false);
            return;
          }
          userId = signInData.user?.id;
        } else {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
      } else {
        userId = signUpData.user?.id;
      }

      if (!userId) {
        userId = (await supabase.auth.getUser()).data.user?.id;
      }

      if (!userId) {
        setError("Could not create account. Please try again.");
        setLoading(false);
        return;
      }

      // 2 ── Create Stripe Checkout Session and redirect
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-subscription-checkout",
        { body: { userId, email } }
      );

      if (fnError || !data?.url) {
        setError("Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }

      // 3 ── Save pending state to Firestore (non-blocking)
      try {
        await saveSubscriptionInfo(docId, "stripe_pending", "trial");
      } catch {
        // Non-fatal
      }

      // 4 ── Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      console.error("[TrialBilling]", err);
      setError(err?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <Button variant="ghost" onClick={() => window.history.back()} className="gap-2">
          <ArrowLeft size={20} /> Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left — account setup */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Create Your Account</h1>
              <p className="text-muted-foreground mt-1">
                Set your password, then start your first month for $8.
              </p>
            </div>

            <Card className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full p-2 border rounded bg-muted text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="w-full p-2 border rounded bg-transparent text-white placeholder:text-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Repeat password"
                  className="w-full p-2 border rounded bg-transparent text-white placeholder:text-gray-400"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="space-y-2 pt-1">
                {[
                  "$8 for your first month — less than a coffee",
                  "Billed $8 today, then $17/month on day 30",
                  "Access all piano course modules",
                  "Cancel anytime from Stripe Customer Portal",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check size={14} className="text-green-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right — pricing + CTA */}
          <Card className="p-6 flex flex-col justify-center gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">Start for $8</h2>
              <p className="text-4xl font-black mt-2">$17<span className="text-lg font-normal text-muted-foreground">/month</span></p>
              <p className="text-sm text-muted-foreground mt-1">Then $17/month — cancel anytime</p>
            </div>

            <Button
              onClick={handleStartTrial}
              disabled={loading}
              className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin mr-2" /> Setting up…</>
              ) : (
                <><CreditCard size={18} className="mr-2" /> Start for $8</>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck size={13} className="text-green-500" />
              Secure payment powered by Stripe
            </div>

            <p className="text-xs text-center text-muted-foreground">
              You'll be redirected to Stripe's secure checkout to enter your card details.
              Your card is charged $8 today, then $17/month after that.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrialBilling;
