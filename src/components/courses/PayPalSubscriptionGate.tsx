import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Lock, Music, Users, Zap } from "lucide-react";
import { Loader2 } from "lucide-react";

const PayPalSubscriptionGate = () => {
  const { user } = useAuth();
  const [subscriptionProcessing, setSubscriptionProcessing] = useState(false);

  useEffect(() => {
    // Load PayPal script
    const script = document.createElement("script");
    script.src =
      "https://www.paypal.com/sdk/js?client-id=AZUMX5DxfcX4D8ehTfPRz939Ap79dAuOobQojsbeSv6LKTfkCcS_xoxLGHUv0SZum7OfOA1wKI6BGerr&vault=true&intent=subscription";
    script.async = true;
    document.body.appendChild(script);

    // Initialize PayPal after script loads
    script.onload = () => {
      if (window.paypal) {
        window.paypal
          .Buttons({
            style: {
              shape: "pill",
              color: "gold",
              layout: "vertical",
              label: "subscribe",
            },
            createSubscription: function (data: any, actions: any) {
              return actions.subscription.create({
                plan_id: "P-17K32045868578318NHXU6LA",
              });
            },
            onApprove: async function (data: any) {
              setSubscriptionProcessing(true);
              try {
                // Save subscription to Supabase
                if (user) {
                  const { error } = await supabase.from("user_subscriptions").insert({
                    user_id: user.id,
                    subscription_id: data.subscriptionID,
                    status: "active",
                    plan_id: "P-17K32045868578318NHXU6LA",
                    created_at: new Date().toISOString(),
                  });

                  if (error) {
                    console.error("Error saving subscription:", error);
                    alert("Error saving subscription. Please contact support.");
                    return;
                  }

                  // Reload page to refresh subscription status
                  alert(
                    "Subscription successful! Redirecting to courses..."
                  );
                  window.location.reload();
                }
              } catch (err) {
                console.error("Subscription error:", err);
                alert("Error processing subscription. Please try again.");
              } finally {
                setSubscriptionProcessing(false);
              }
            },
            onError: function (err: any) {
              console.error("PayPal error:", err);
              alert("Payment error. Please try again.");
              setSubscriptionProcessing(false);
            },
          })
          .render("#paypal-button-container");
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="container mx-auto px-4 py-4">
          <a href="/" className="text-2xl font-black text-foreground">
            Musicable
          </a>
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
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  What You Get
                </h2>

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
                  <div className="inline-block w-16 h-16 rounded-full bg-pink/20 flex items-center justify-center mb-4">
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
                <div
                  id="paypal-button-container"
                  className="mb-4"
                />

                {subscriptionProcessing && (
                  <div className="flex items-center justify-center gap-2 text-pink py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing your subscription...
                  </div>
                )}

                <div className="text-center text-xs text-muted-foreground">
                  💳 Secure payment powered by PayPal
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
                <h3 className="font-bold text-foreground mb-2">
                  Can I cancel anytime?
                </h3>
                <p className="text-muted-foreground">
                  Yes! You can cancel your subscription at any time through your
                  PayPal account. No questions asked.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-2">
                  Do you offer a trial?
                </h3>
                <p className="text-muted-foreground">
                  Check back soon! We'll be offering a free trial period for new
                  members in the near future.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-2">
                  What if I have questions?
                </h3>
                <p className="text-muted-foreground">
                  Our community and instructors are available 24/7 to help you
                  succeed in your piano journey.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-2">
                  Will I get certificates?
                </h3>
                <p className="text-muted-foreground">
                  Yes! Complete courses and earn certificates to showcase your
                  achievements.
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
