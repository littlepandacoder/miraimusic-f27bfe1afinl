import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EmailCollection } from "@/components/EmailCollection";
import Onboarding from "@/components/Onboarding";
import TrialBilling from "@/components/TrialBilling";
import { saveEmail } from "@/lib/signupService";
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
  const [stage, setStage] = useState<Stage>("email");
  const [subNeeded, setSubNeeded] = useState(false);

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

  const handleBillingComplete = () => {
    // After successful payment, redirect to dashboard/courses
    navigate("/dashboard");
  };

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
    return (
      <>
        {subNeeded && (
          <div className="fixed top-0 inset-x-0 z-50 bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Subscription needed — please subscribe below to access the dashboard.
          </div>
        )}
        <div className={subNeeded ? "pt-12" : ""}>
          <EmailCollection onComplete={handleEmailSubmit} />
        </div>
      </>
    );
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

export default Signup;
