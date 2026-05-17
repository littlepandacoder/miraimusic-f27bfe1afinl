import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useSessionTracking } from "@/hooks/useSessionTracking";

const SubscriptionGate = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{t("subscription.required")}</h1>
        <p className="text-muted-foreground">{t("subscription.description")}</p>
        <Button asChild size="lg" className="w-full">
          <Link to="/signup">{t("subscription.startTrial")}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          {t("subscription.alreadySubscribed")}{" "}
          <Link to="/courses" className="underline text-primary">
            {t("subscription.activate")}
          </Link>
        </p>
      </div>
    </div>
  );
};

const SUB_CACHE_KEY = (uid: string) => `musicable_sub_v1_${uid}`;

function readSubCache(uid: string): boolean | null {
  try {
    const v = sessionStorage.getItem(SUB_CACHE_KEY(uid));
    return v !== null ? v === "1" : null;
  } catch { return null; }
}

function writeSubCache(uid: string, value: boolean) {
  try { sessionStorage.setItem(SUB_CACHE_KEY(uid), value ? "1" : "0"); } catch {}
}

function clearSubCache(uid: string) {
  try { sessionStorage.removeItem(SUB_CACHE_KEY(uid)); } catch {}
}

const Dashboard = () => {
  const { user, loading, hasRole, roles } = useAuth();
  useSessionTracking(user); // record login + duration for every role

  // Initialise from sessionStorage so navigating back never shows a spinner
  const [subscribed, setSubscribed] = useState<boolean | null>(() =>
    user?.id ? readSubCache(user.id) : null
  );
  const [checkingSubscription, setCheckingSubscription] = useState(() =>
    user?.id ? readSubCache(user.id) === null : true
  );

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
      writeSubCache(user.id, true);
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
        // Only cache a positive result on timeout — a negative timeout is unreliable
        if (hasRoles) writeSubCache(user.id, true);
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
          const result = roles.length > 0;
          writeSubCache(user.id, result);
          setSubscribed(result);
        } else {
          const result = !!data;
          log("[dashboard] subscribed:", result);
          writeSubCache(user.id, result);
          setSubscribed(result);
        }
      } catch (err) {
        if (!cancelled) {
          warn("[dashboard] subscription check threw:", err);
          // Don't cache failures — let the next mount retry
          clearSubCache(user.id);
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
