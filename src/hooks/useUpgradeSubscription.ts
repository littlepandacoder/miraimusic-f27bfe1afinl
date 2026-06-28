import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useUpgradeSubscription = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upgrade = async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "upgrade-subscription",
        { body: { userId } }
      );

      if (fnError || !data?.success) {
        const message = data?.error || fnError?.message || "Failed to upgrade subscription";
        setError(message);
        toast({
          title: "Upgrade Failed",
          description: message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Upgrade Successful!",
        description: "You've been upgraded to Musicable Pro. Enjoy unlimited AI Tutor!",
        variant: "default",
      });

      return true;
    } catch (err: any) {
      const message = err.message || "An error occurred during upgrade";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { upgrade, loading, error };
};
