import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AffiliateSignupGate from "@/components/AffiliateSignupGate";
import { Loader2 } from "lucide-react";

const AffiliateSignup = () => {
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Allow signup if: user exists AND (is student OR teacher)
    // Redirect only if explicitly not authenticated
    if (!loading && !user) navigate("/login");
    // If user is already an affiliate, redirect to affiliate dashboard
    if (!loading && user && roles.includes("affiliate")) navigate("/affiliate-dashboard");
  }, [loading, user, roles, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <AffiliateSignupGate />
      <Footer />
    </div>
  );
};

export default AffiliateSignup;
