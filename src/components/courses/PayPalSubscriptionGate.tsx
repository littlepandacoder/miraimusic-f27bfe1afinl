import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Lock, Music, Users, Zap, Loader2 } from "lucide-react";
import { PAYPAL_SDK_URL, PAYPAL_PLAN_ID, IS_SANDBOX, PAYPAL_MODE } from "@/lib/paypal";

declare global {
  interface Window {
    paypal: any;
  }
}

const PayPalSubscriptionGate = () => {
  const { user } = useAuth();
  const [subscriptionProcessing, setSubscriptionProcessing] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [error, setError] = useState("");
  const buttonRendered = useRef(false);

  useEffect(() => {
    const scriptId = "paypal-sdk-script";
    let isMounted = true;

    const renderButton = () => {
      if (!window.paypal || buttonRendered.current || !isMounted) return;

      const container = document.getElementById("paypal-button-container");
      if (!container) return;

      buttonRendered.current = true;
      container.innerHTML = "";

      window.paypal
        .Buttons({
          style: {
            shape: "pill",
            color: "gold",
            layout: "vertical",
            label: "subscribe",
          },
          createSubscription: (_data: any, actions: any) => {
            if (!PAYPAL_PLAN_ID) {
              setError("Payment configuration error. Please contact support.");
              return actions.reject();
            }
            return actions.subscription.create({ plan_id: PAYPAL_PLAN_ID });
          },
          onApprove: async (data: any) => {
            if (!user) return;
            setSubscriptionProcessing(true);
            setError("");
            try {
              // Record subscription + assign student role via SECURITY DEFINER RPC
              const { error: rpcError } = await (supabase as any).rpc("record_paypal_subscription", {
                p_user_id: user.id,
                p_sub_id: data.subscriptionID,
                p_plan_id: PAYPAL_PLAN_ID || "",
              });
              if (rpcError) {
                console.error("[paypal] record_paypal_subscription RPC error:", rpcError);
                setError("Error recording subscription. Please contact support.");
                setSubscriptionProcessing(false);
                return;
              }

              // Redirect to course library
              window.location.href = "/dashboard/courses";
            } catch (err: any) {
              console.error("Subscription error:", err);
              setError("Error processing subscription. Please try again.");
              setSubscriptionProcessing(false);
            }
          },
          onError: (err: any) => {
            console.error("PayPal error:", err);
            setError("Payment error. Please try again.");
            buttonRendered.current = false;
            setSubscriptionProcessing(false);
          },
        })
        .render("#paypal-button-container");

      if (isMounted) setPaypalReady(true);
    };

    // Remove stale script if SDK URL changed (e.g. sandbox ↔ live switch)
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing && existing.src !== PAYPAL_SDK_URL) {
      existing.remove();
      buttonRendered.current = false;
    }

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = PAYPAL_SDK_URL;
      script.async = true;
      script.onload = () => renderButton();
      document.body.appendChild(script);
    } else if (window.paypal) {
      renderButton();
    }

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-black text-foreground">
            Musicable
          </a>
          {IS_SANDBOX && (
            <span className="text-xs font-semibold bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-full">
              🧪 Sandbox — test mode {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("sandbox") === "1" ? "(URL override)" : ""}
            </span>
          )}
        </div>
      </nav>

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-pink/5 to-transparent pointer-events-none" />
          <div className="absolute top-20 left-10 w-64 h-64 bg-pink/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-pink/5 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <div className="inline-block px-4 py-2 bg-pink/20 text-pink rounded-full text-sm font-semibold mb-6">
                🎵 UNLOCK PREMIUM COURSES
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-foreground mb-6 leading-tight">
                Become a Piano <span className="text-pink">Master</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Get unlimited access to all our piano courses, videos, and practice resources
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Features */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground mb-6">What You Get</h2>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Music className="w-6 h-6 text-pink mt-1" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">All Piano Courses</h3>
                    <p className="text-muted-foreground">
                      From beginner to advanced, structured and comprehensive
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Zap className="w-6 h-6 text-pink mt-1" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">New Content Weekly</h3>
                    <p className="text-muted-foreground">
                      Fresh videos and practice materials added every week
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Users className="w-6 h-6 text-pink mt-1" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Community Support</h3>
                    <p className="text-muted-foreground">
                      Connect with other students and get help from instructors
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Music className="w-6 h-6 text-pink mt-1" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Practice Tools</h3>
                    <p className="text-muted-foreground">
                      Download sheet music, backing tracks, and practice guides
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Card */}
              <Card className="bg-gradient-to-br from-pink/10 to-navy/5 border-pink/30 p-8 flex flex-col justify-center">
                <div className="text-center mb-6">
                  <div className="inline-flex w-16 h-16 rounded-full bg-pink/20 items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-pink" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">
                    Monthly Subscription
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    Cancel anytime, no long-term commitment
                  </p>
                </div>

                {/* PayPal Button */}
                <div id="paypal-button-container" className="mb-4 min-h-[80px]">
                  {!paypalReady && !subscriptionProcessing && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-pink" />
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center mb-2">{error}</p>
                )}

                {subscriptionProcessing && (
                  <div className="flex items-center justify-center gap-2 text-pink py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing your subscription...
                  </div>
                )}

                <div className="text-center text-xs text-muted-foreground mt-2">
                  💳 Secure payment powered by PayPal
                  {IS_SANDBOX && " (Sandbox — test mode)"}
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-card/20 border-y border-border/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">
              Frequently Asked Questions
            </h2>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div>
                <h3 className="font-bold text-foreground mb-2">Can I cancel anytime?</h3>
                <p className="text-muted-foreground">
                  Yes! You can cancel your subscription at any time through your PayPal account. No questions asked.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-2">Do you offer a trial?</h3>
                <p className="text-muted-foreground">
                  Check back soon! We'll be offering a free trial period for new members in the near future.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-2">What if I have questions?</h3>
                <p className="text-muted-foreground">
                  Our community and instructors are available 24/7 to help you succeed in your piano journey.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-2">Will I get certificates?</h3>
                <p className="text-muted-foreground">
                  Yes! Complete courses and earn certificates to showcase your achievements.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PayPalSubscriptionGate;
