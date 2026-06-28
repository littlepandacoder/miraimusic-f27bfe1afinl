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
  planType?: "student" | "premium";
}

const TrialBilling = ({ email, docId, onComplete: _onComplete, planType: initialPlanType = "student" }: TrialBillingProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [planType, setPlanType] = useState<"student" | "premium">(initialPlanType);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
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
      // 1 ── Clear any stale/expired session to avoid refresh token errors
      await supabase.auth.signOut({ scope: "local" });

      // 2 ── Create or sign in to Supabase account
      let userId: string | undefined;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        const shouldTrySignIn =
          msg.includes("already registered") ||
          msg.includes("already exists") ||
          msg.includes("rate limit") ||
          msg.includes("too many") ||
          signUpError.status === 429;

        if (shouldTrySignIn) {
          // Account exists or rate limited — try signing in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) {
            if (msg.includes("rate limit") || signUpError.status === 429) {
              setError("Too many attempts. Please wait a minute and try again.");
            } else {
              setError("An account already exists for this email. Please log in at /login.");
            }
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
        { body: { userId, email, promoCode: promoCode.trim() || undefined, billingPeriod, planType } }
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
                Set your password, then choose monthly or yearly billing.
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
              <div>
                <label className="block text-sm font-medium mb-1">Promo Code (optional)</label>
                <input
                  type="text"
                  placeholder="Enter a promo code"
                  className="w-full p-2 border rounded bg-transparent text-white placeholder:text-gray-400"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="space-y-2 pt-1">
                {(planType === "premium"
                  ? [
                      "$29/month, billed today",
                      "Unlimited AI Tutor with voice",
                      "Access all piano course modules",
                      "Advanced progress analytics",
                      "Priority support",
                      "Cancel anytime from Stripe Customer Portal",
                    ]
                  : [
                      billingPeriod === "yearly" ? "$199/year, billed today" : "$17/month, billed today",
                      "Access all piano course modules",
                      "Gamified learning & quizzes",
                      "Progress tracking",
                      "Cancel anytime from Stripe Customer Portal",
                    ]
                ).map((f) => (
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
            {/* Plan selector */}
            <div className="flex rounded-lg border border-border p-1 gap-1">
              <button
                type="button"
                onClick={() => setPlanType("student")}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${
                  planType === "student" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setPlanType("premium")}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${
                  planType === "premium" ? "bg-purple-500 text-white" : "text-muted-foreground"
                }`}
              >
                Pro
              </button>
            </div>

            {/* Billing period selector - only for student */}
            {planType === "student" && (
              <div className="flex rounded-lg border border-border p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setBillingPeriod("monthly")}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${
                    billingPeriod === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod("yearly")}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${
                    billingPeriod === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Yearly
                </button>
              </div>
            )}

            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">{planType === "premium" ? "Premium Plan" : "Subscribe"}</h2>
              {planType === "premium" ? (
                <p className="text-4xl font-black mt-2">$29<span className="text-lg font-normal text-muted-foreground">/month</span></p>
              ) : billingPeriod === "yearly" ? (
                <p className="text-4xl font-black mt-2">$199<span className="text-lg font-normal text-muted-foreground">/year</span></p>
              ) : (
                <p className="text-4xl font-black mt-2">$17<span className="text-lg font-normal text-muted-foreground">/month</span></p>
              )}
              <p className="text-sm text-muted-foreground mt-1">Cancel anytime</p>
            </div>

            <Button
              onClick={handleStartTrial}
              disabled={loading}
              className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin mr-2" /> Setting up…</>
              ) : (
                <><CreditCard size={18} className="mr-2" /> Subscribe</>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck size={13} className="text-green-500" />
              Secure payment powered by Stripe
            </div>

            <p className="text-xs text-center text-muted-foreground">
              You'll be redirected to Stripe's secure checkout to enter your card details.
              Your card is charged {planType === "premium" ? "$29/month" : billingPeriod === "yearly" ? "$199/year" : "$17/month"}, starting today.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrialBilling;
