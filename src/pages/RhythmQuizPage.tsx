import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { FeaturePaywallModal } from "@/components/FeaturePaywallModal";
import { useState, useEffect } from "react";
import { Music } from "lucide-react";

export default function RhythmQuizPage() {
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
          featureName="Rhythm Quiz"
          isTrialPlan={subscription.isTrialPlan}
          userId={user?.id}
          email={user?.email}
          onUpgradeSuccess={() => {
            window.location.href = "/rhythm-quiz.html";
          }}
        />
      </div>
    );
  }

  // Redirect to actual game
  useEffect(() => {
    if (subscription.hasActiveSubscription) {
      window.location.href = "/rhythm-quiz.html";
    }
  }, [subscription.hasActiveSubscription]);

  return (
    <div className="w-full h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Music className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <p className="text-muted-foreground">Loading Rhythm Quiz...</p>
      </div>
    </div>
  );
}
