import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  avatar_url: string | null;
}

export interface PaymentHistory {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  description: string | null;
  invoice_url: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface SubscriptionInfo {
  subscription_id: string;
  plan_id: string;
  status: string;
  created_at: string;
  cancelled_at: string | null;
  cancel_at_period_end: boolean;
}

export const profileService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user || authUser.user.id !== userId) {
      throw new Error("Unauthorized");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return {
      ...data,
      email: authUser.user.email || "",
    };
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user || authUser.user.id !== userId) {
      throw new Error("Unauthorized");
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        first_name: updates.first_name,
        last_name: updates.last_name,
        full_name: updates.full_name,
        avatar_url: updates.avatar_url,
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      email: authUser.user.email || "",
    };
  },

  async updateEmail(userId: string, newEmail: string, password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${window.location.origin}/dashboard` }
    );

    if (error) throw error;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user?.email) throw new Error("Not authenticated");

    // First verify current password by signing in with current credentials
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.user.email,
      password: currentPassword,
    });

    if (signInError) {
      throw new Error("Current password is incorrect");
    }

    // Then update to new password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },

  async getPaymentHistory(userId: string): Promise<PaymentHistory[]> {
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user || authUser.user.id !== userId) {
      throw new Error("Unauthorized");
    }

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getSubscriptionInfo(userId: string): Promise<SubscriptionInfo | null> {
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user || authUser.user.id !== userId) {
      throw new Error("Unauthorized");
    }

    try {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("subscription_id, plan_id, status, created_at, cancelled_at, cancel_at_period_end")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("[profileService] getSubscriptionInfo error:", error);
        return null;
      }

      return data || null;
    } catch (err) {
      console.error("[profileService] getSubscriptionInfo exception:", err);
      return null;
    }
  },

  async cancelSubscription(
    userId: string,
    reason: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<void> {
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user || authUser.user.id !== userId) {
      throw new Error("Unauthorized");
    }

    try {
      const { data: subscription, error: fetchError } = await supabase
        .from("user_subscriptions")
        .select("subscription_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError || !subscription) {
        console.error("[profileService] cancelSubscription - no subscription found:", fetchError);
        throw new Error("No active subscription found");
      }

      // Call edge function to cancel subscription with Stripe
      const { error } = await supabase.functions.invoke("cancel-subscription", {
        body: {
          subscriptionId: subscription.subscription_id,
          reason,
          cancelAtPeriodEnd,
        },
      });

      if (error) throw error;

      // Update local record
      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          cancelled_at: !cancelAtPeriodEnd ? new Date().toISOString() : null,
          cancellation_reason: reason,
          cancel_at_period_end: cancelAtPeriodEnd,
          status: !cancelAtPeriodEnd ? "cancelled" : "active",
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;
    } catch (err: any) {
      console.error("[profileService] cancelSubscription error:", err);
      throw err;
    }
  },
};
