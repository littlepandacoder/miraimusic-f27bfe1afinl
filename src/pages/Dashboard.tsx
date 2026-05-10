import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const SubscriptionGate = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="max-w-md text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <Lock className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold">Subscription Required</h1>
      <p className="text-muted-foreground">
        You need an active subscription to access the Music Learning Portal. Choose a plan to start your musical journey.
      </p>
      <Button asChild size="lg" className="w-full">
        <Link to="/pricing">View Plans</Link>
      </Button>
    </div>
  </div>
);

const Dashboard = () => {
  const { user, loading, hasRole, roles } = useAuth();
  const navigate = useNavigate();
  // TODO: Replace with real Stripe subscription check
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user) {
      // Admins, teachers, and students (assigned via signup trigger) get access
      if (hasRole("admin") || hasRole("teacher") || hasRole("student")) {
        setSubscribed(true);
      } else {
        setSubscribed(false);
      }
      setCheckingSubscription(false);
    }
  }, [loading, user, roles, hasRole]);

  if (loading || checkingSubscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!subscribed) {
    return <SubscriptionGate />;
  }

  if (hasRole("admin")) return <AdminDashboard />;
  if (hasRole("teacher")) return <TeacherDashboard />;
  return <StudentDashboard />;
};

export default Dashboard;
