/**
 * StripeSubscriptionGate
 * Shown when a logged-in user has no active subscription and tries to access /courses.
 * Redirects them to Stripe Checkout to start their first month for $8.
 */
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Music, Users, Zap, Loader2, CreditCard, ShieldCheck } from "lucide-react";

const StripeSubscriptionGate = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-subscription-checkout",
        { body: { userId: user.id, email: user.email } }
      );

      if (fnError || !data?.url) {
        throw new Error(fnError?.message ?? "Failed to start checkout");
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error("[StripeSubscriptionGate]", err);
      setError(err.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-black text-foreground">Musicable</a>
        </div>
      </nav>

      <main className="pt-24 pb-20">
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
              <p className="text-xl text-muted-foreground">
                Get unlimited access to all piano courses, practice tools, and new content weekly.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Features */}
              <div className="space-y-5">
                <h2 className="text-2xl font-bold mb-4">What You Get</h2>
                {[
                  { icon: Music,  title: "All Piano Courses",     desc: "Beginner to advanced — structured and comprehensive" },
                  { icon: Zap,    title: "New Content Weekly",    desc: "Fresh videos and materials added every week" },
                  { icon: Users,  title: "Community Support",     desc: "Connect with students and get help from instructors" },
                  { icon: Music,  title: "Practice Tools",        desc: "Sheet music, backing tracks, and practice guides" },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <Icon className="w-6 h-6 text-pink mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-bold">{title}</h3>
                      <p className="text-muted-foreground text-sm">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout card */}
              <Card className="bg-gradient-to-br from-pink/10 to-navy/5 border-pink/30 p-8 flex flex-col justify-center gap-5">
                <div className="text-center">
                  <div className="inline-flex w-16 h-16 rounded-full bg-pink/20 items-center justify-center mb-3">
                    <Lock className="w-8 h-8 text-pink" />
                  </div>
                  <h3 className="text-2xl font-bold">First Month $8</h3>
                  <p className="text-3xl font-black mt-1">$17<span className="text-base font-normal text-muted-foreground">/month after</span></p>
                  <p className="text-sm text-muted-foreground">Cancel anytime — no long-term commitment</p>
                </div>

                <Button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full h-12 text-base font-bold bg-pink hover:bg-pink/90 text-white border-0"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Redirecting…</>
                    : <><CreditCard className="w-4 h-4 mr-2" /> Start for $8</>}
                </Button>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  Secure payment powered by Stripe
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-card/20 border-y border-border/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div>
                <h3 className="font-bold mb-2">Can I cancel anytime?</h3>
                <p className="text-muted-foreground text-sm">Yes — cancel from the Stripe Customer Portal at any time. You keep access until the end of your billing period.</p>
              </div>
              <div>
                <h3 className="font-bold mb-2">What happens after the trial?</h3>
                <p className="text-muted-foreground text-sm">After 7 days your card is charged $17/month from month 2 onwards.</p>
              </div>
              <div>
                <h3 className="font-bold mb-2">Is my payment secure?</h3>
                <p className="text-muted-foreground text-sm">All payments are processed by Stripe — a PCI-DSS Level 1 certified payment processor. We never store your card details.</p>
              </div>
              <div>
                <h3 className="font-bold mb-2">Will I get certificates?</h3>
                <p className="text-muted-foreground text-sm">Yes! Complete courses and earn certificates to showcase your achievements.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StripeSubscriptionGate;
