import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    // Authenticated user on the marketing page → send to the app.
    // Default to /dashboard even when roles are empty (transient fetch failure)
    // to avoid wrongly routing paying users to /signup.
    navigate("/dashboard", { replace: true });
  }, [user, roles, loading, navigate]);

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
