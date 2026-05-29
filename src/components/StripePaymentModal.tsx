import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  email: string;
  onSuccess?: (subscriptionId: string) => void;
}

export const StripePaymentModal = ({
  isOpen,
  onClose,
  userId,
  email,
  onSuccess,
}: StripePaymentModalProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");

  // Request payment intent when modal opens
  useState(() => {
    if (!isOpen || clientSecret) return;

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "create-payment-intent",
          { body: { userId, email } }
        );

        if (fnError || !data?.clientSecret) {
          throw new Error(fnError?.message ?? "Failed to create payment intent");
        }

        setClientSecret(data.clientSecret);
        setSubscriptionId(data.subscriptionId);
      } catch (err: any) {
        setError(err.message ?? "Failed to initialize payment");
      }
    })();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      const { error: confirmError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          clientSecret,
          redirect: "if_required",
        });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent.status === "succeeded") {
        onSuccess?.(subscriptionId);
        onClose();
      }
    } catch (err: any) {
      setError(err.message ?? "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/30">
          <h2 className="text-xl font-bold">Complete Payment</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Pricing info */}
          <div className="bg-pink/10 border border-pink/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">First month</p>
            <p className="text-3xl font-black text-pink">$8</p>
            <p className="text-xs text-muted-foreground mt-1">Then $17/month after</p>
          </div>

          {/* Payment form */}
          {clientSecret && (
            <PaymentElement
              options={{
                layout: "tabs",
              }}
            />
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            disabled={!stripe || !elements || loading || !clientSecret}
            className="w-full h-12 font-bold bg-pink hover:bg-pink/90"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Processing…
              </>
            ) : (
              "Pay $8 & Start Learning"
            )}
          </Button>

          {/* Footer text */}
          <p className="text-xs text-center text-muted-foreground">
            Your card is charged $8 today. You'll be billed $17/month on day 30.
            Cancel anytime from your account settings.
          </p>
        </form>
      </div>
    </div>
  );
};
