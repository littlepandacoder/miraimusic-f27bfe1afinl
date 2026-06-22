import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EmailCollection } from "@/components/EmailCollection";
import Onboarding from "@/components/Onboarding";
import TrialBilling from "@/components/TrialBilling";
import { saveEmail } from "@/lib/signupService";
import { logClick } from "@/lib/affiliateService";
import { supabase } from "@/integrations/supabase/client";
import { recordConversion } from "@/lib/affiliateService";
import { Loader2, AlertCircle } from "lucide-react";
interface OnboardingData {
  email: string;
  goals: string[];
  skillLevel: string;
  topics: string[];
  genres: string[];
}

type Stage = "email" | "onboarding" | "billing" | "loading";

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams]  = useSearchParams();
  const [stage, setStage] = useState<Stage>("email");
  const [subNeeded, setSubNeeded] = useState(false);

  // ── Affiliate referral tracking ─────────────────────────────────────
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("musicable_ref_code", ref.toUpperCase());
      logClick(ref.toUpperCase()); // fire-and-forget click log
    }
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("sub_needed") === "1") {
      setSubNeeded(true);
      sessionStorage.removeItem("sub_needed");
    }

    const oauthEmail = sessionStorage.getItem("oauth_email");
    if (oauthEmail) {
      sessionStorage.removeItem("oauth_email");
      setEmail(oauthEmail);
      setIsLoading(true);
      (async () => {
        try {
          const docId = await saveEmail(oauthEmail);
          setDocId(docId);
          setStage("onboarding");
        } catch (err) {
          console.error("Failed to save OAuth email:", err);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, []);
  const [email, setEmail] = useState("");
  const [docId, setDocId] = useState("");
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (submittedEmail: string, signupDocId: string) => {
    setEmail(submittedEmail);
    setDocId(signupDocId);
    setStage("onboarding");
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    setOnboardingData(data);
    setIsLoading(false);
    setStage("billing");
  };

  const handleBillingComplete = async () => {
    // Record affiliate conversion if this signup came via a referral link
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await recordConversion(user.id, user.email ?? email, 8);
    } catch { /* non-critical */ }
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const renderStage = () => {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-pink" />
            <p className="text-foreground font-semibold">Processing your information...</p>
          </div>
        </div>
      );
    }

    if (stage === "email") {
      return <EmailCollection onComplete={handleEmailSubmit} />;
    }

    if (stage === "onboarding") {
      return (
        <Onboarding
          email={email}
          docId={docId}
          onComplete={handleOnboardingComplete}
        />
      );
    }

    if (stage === "billing" && onboardingData && docId) {
      return (
        <TrialBilling
          email={email}
          docId={docId}
          onboardingData={onboardingData}
          onComplete={handleBillingComplete}
        />
      );
    }

    return null;
  };

  return (
    <>
      {subNeeded && (
        <div className="fixed top-0 inset-x-0 z-50 bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Subscription needed — please subscribe below to access the dashboard.
          <button onClick={handleLogout} className="underline hover:opacity-80">
            Log out
          </button>
        </div>
      )}
      <div className={subNeeded ? "pt-12" : ""}>
        {renderStage()}
      </div>
    </>
  );
};

export default Signup;
