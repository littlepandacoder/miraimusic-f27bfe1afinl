import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const useUpgradeSubscription = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upgrade = async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/upgrade-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data.error || "Failed to upgrade subscription";
        setError(message);
        toast({
          title: "Upgrade Failed",
          description: message,
          variant: "destructive",
        });
        setLoading(false);
        return false;
      }

      toast({
        title: "Upgrade Successful!",
        description: "You've been upgraded to Musicable Pro. Enjoy unlimited AI Tutor!",
        variant: "default",
      });

      // Refresh after 2 seconds to reflect the new subscription
      setTimeout(() => {
        window.location.reload();
      }, 2000);

      return true;
    } catch (err: any) {
      const message = err.message || "An error occurred during upgrade";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setLoading(false);
      return false;
    }
  };

  return { upgrade, loading, error };
};
