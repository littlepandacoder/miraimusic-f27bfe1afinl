import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TrendingUp, DollarSign, Users, Zap, Check } from "lucide-react";

const AffiliateLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const benefits = [
    {
      icon: DollarSign,
      title: "Earn 30% Commission",
      desc: "Get 30% of every subscription referred — recurring monthly.",
    },
    {
      icon: Users,
      title: "Growing Community",
      desc: "Join 1000+ affiliates already earning with Musicable.",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Dashboard",
      desc: "Track clicks, conversions, and earnings anytime, anywhere.",
    },
    {
      icon: Zap,
      title: "Marketing Ready",
      desc: "Get ready-made banners, copy, and assets to promote.",
    },
  ];

  const features = [
    "30% recurring commission on all referrals",
    "Lifetime cookie window (180 days)",
    "Real-time performance dashboard",
    "Dedicated affiliate support",
    "Monthly payouts via Stripe",
    "Access to co-marketing resources",
    "No cap on earnings",
    "Works for teachers & students too",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main>
        {/* Hero */}
        <section className="py-20 lg:py-32 bg-gradient-to-b from-navy-dark/50 to-background">
          <div className="container mx-auto px-4 text-center">
            <p className="text-pink text-xs font-bold uppercase tracking-widest mb-4">Earn Money</p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-foreground mb-6 tracking-tighter">
              Become a <span className="text-pink">Musicable</span><br />Affiliate
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Earn 30% recurring commission for every student you refer. No limits. No catch.
            </p>
            <button
              onClick={() => navigate(user ? "/affiliate-signup" : "/login?next=/affiliate-signup")}
              className="btn-hero"
            >
              Start Earning Today
            </button>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-black text-center text-foreground mb-16 tracking-tighter">
              Why Join Our <span className="text-pink">Affiliate Program</span>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((b, i) => {
                const Icon = b.icon;
                return (
                  <div key={i} className="bg-card/50 border border-border/30 rounded-xl p-6 backdrop-blur-sm">
                    <div className="w-12 h-12 bg-pink/20 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-pink" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-navy-dark/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-black text-foreground mb-8 tracking-tighter">
                  Everything You Need
                </h2>
                <div className="space-y-3">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-pink flex-shrink-0 mt-0.5" />
                      <p className="text-foreground/85">{f}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-pink/20 to-purple/20 rounded-2xl p-12 border border-border/30 text-center">
                <div className="text-6xl font-black text-pink mb-4">30%</div>
                <p className="text-xl font-bold text-foreground mb-2">Recurring Commission</p>
                <p className="text-muted-foreground mb-8">
                  Earn every month your referrals stay subscribed. No expiration.
                </p>
                <div className="bg-background/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p>
                    Refer a student who pays $17/month?<br />
                    <span className="text-pink font-bold text-lg">You earn $5.10/month</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-black text-foreground mb-8 tracking-tighter">
              Ready to Start <span className="text-pink">Earning?</span>
            </h2>
            <button
              onClick={() => navigate(user ? "/affiliate-signup" : "/login?next=/affiliate-signup")}
              className="btn-primary text-lg px-10 py-5"
            >
              Become an Affiliate
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AffiliateLanding;
