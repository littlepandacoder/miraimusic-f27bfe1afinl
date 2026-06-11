import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { FeaturePaywallModal } from "./FeaturePaywallModal";
import { useState, useEffect } from "react";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PianoRoomGuardProps {
  children?: React.ReactNode;
  showPaywall?: boolean;
}

export const PianoRoomGuard = ({ children, showPaywall = true }: PianoRoomGuardProps) => {
  const { user } = useAuth();
  const subscription = useSubscriptionStatus();
  const [openPaywall, setOpenPaywall] = useState(false);

  useEffect(() => {
    if (showPaywall && !subscription.loading && !subscription.hasActiveSubscription) {
      setOpenPaywall(true);
    }
  }, [subscription.loading, subscription.hasActiveSubscription, showPaywall]);

  if (!subscription.hasActiveSubscription && !subscription.loading) {
    return (
      <>
        <div className="w-full h-full bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Piano Room Locked</h2>
            <p className="text-muted-foreground mb-6">Subscribe to unlock this feature</p>
            <Button
              onClick={() => setOpenPaywall(true)}
              className="bg-primary hover:bg-primary/90"
            >
              Upgrade to Piano Room
            </Button>
          </div>
        </div>
        <FeaturePaywallModal
          isOpen={openPaywall}
          onClose={() => setOpenPaywall(false)}
          featureName="Piano Room"
          isTrialPlan={subscription.isTrialPlan}
          userId={user?.id}
          email={user?.email}
          onUpgradeSuccess={() => {
            window.location.reload();
          }}
        />
      </>
    );
  }

  return (
    <>
      {children}
      <FeaturePaywallModal
        isOpen={openPaywall}
        onClose={() => setOpenPaywall(false)}
        featureName="Piano Room"
        isTrialPlan={subscription.isTrialPlan}
        userId={user?.id}
        email={user?.email}
        onUpgradeSuccess={() => {
          setOpenPaywall(false);
          window.location.reload();
        }}
      />
    </>
  );
};
