import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { FeaturePaywallModal } from "@/components/FeaturePaywallModal";
import { useState, useEffect } from "react";
import { Mic, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PianoHeroPage() {
  const { user } = useAuth();
  const subscription = useSubscriptionStatus();
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (!subscription.loading && !subscription.hasActiveSubscription) {
      setShowPaywall(true);
    }
  }, [subscription.loading, subscription.hasActiveSubscription]);

  if (!subscription.hasActiveSubscription && !subscription.loading) {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <FeaturePaywallModal
          isOpen={true}
          onClose={() => window.history.back()}
          featureName="Piano Hero"
          isTrialPlan={subscription.isTrialPlan}
          userId={user?.id}
          email={user?.email}
          onUpgradeSuccess={() => {
            window.location.href = "/piano_hero.html";
          }}
        />
      </div>
    );
  }

  // Redirect to actual game
  useEffect(() => {
    if (subscription.hasActiveSubscription) {
      window.location.href = "/piano_hero.html";
    }
  }, [subscription.hasActiveSubscription]);

  return (
    <div className="w-full h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Mic className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <p className="text-muted-foreground">Loading Piano Hero...</p>
      </div>
    </div>
  );
}
