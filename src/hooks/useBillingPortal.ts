import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const useBillingPortal = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const openPortal = async (userId: string) => {
    setLoading(true);

    try {
      const response = await fetch("/api/billing-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Failed to open billing portal",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Redirect to Stripe billing portal
      window.location.href = data.url;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return { openPortal, loading };
};
