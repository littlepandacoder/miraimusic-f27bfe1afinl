import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, GraduationCap, Users, BookOpen, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const TeacherSubscriptionGate = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-teacher-checkout",
        { body: { userId: user.id, email: user.email } }
      );

      if (fnError || !data?.url) {
        throw new Error(fnError?.message ?? "Failed to start checkout");
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error("[TeacherSubscriptionGate]", err);
      setError(err.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-black mb-2">Teacher Plan</h1>
          <p className="text-muted-foreground text-lg">
            Onboard up to 10 students. Add more seats anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Features */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">What's included</h2>
            {[
              { icon: Users,          text: "10 student seats included" },
              { icon: BookOpen,       text: "All course & foundation content" },
              { icon: GraduationCap,  text: "Live lesson scheduling" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm">{text}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-4">
              Need more than 10 students? Buy extra seats at <strong>$1/seat</strong> from your dashboard after subscribing.
            </p>
          </div>

          {/* Pricing card */}
          <Card className="bg-card border-primary/30 p-6 flex flex-col justify-center gap-5">
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-1">Monthly subscription</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black">$20</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">$20/month — cancel anytime</p>
            </div>

            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full h-12 text-base font-bold"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Redirecting…</>
                : <><CreditCard className="w-4 h-4 mr-2" /> Start Free Trial</>}
            </Button>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              Secure payment powered by Stripe
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeacherSubscriptionGate;
