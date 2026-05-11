import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Zap, ShieldCheck } from "lucide-react";

const features = [
  "7-day free trial — cancel anytime",
  "Access all Foundation & Course modules",
  "AI-powered piano feedback",
  "Gamified learning maps & quizzes",
  "Track your progress in real time",
  "1-on-1 live lessons with teachers",
  "Priority lesson booking",
  "Community access",
];

const Pricing = () => {
  const { user, roles } = useAuth();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (user && roles.length > 0) {
      navigate("/dashboard");
    } else {
      navigate("/signup");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4">

          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold">Simple, honest pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              One Plan. <span className="text-primary">Everything Included.</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Start your 7-day free trial today. No hidden fees — just monthly access to the full Musicable platform.
            </p>
          </div>

          {/* Plan card */}
          <div className="max-w-md mx-auto">
            <Card className="relative bg-card border-primary ring-2 ring-primary/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold whitespace-nowrap">
                7-Day Free Trial Included
              </div>

              <CardHeader className="pb-4 text-center pt-8">
                <CardTitle className="text-2xl font-black mb-2">Musicable Pro</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black">$17</span>
                  <span className="text-muted-foreground text-lg">/month</span>
                </div>
                <p className="text-muted-foreground text-sm mt-2">
                  After your free trial. Cancel anytime via PayPal.
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full btn-hero"
                  size="lg"
                  onClick={handleCTA}
                >
                  {user && roles.length > 0 ? "Go to Dashboard" : "Start Free Trial"}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Secure payment via PayPal · Cancel anytime
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto mt-20 space-y-6">
            <h2 className="text-2xl font-black text-center mb-8">Common Questions</h2>
            {[
              {
                q: "What happens after the free trial?",
                a: "After 7 days your PayPal subscription activates at $17/month. You'll receive an email reminder before you're charged.",
              },
              {
                q: "How do I cancel?",
                a: "Log in to PayPal and cancel your subscription at any time. You keep access until the end of your billing period.",
              },
              {
                q: "Can I try before paying?",
                a: "Yes — your first 7 days are completely free. You won't be charged until the trial ends.",
              },
              {
                q: "Is there a student discount?",
                a: "Contact us at info@musicableapp.com and we'll be happy to help.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-border/40 pb-6">
                <h3 className="font-bold mb-2">{q}</h3>
                <p className="text-muted-foreground text-sm">{a}</p>
              </div>
            ))}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
