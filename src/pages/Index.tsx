import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { wasOAuthRedirect } from "@/lib/oauthState";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WhyPerfectSection from "@/components/WhyPerfectSection";
import GamifiedSection from "@/components/GamifiedSection";
import AssessmentSection from "@/components/AssessmentSection";
import Footer from "@/components/Footer";

const Index = () => {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    // OAuthRedirectHandler owns this redirect — let it navigate to /auth/callback
    if (wasOAuthRedirect) return;

    if (roles.length > 0) {
      navigate("/dashboard", { replace: true });
    } else {
      toast({
        title: "Subscription needed",
        description: "Please subscribe to access the dashboard.",
        variant: "destructive",
      });
      navigate("/signup", { replace: true });
    }
  }, [user, roles, loading, navigate, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <WhyPerfectSection />
        <GamifiedSection />
        <AssessmentSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
