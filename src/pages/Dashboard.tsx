import { useEffect, useState } from "react";
const log  = import.meta.env.DEV ? console.log.bind(console)  : () => {};
const warn = import.meta.env.DEV ? console.warn.bind(console) : () => {};
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import { DashboardErrorBoundary } from "@/components/DashboardErrorBoundary";
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
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    log("[dashboard] auth state — loading:", loading, "user:", user?.email ?? "null");
    if (!loading && !user) {
      log("[dashboard] no user → redirecting to /login");
      window.location.replace("/login");
    }
  }, [user, loading]);

  useEffect(() => {
    log("[dashboard] subscription effect — loading:", loading, "user:", user?.email ?? "null", "roles:", roles);
    if (loading || !user) {
      log("[dashboard] waiting — loading or no user, skipping subscription check");
      return;
    }

    const isStaff = roles.some(r => r === "admin" || r === "teacher");
    log("[dashboard] isStaff:", isStaff, "roles:", roles);

    if (isStaff) {
      log("[dashboard] staff user → granting access immediately");
      setSubscribed(true);
      setCheckingSubscription(false);
      return;
    }

    log("[dashboard] non-staff user → checking user_subscriptions table");
    let cancelled = false;

    // On timeout: if user already has roles they passed auth — grant access rather than blocking.
    const timeout = setTimeout(() => {
      if (!cancelled) {
        const hasRoles = roles.length > 0;
        warn("[dashboard] subscription check TIMED OUT — roles present:", hasRoles, "→ granting access");
        setSubscribed(hasRoles);
        setCheckingSubscription(false);
      }
    }, 10_000);

    const checkPayPalSubscription = async () => {
      try {
        log("[dashboard] querying user_subscriptions for user:", user.id);
        const { data, error } = await (supabase as any)
          .from("user_subscriptions")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        log("[dashboard] user_subscriptions result — data:", data, "error:", error?.message ?? error);
        if (error) {
          warn("[dashboard] subscription query error:", error.message, "— roles present:", roles.length > 0);
          setSubscribed(roles.length > 0);
        } else {
          log("[dashboard] subscribed:", !!data);
          setSubscribed(!!data);
        }
      } catch (err) {
        if (!cancelled) {
          warn("[dashboard] subscription check threw:", err);
          setSubscribed(false);
        }
      } finally {
        if (!cancelled) {
          clearTimeout(timeout);
          setCheckingSubscription(false);
          log("[dashboard] setCheckingSubscription(false) ✓");
        }
      }
    };

    checkPayPalSubscription();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [loading, user, roles]);

  log("[dashboard] RENDER — loading:", loading, "checkingSubscription:", checkingSubscription, "subscribed:", subscribed, "roles:", roles, "user:", user?.email ?? "null");

  if (loading || checkingSubscription) {
    log("[dashboard] → showing spinner (loading:", loading, "checkingSubscription:", checkingSubscription, ")");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    log("[dashboard] → returning null (no user)");
    return null;
  }

  if (!subscribed) {
    log("[dashboard] → showing SubscriptionGate (not subscribed)");
    return <SubscriptionGate />;
  }

  log("[dashboard] → rendering dashboard for role:", hasRole("admin") ? "admin" : hasRole("teacher") ? "teacher" : "student");
  if (hasRole("admin")) return <DashboardErrorBoundary><AdminDashboard /></DashboardErrorBoundary>;
  if (hasRole("teacher")) return <DashboardErrorBoundary><TeacherDashboard /></DashboardErrorBoundary>;
  return <DashboardErrorBoundary><StudentDashboard /></DashboardErrorBoundary>;
};

export default Dashboard;
