import { useState } from "react";
import { format } from "date-fns";
import { Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/lib/profileService";
import { useBillingPortal } from "@/hooks/useBillingPortal";
import CancellationDialog from "./CancellationDialog";

interface SubscriptionTabProps {
  subscription: any;
  userId: string;
}

const SubscriptionTab = ({ subscription, userId }: SubscriptionTabProps) => {
  const [isLoadingCancel, setIsLoadingCancel] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const { toast } = useToast();
  const { openPortal, loading: portalLoading } = useBillingPortal();

  const handleCancelConfirm = async (reason: string) => {
    try {
      setIsLoadingCancel(true);
      await profileService.cancelSubscription(userId, reason, true);

      toast({
        title: "Success",
        description:
          "Subscription has been cancelled. You'll retain access until the end of your billing period.",
      });

      setShowCancellationDialog(false);
      // Reload page to show updated status
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCancel(false);
    }
  };

  if (!subscription) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 md:p-8 text-center">
        <AlertCircle className="w-10 md:w-12 h-10 md:h-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
        <h3 className="text-base md:text-lg font-semibold mb-2">No Active Subscription</h3>
        <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
          You don't have an active subscription yet.
        </p>
        <Button className="w-full sm:w-auto">Upgrade to Premium</Button>
      </div>
    );
  }

  const isActive = subscription.status === "active";
  const isCancelled = subscription.status === "cancelled";
  const cancelledAt = subscription.cancelled_at
    ? new Date(subscription.cancelled_at)
    : null;
  const createdAt = new Date(subscription.created_at);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Status Card */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 md:gap-4">
          <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
            {isActive && (
              <CheckCircle className="w-5 md:w-6 h-5 md:h-6 text-green-500 mt-0.5 md:mt-1 shrink-0" />
            )}
            {isCancelled && (
              <AlertCircle className="w-5 md:w-6 h-5 md:h-6 text-yellow-500 mt-0.5 md:mt-1 shrink-0" />
            )}

            <div className="min-w-0">
              <h3 className="text-base md:text-lg font-semibold mb-1">
                {isActive ? "Active Subscription" : "Cancelled Subscription"}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                {isActive
                  ? "Your subscription is active and you have full access to premium features."
                  : "Your subscription has been cancelled but you retain access until the end of your billing period."}
              </p>
            </div>
          </div>

          <span
            className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
              isActive
                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
            }`}
          >
            {isActive ? "Active" : "Cancelled"}
          </span>
        </div>
      </div>

      {/* Subscription Details */}
      <div className="bg-card rounded-lg border border-border p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Subscription Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div>
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Plan</p>
            <p className="text-sm md:text-base font-medium">Premium Plan</p>
          </div>

          <div>
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Subscription ID</p>
            <p className="text-xs font-mono break-all">
              {subscription.subscription_id}
            </p>
          </div>

          <div>
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Started On</p>
            <p className="text-sm md:text-base font-medium">{format(createdAt, "MMM d, yyyy")}</p>
          </div>

          <div>
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Status</p>
            <p className="text-sm md:text-base font-medium capitalize">{subscription.status}</p>
          </div>

          {subscription.cancel_at_period_end && (
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2 md:p-3">
                <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0" />
                <div>
                  <p className="text-xs md:text-sm font-medium text-yellow-900 dark:text-yellow-200">
                    Access ends at billing period end
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    You'll lose access to premium features when your current billing period ends
                  </p>
                </div>
              </div>
            </div>
          )}

          {cancelledAt && (
            <div>
              <p className="text-xs md:text-sm text-muted-foreground mb-1">Cancelled On</p>
              <p className="text-sm md:text-base font-medium">{format(cancelledAt, "MMM d, yyyy")}</p>
            </div>
          )}

          {subscription.cancellation_reason && (
            <div className="sm:col-span-2">
              <p className="text-xs md:text-sm text-muted-foreground mb-1">Cancellation Reason</p>
              <p className="text-xs md:text-sm font-medium">{subscription.cancellation_reason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {isActive && (
        <div className="bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-900 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-2 text-red-900 dark:text-red-100">
            Cancel Subscription
          </h3>
          <p className="text-xs md:text-sm text-red-800 dark:text-red-200 mb-4">
            Cancelling your subscription will end your access to premium features at the end of
            your current billing period. Your data will be preserved.
          </p>
          <Button
            variant="destructive"
            onClick={() => setShowCancellationDialog(true)}
            disabled={isLoadingCancel}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            {isLoadingCancel && <Loader2 className="w-4 h-4 animate-spin" />}
            Cancel Subscription
          </Button>
        </div>
      )}

      {isActive && !subscription.cancel_at_period_end && (
        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-900 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-2 text-green-900 dark:text-green-100">
            Manage Billing
          </h3>
          <p className="text-xs md:text-sm text-green-800 dark:text-green-200 mb-4">
            Update your payment method, view invoices, or pause your subscription.
          </p>
          <Button
            variant="outline"
            onClick={() => openPortal(userId)}
            disabled={portalLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            {portalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Open Billing Portal
          </Button>
        </div>
      )}

      <CancellationDialog
        isOpen={showCancellationDialog}
        onClose={() => setShowCancellationDialog(false)}
        onConfirm={handleCancelConfirm}
        isLoading={isLoadingCancel}
      />
    </div>
  );
};

export default SubscriptionTab;
