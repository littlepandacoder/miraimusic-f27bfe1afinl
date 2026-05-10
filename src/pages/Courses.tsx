import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import PayPalSubscriptionGate from "@/components/courses/PayPalSubscriptionGate";

const Courses = () => {
  const { user, loading, hasRole, roles } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user) {
      if (hasRole("admin") || hasRole("teacher")) {
        // Admins manage courses from the admin dashboard
        navigate("/dashboard/courses");
        return;
      }
      if (hasRole("student")) {
        // Paid students go to the course library in their dashboard
        navigate("/dashboard/courses");
        return;
      }
      setChecked(true);
    }
  }, [loading, user, roles, hasRole, navigate]);

  if (loading || (!checked && !!user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // User is logged in but has no subscription — show PayPal gate
  return <PayPalSubscriptionGate />;
};

export default Courses;
