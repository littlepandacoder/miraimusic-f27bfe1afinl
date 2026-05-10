import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { saveSubscriptionInfo } from "@/lib/firestore";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    paypal: any;
  }
}

interface OnboardingData {
  email: string;
  goals: string[];
  skillLevel: string;
  topics: string[];
  genres: string[];
}

interface TrialBillingProps {
  email: string;
  docId: string;
  onboardingData: OnboardingData;
  onComplete: () => void;
}

const TrialBilling = ({ email, docId, onboardingData, onComplete }: TrialBillingProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paypalReady, setPaypalReady] = useState(false);
  const [processingPaypal, setProcessingPaypal] = useState(false);

  const buttonRendered = useRef(false);
  const passwordRef = useRef(password);
  const confirmPasswordRef = useRef(confirmPassword);

  useEffect(() => { passwordRef.current = password; }, [password]);
  useEffect(() => { confirmPasswordRef.current = confirmPassword; }, [confirmPassword]);

  useEffect(() => {
    let isMounted = true;
    const scriptId = "paypal-sdk-script";

    const loadButtons = () => {
      if (window.paypal && isMounted) {
        setPaypalReady(true);
        setTimeout(() => renderPayPalButton(), 100);
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.paypal.com/sdk/js?client-id=AZUMX5DxfcX4D8ehTfPRz939Ap79dAuOobQojsbeSv6LKTfkCcS_xoxLGHUv0SZum7OfOA1wKI6BGerr&vault=true&intent=subscription";
      script.async = true;
      document.body.appendChild(script);
      script.onload = loadButtons;
    } else {
      loadButtons();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const renderPayPalButton = () => {
    if (!window.paypal || buttonRendered.current) return;

    const container = document.getElementById("paypal-button-container-trial");
    if (!container) return;

    buttonRendered.current = true;
    container.innerHTML = "";

    window.paypal
      .Buttons({
        style: { shape: "pill", color: "gold", layout: "vertical", label: "subscribe" },
        onClick: (_data: any, actions: any) => {
          const pw = passwordRef.current;
          const cpw = confirmPasswordRef.current;
          if (!pw || pw.length < 6) {
            setError("Please enter a password (minimum 6 characters) before paying.");
            return actions.reject();
          }
          if (pw !== cpw) {
            setError("Passwords do not match.");
            return actions.reject();
          }
          setError("");
          return actions.resolve();
        },
        createSubscription: (_data: any, actions: any) => {
          return actions.subscription.create({ plan_id: "P-17K32045868578318NHXU6LA" });
        },
        onApprove: async (data: any) => {
          setProcessingPaypal(true);
          try {
            const subscriptionId = data.subscriptionID;
            const pw = passwordRef.current;

            // Create Supabase account
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
              email,
              password: pw,
            });

            if (signUpError) {
              // If user already exists, try signing them in instead
              if (signUpError.message.includes("already registered") || signUpError.message.includes("already exists")) {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: pw });
                if (signInError) {
                  setError("Account already exists. Please log in at /login.");
                  setProcessingPaypal(false);
                  return;
                }
              } else {
                setError(signUpError.message);
                setProcessingPaypal(false);
                return;
              }
            }

            // Save subscription to Supabase
            const userId = authData?.user?.id ?? (await supabase.auth.getUser()).data.user?.id;
            if (userId) {
              await (supabase as any).from("user_subscriptions").insert({
                user_id: userId,
                subscription_id: subscriptionId,
                plan_id: "P-17K32045868578318NHXU6LA",
                status: "active",
              });
            }

            // Save to Firestore as backup
            await saveSubscriptionInfo(docId, subscriptionId, "trial");

            setTimeout(() => onComplete(), 500);
          } catch (err: any) {
            console.error("Signup error:", err);
            setError(err?.message || "Signup failed. Please try again.");
            setProcessingPaypal(false);
          }
        },
        onError: (err: any) => {
          console.error("PayPal error:", err);
          setError("Payment error. Please try again.");
          buttonRendered.current = false;
          setProcessingPaypal(false);
        },
      })
      .render("#paypal-button-container-trial");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <Button variant="ghost" onClick={() => window.history.back()} className="gap-2">
          <ArrowLeft size={20} /> Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Create Your Account</h1>
            <p className="text-muted-foreground">Set your password, then click the PayPal button to complete signup.</p>
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
                  className="w-full p-2 border rounded"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Repeat password"
                  className="w-full p-2 border rounded"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="pt-2 space-y-2">
                {[
                  "7-day free trial included",
                  "Access all piano course modules",
                  "Track your progress",
                  "Cancel anytime via PayPal",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check size={14} className="text-green-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-2">7-Day Free Trial</h2>
            <p className="text-sm text-muted-foreground mb-4">Then $23.25/month, cancel anytime.</p>
            <div id="paypal-button-container-trial" className="min-h-[150px]">
              {!paypalReady && <Loader2 className="animate-spin mx-auto" />}
            </div>
            {processingPaypal && (
              <div className="flex items-center justify-center gap-2 text-sm mt-4 text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Creating your account...
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrialBilling;
