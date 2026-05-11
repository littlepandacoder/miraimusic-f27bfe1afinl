import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, GraduationCap, Users, KeyboardMusic, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PAYPAL_SDK_URL, PAYPAL_TEACHER_PLAN_ID, IS_SANDBOX } from "@/lib/paypal";

const TeacherSubscriptionGate = () => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [error, setError] = useState("");
  const buttonRendered = useRef(false);

  useEffect(() => {
    if (!PAYPAL_TEACHER_PLAN_ID) {
      setError("Teacher plan not configured yet. Contact support to get started.");
      return;
    }

    const scriptId = "paypal-sdk-script";
    let isMounted = true;

    const renderButton = () => {
      if (!window.paypal || buttonRendered.current || !isMounted) return;
      const container = document.getElementById("teacher-paypal-btn");
      if (!container) return;

      buttonRendered.current = true;
      container.innerHTML = "";

      window.paypal.Buttons({
        style: { shape: "pill", color: "blue", layout: "vertical", label: "subscribe" },
        createSubscription: (_data: any, actions: any) => {
          return actions.subscription.create({ plan_id: PAYPAL_TEACHER_PLAN_ID });
        },
        onApprove: async (data: any) => {
          if (!user) return;
          setProcessing(true);
          setError("");
          try {
            const { error: rpcErr } = await (supabase as any).rpc("record_teacher_subscription", {
              p_user_id: user.id,
              p_sub_id:  data.subscriptionID,
              p_plan_id: PAYPAL_TEACHER_PLAN_ID,
            });
            if (rpcErr) throw rpcErr;
            window.location.href = "/dashboard";
          } catch (e: any) {
            setError("Error activating subscription. Please contact support.");
            setProcessing(false);
          }
        },
        onError: (err: any) => {
          console.error("[teacher-paypal]", err);
          setError("Payment error. Please try again.");
          buttonRendered.current = false;
          setProcessing(false);
        },
      }).render("#teacher-paypal-btn");

      if (isMounted) setPaypalReady(true);
    };

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing && existing.src !== PAYPAL_SDK_URL) { existing.remove(); buttonRendered.current = false; }

    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.id = scriptId; s.src = PAYPAL_SDK_URL; s.async = true;
      s.onload = renderButton;
      document.body.appendChild(s);
    } else if ((window as any).paypal) {
      renderButton();
    }

    return () => { isMounted = false; };
  }, [user]);

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-black mb-3">Teacher Plan</h1>
          <p className="text-muted-foreground text-lg">Onboard up to 10 students. Add more seats anytime.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-bold">What's included</h2>
            {[
              { icon: Users,          text: "10 student seats included" },
              { icon: KeyboardMusic,  text: "Full Piano Hero room access" },
              { icon: BookOpen,       text: "All course & foundation content" },
              { icon: GraduationCap,  text: "Live lesson scheduling" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm">{text}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-4">
              Need more than 10 students? Buy extra seats at <strong>$1/seat</strong> from your dashboard after subscribing.
            </p>
          </div>

          <Card className="bg-card border-primary/30 p-6 flex flex-col justify-center">
            <div className="text-center mb-6">
              <p className="text-muted-foreground text-sm mb-1">Monthly subscription</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black">$20</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Cancel anytime via PayPal</p>
            </div>

            {!PAYPAL_TEACHER_PLAN_ID ? (
              <p className="text-center text-sm text-muted-foreground border border-border rounded-lg p-4">
                Teacher plan coming soon — contact us at musicableapp@proton.me
              </p>
            ) : (
              <div id="teacher-paypal-btn" className="min-h-[80px]">
                {!paypalReady && !processing && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            {processing && (
              <div className="flex items-center justify-center gap-2 text-primary py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Activating your plan…
              </div>
            )}
            {IS_SANDBOX && (
              <p className="text-xs text-center text-muted-foreground mt-2">🧪 Sandbox — test mode</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeacherSubscriptionGate;
