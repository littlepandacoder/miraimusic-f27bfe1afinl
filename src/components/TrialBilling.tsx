import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { saveSubscriptionInfo } from "@/lib/firestore";
import { supabase } from "@/integrations/supabase/client";
import { checkRateLimit } from "@/lib/rateLimiter";

interface TrialBillingProps {
  email: string;
  docId: string;
  onboardingData: unknown;
  onComplete: () => void;
  planType?: "student" | "premium";
  accountExists?: boolean;
}

const TrialBilling = ({ email, docId, onComplete: _onComplete, planType: initialPlanType = "student", accountExists = false }: TrialBillingProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [planType, setPlanType] = useState<"student" | "premium">(initialPlanType);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExistingAccount] = useState(accountExists);

  const handleStartTrial = async () => {
    setError("");

    // Rate limiting check
    const rateLimitCheck = checkRateLimit(email, 'AUTH');
    if (!rateLimitCheck.allowed) {
      const retryAfter = rateLimitCheck.retryAfter ? Math.ceil(rateLimitCheck.retryAfter / 60) : 15;
      setError(`Too many attempts. Please try again in ${retryAfter} minutes.`);
      return;
    }

    // For existing accounts, validate password but skip other checks
    // For new accounts, validate full password requirements
    if (!isExistingAccount) {
      if (!password || password.length < 12) {
        setError("Password must be at least 12 characters.");
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setError("Password must contain at least one uppercase letter.");
        return;
      }
      if (!/[a-z]/.test(password)) {
        setError("Password must contain at least one lowercase letter.");
        return;
      }
      if (!/\d/.test(password)) {
        setError("Password must contain at least one number.");
        return;
      }
      if (!/[@$!%*?&]/.test(password)) {
        setError("Password must contain at least one special character (@$!%*?&).");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    } else {
      // For existing accounts, just validate password is not empty
      if (!password) {
        setError("Please enter your password.");
        return;
      }
    }

    setLoading(true);

    try {
      // 1 ── Clear any stale/expired session to avoid refresh token errors
      await supabase.auth.signOut({ scope: "local" });

      // 2 ── Create or sign in to Supabase account
      let userId: string | undefined;
      let authError: any = null;

      // For existing accounts, try sign in first. For new, try sign up first
      if (isExistingAccount) {
        console.log("[TrialBilling] Existing account detected, signing in...");
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          console.error("[TrialBilling] Sign in error:", signInError);
          setError(signInError.message || "Sign in failed. Please check your password.");
          setLoading(false);
          return;
        }
        userId = signInData.user?.id;
      } else {
        console.log("[TrialBilling] New account, signing up...");
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
            console.log("[TrialBilling] Account already exists, trying sign in...");
            // Account exists — try signing in
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (signInError) {
              console.error("[TrialBilling] Sign in error:", signInError);
              if (msg.includes("rate limit") || signUpError.status === 429) {
                setError("Too many attempts. Please wait a minute and try again.");
              } else {
                setError("Invalid password. Please try again.");
              }
              setLoading(false);
              return;
            }
            userId = signInData.user?.id;
          } else {
            console.error("[TrialBilling] Sign up error:", signUpError);
            setError(signUpError.message);
            setLoading(false);
            return;
          }
        } else {
          userId = signUpData.user?.id;
        }
      }

      if (!userId) {
        userId = (await supabase.auth.getUser()).data.user?.id;
      }

      if (!userId) {
        setError("Could not create account. Please try again.");
        setLoading(false);
        return;
      }

      console.log("[TrialBilling] Creating checkout with planType:", planType);

      // 2 ── Create Stripe Checkout Session and redirect
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-subscription-checkout",
        { body: { userId, email, promoCode: promoCode.trim() || undefined, billingPeriod, planType } }
      );

      if (fnError || !data?.url) {
        console.error("[TrialBilling] Checkout error:", fnError, data);
        setError("Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }

      // 3 ── Save pending state to Firestore (non-blocking)
      try {
        await saveSubscriptionInfo(docId, "stripe_pending", planType);
      } catch {
        // Non-fatal
      }

      console.log("[TrialBilling] Redirecting to checkout URL");

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
                <label className="block text-sm font-medium mb-1">
                  {isExistingAccount ? "Password" : "Password"}
                </label>
                <input
                  type="password"
                  placeholder={isExistingAccount ? "Enter your password" : "Minimum 12 characters"}
                  className="w-full p-2 border rounded bg-transparent text-white placeholder:text-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {!isExistingAccount && (
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
              )}
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
                      "$0 for 1 day, then $29/month",
                      "Unlimited AI Tutor with voice",
                      "Access all piano course modules",
                      "Advanced progress analytics",
                      "Priority support",
                      "Cancel anytime from Stripe Customer Portal",
                    ]
                  : [
                      billingPeriod === "yearly" ? "$0 for 1 day, then $199/year" : "$0 for 1 day, then $17/month",
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

            <div className="text-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4">
              <h2 className="text-lg font-bold mb-1">
                {planType === "premium" ? "🎵 Musicable Pro" : "Student Plan"}
              </h2>
              {planType === "premium" ? (
                <>
                  <p className="text-xs text-green-600 font-semibold mb-2">✨ 1 Day Free Trial</p>
                  <p className="text-3xl font-black mt-2 text-green-500">$0<span className="text-sm text-muted-foreground"> today</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Then $29/month</p>
                  <p className="text-xs text-green-600 font-semibold mt-2">Includes AI Tutor with Voice</p>
                </>
              ) : billingPeriod === "yearly" ? (
                <>
                  <p className="text-xs text-green-600 font-semibold mb-2">✨ 1 Day Free Trial</p>
                  <p className="text-3xl font-black mt-2 text-green-500">$0<span className="text-sm text-muted-foreground"> today</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Then $199/year</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-green-600 font-semibold mb-2">✨ 1 Day Free Trial</p>
                  <p className="text-3xl font-black mt-2 text-green-500">$0<span className="text-sm text-muted-foreground"> today</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Then $17/month</p>
                </>
              )}
              <p className="text-sm text-muted-foreground mt-3">Cancel anytime</p>
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
              Card details required to start your 1-day free trial.
              You'll be charged {planType === "premium" ? "$29/month" : billingPeriod === "yearly" ? "$199/year" : "$17/month"} after 24 hours.
              Cancel anytime before then with no charge.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrialBilling;
