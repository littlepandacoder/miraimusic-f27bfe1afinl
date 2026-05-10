import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
        <Link to="/signup">Start Free Trial</Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        Already subscribed?{" "}
        <Link to="/courses" className="underline text-primary">
          Activate access
        </Link>
      </p>
    </div>
  </div>
);

const Dashboard = () => {
  const { user, loading, hasRole, roles } = useAuth();
  const navigate = useNavigate();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (loading || !user) return;

    // Admins and teachers always get access via role
    if (hasRole("admin") || hasRole("teacher")) {
      setSubscribed(true);
      setCheckingSubscription(false);
      return;
    }

    // Students: role check first (fast), then fall back to user_subscriptions table
    if (hasRole("student")) {
      setSubscribed(true);
      setCheckingSubscription(false);
      return;
    }

    // No role yet — check user_subscriptions table directly (handles race between
    // PayPal onApprove saving subscription and the auth session refreshing roles)
    const checkPayPalSubscription = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("user_subscriptions")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn("[dashboard] Could not verify subscription:", error.message);
          setSubscribed(false);
        } else {
          setSubscribed(!!data);
        }
      } catch (err) {
        console.warn("[dashboard] Subscription check failed:", err);
        setSubscribed(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkPayPalSubscription();
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
