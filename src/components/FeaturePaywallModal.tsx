import { useState } from "react";
import { Lock, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FeaturePaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: "Piano Hero" | "Piano Room" | "Rhythm Quiz" | "Piano Theory";
  onUpgradeSuccess?: () => void;
  isTrialPlan?: boolean;
  userId?: string;
  email?: string;
}

export const FeaturePaywallModal = ({
  isOpen,
  onClose,
  featureName,
  onUpgradeSuccess,
  isTrialPlan,
  userId,
  email,
}: FeaturePaywallModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    if (!userId || !email) return;

    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "upgrade-subscription",
        { body: { userId, email } }
      );

      if (fnError || !data?.success) {
        throw new Error(fnError?.message ?? "Failed to upgrade subscription");
      }

      onUpgradeSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Upgrade failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-background rounded-2xl max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold">{featureName} Locked</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="space-y-3">
            <p className="text-sm sm:text-base text-foreground">
              {isTrialPlan
                ? `Upgrade to unlock ${featureName} and all premium features.`
                : `Subscribe to access ${featureName} and unlock your full learning potential.`}
            </p>

            {isTrialPlan && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <p className="text-xs sm:text-sm font-semibold text-primary mb-2">
                  Special Offer
                </p>
                <p className="text-sm sm:text-base font-bold">
                  Pay only <span className="text-primary">$9</span> more
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You've already paid $8. Upgrade to $17/month for just $9 today.
                </p>
              </div>
            )}

            {!isTrialPlan && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <p className="text-sm sm:text-base font-bold">
                  <span className="text-primary">$8</span> first month
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Then $17/month. Cancel anytime.
                </p>
              </div>
            )}
          </div>

          {/* Features included */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              You'll get access to:
            </p>
            <ul className="space-y-1.5 text-sm">
              {[
                `Unlimited ${featureName} access`,
                "All Foundation modules",
                "AI-powered feedback",
                "Progress tracking",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs sm:text-sm">
              {error}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-sm sm:text-base h-10 sm:h-12 font-bold"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  {isTrialPlan ? "Upgrading..." : "Processing..."}
                </>
              ) : (
                isTrialPlan ? "Pay $9 to Upgrade" : "Subscribe Now"
              )}
            </Button>

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full text-sm sm:text-base h-10 sm:h-12"
            >
              Cancel
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Your subscription will renew automatically. You can cancel anytime from account settings.
          </p>
        </div>
      </div>
    </div>
  );
};
