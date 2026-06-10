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
import OnboardingWizard from "@/components/OnboardingWizard";
import AICoachWidget from "@/components/AICoachWidget";

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

const PausedMembershipGate = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Membership Paused</h1>
          <p className="text-muted-foreground text-sm">
            Your membership access has been paused. Reactivate your subscription to continue learning.
          </p>
        </div>
        <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90">
          <Link to="/pricing">Reactivate Membership</Link>
        </Button>
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
  const [isPaused, setIsPaused] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

    const checkStripeSubscription = async () => {
      try {
        log("[dashboard] querying user_subscriptions for user:", user.id);
        const { data, error } = await (supabase as any)
          .from("user_subscriptions")
          .select("id, status, paused_at")
          .eq("user_id", user.id)
          // Accept both active subscriptions and active trials, but exclude paused
          .in("status", ["active", "trialing"])
          .is("paused_at", null)
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        log("[dashboard] user_subscriptions result — data:", data, "error:", error?.message ?? error);
        if (error) {
          warn("[dashboard] subscription query error:", error.message, "— roles present:", roles.length > 0);
          const result = roles.length > 0;
          writeSubCache(user.id, result);
          setSubscribed(result);
          setIsPaused(false);
        } else {
          const result = !!data;
          log("[dashboard] subscribed:", result);
          writeSubCache(user.id, result);
          setSubscribed(result);
          setIsPaused(false);
        }

        // Check if subscription exists but is paused
        if (!data) {
          const { data: pausedData } = await (supabase as any)
            .from("user_subscriptions")
            .select("id")
            .eq("user_id", user.id)
            .not("paused_at", "is", null)
            .limit(1)
            .maybeSingle();

          if (!cancelled && pausedData) {
            log("[dashboard] subscription is paused");
            setSubscribed(false);
            setIsPaused(true);
          }
        }
      } catch (err) {
        if (!cancelled) {
          warn("[dashboard] subscription check threw:", err);
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

    checkStripeSubscription();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [loading, user, roles]);

  // Show AI coach widget only to new students (signed up ≤14 days ago) and only once
  const [showAIWidget, setShowAIWidget] = useState(false);

  // Check if onboarding is needed + whether to show the AI widget
  useEffect(() => {
    if (!user || !subscribed || hasRole("admin") || hasRole("teacher")) return;

    const onboardingKey = `musicable_onboarded_${user.id}`;
    const widgetKey     = `musicable_coach_widget_seen_${user.id}`;

    // Onboarding check
    if (!localStorage.getItem(onboardingKey)) {
      (supabase as any)
        .from("user_onboarding")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }: any) => {
          if (!data) setShowOnboarding(true);
          else localStorage.setItem(onboardingKey, "1");
        });
    }

    // AI widget: only new students (account ≤14 days old) who haven't seen it yet
    if (!localStorage.getItem(widgetKey)) {
      const accountAgeDays =
        (Date.now() - new Date(user.created_at).getTime()) / 86_400_000;
      if (accountAgeDays <= 14) {
        setShowAIWidget(true);
        localStorage.setItem(widgetKey, "1"); // mark as shown — won't appear again
      }
    }
  }, [user, subscribed, roles]);

  const handleOnboardingComplete = () => {
    if (user) localStorage.setItem(`musicable_onboarded_${user.id}`, "1");
    setShowOnboarding(false);
  };

  log("[dashboard] RENDER — loading:", loading, "checkingSubscription:", checkingSubscription, "subscribed:", subscribed, "isPaused:", isPaused, "roles:", roles, "user:", user?.email ?? "null");

  if (loading || checkingSubscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (isPaused) return <PausedMembershipGate />;

  if (!subscribed) return <SubscriptionGate />;

  const isStudent = !hasRole("admin") && !hasRole("teacher");

  return (
    <>
      {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} />}
      {!showOnboarding && showAIWidget && isStudent && <AICoachWidget />}
      {hasRole("admin")
        ? <DashboardErrorBoundary><AdminDashboard /></DashboardErrorBoundary>
        : hasRole("teacher")
          ? <DashboardErrorBoundary><TeacherDashboard /></DashboardErrorBoundary>
          : <DashboardErrorBoundary><StudentDashboard /></DashboardErrorBoundary>}
    </>
  );
};

export default Dashboard;
