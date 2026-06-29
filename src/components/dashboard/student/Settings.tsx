import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useBillingPortal } from "@/hooks/useBillingPortal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, ChevronRight } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const subscription = useSubscriptionStatus();
  const { openPortal, loading } = useBillingPortal();

  const handleManageBilling = async () => {
    if (user?.id) {
      await openPortal(user.id);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and subscription</p>
      </div>

      {/* Billing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Billing & Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription.loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {/* Subscription Status */}
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Subscription Status</p>
                    <p className="text-lg font-semibold">
                      {subscription.hasActiveSubscription ? "Active" : "No Active Subscription"}
                    </p>
                  </div>
                  <div>
                    {subscription.hasActiveSubscription && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        ✓ Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Plan Info */}
                {subscription.hasActiveSubscription && (
                  <>
                    <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                        <p className="text-lg font-semibold capitalize">
                          {subscription.planId?.includes("pro") || subscription.planId?.includes("premium")
                            ? "Musicable Pro"
                            : "Student Plan"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <p className="text-lg font-semibold capitalize">
                          {subscription.status || "Active"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Manage Billing Button */}
              {subscription.hasActiveSubscription && (
                <Button
                  onClick={handleManageBilling}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2"
                  variant="outline"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      Manage Billing & Invoices
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}

              {!subscription.hasActiveSubscription && (
                <p className="text-sm text-muted-foreground py-4">
                  You don't have an active subscription yet. Visit the pricing page to get started.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg font-semibold">{user?.email}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
