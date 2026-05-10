import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmailCollection } from "@/components/EmailCollection";
import Onboarding from "@/components/Onboarding";
import TrialBilling from "@/components/TrialBilling";
import { Loader2 } from "lucide-react";
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

export default Signup;
