import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";

const AffiliatePromoSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-gradient-to-r from-pink/10 via-purple/10 to-pink/10 border-y border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-6 h-6 text-pink" />
              <span className="text-pink font-bold text-sm uppercase tracking-wider">Earn Money</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3 tracking-tighter">
              Become a <span className="text-pink">Musicable Affiliate</span>
            </h2>
            <p className="text-foreground/80 mb-4">
              Earn 15% recurring commission for every student you refer. Join 1000+ affiliates already making money with us.
            </p>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>✓ 15% recurring commission</li>
              <li>✓ 180-day cookie window</li>
              <li>✓ Real-time dashboard</li>
            </ul>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={() => navigate("/affiliate-register")}
              className="btn-primary whitespace-nowrap"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliatePromoSection;
