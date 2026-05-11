import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TeacherSubscriptionGate from "@/components/courses/TeacherSubscriptionGate";
import { Loader2 } from "lucide-react";

const TeacherSignup = () => {
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (!loading && user && roles.includes("teacher")) navigate("/dashboard");
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
      <TeacherSubscriptionGate />
      <Footer />
    </div>
  );
};

export default TeacherSignup;
