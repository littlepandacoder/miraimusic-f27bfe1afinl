import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isTrialPlan: boolean; // true if on $8 first month, false if on $17 regular
  subscriptionId: string | null;
  planId: string | null;
  status: "active" | "cancelled" | "expired" | null;
  loading: boolean;
  error: string | null;
}

export const useSubscriptionStatus = (): SubscriptionStatus => {
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    isTrialPlan: false,
    subscriptionId: null,
    planId: null,
    status: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user?.id) {
      console.log("[useSubscriptionStatus] No user logged in");
      setSubscriptionData((prev) => ({ ...prev, loading: false, hasActiveSubscription: false }));
      return;
    }

    const fetchSubscriptionStatus = async () => {
      try {
        // Fetch subscription from Supabase
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("subscription_id, plan_id, status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("[useSubscriptionStatus] Query error:", error);
          throw error;
        }

        if (!data) {
          console.log("[useSubscriptionStatus] No subscription found for user", user.id);
          setSubscriptionData((prev) => ({
            ...prev,
            hasActiveSubscription: false,
            isTrialPlan: false,
            loading: false,
          }));
          return;
        }

        const isActive = data.status === "active";
        console.log("[useSubscriptionStatus] Subscription found:", { isActive, status: data.status, planId: data.plan_id });

        // Check Stripe subscription to determine if on trial or regular plan
        let isTrialPlan = false;
        if (isActive && data.subscription_id) {
          try {
            const response = await supabase.functions.invoke(
              "check-subscription-details",
              { body: { subscriptionId: data.subscription_id } }
            );

            if (response.data) {
              isTrialPlan = response.data.isTrialPlan || false;
              console.log("[useSubscriptionStatus] Trial plan check:", isTrialPlan);
            }
          } catch (err) {
            console.error("Error checking subscription details:", err);
            // Default to false if we can't determine
          }
        }

        setSubscriptionData({
          hasActiveSubscription: isActive,
          isTrialPlan,
          subscriptionId: data.subscription_id,
          planId: data.plan_id,
          status: data.status,
          loading: false,
          error: null,
        });
      } catch (err: any) {
        console.error("[useSubscriptionStatus] Fetch error:", err);
        setSubscriptionData((prev) => ({
          ...prev,
          loading: false,
          hasActiveSubscription: false,
          error: err.message || "Failed to fetch subscription status",
        }));
      }
    };

    fetchSubscriptionStatus();
  }, [user?.id]);

  return subscriptionData;
};
