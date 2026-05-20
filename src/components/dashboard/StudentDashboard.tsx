import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Routes, Route, Link } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, BookOpen, Map, TrendingUp, Target, Trophy, Gamepad2, Music, Piano, Eye, Drum, Clock, LogIn } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Resources from "./student/Resources";
import DailyReviewModal from "./student/DailyReviewModal";
import DailyReviewQuiz from "./student/DailyReviewQuiz";
import RankingModal from "./student/RankingModal";
import BookLesson from "./student/BookLesson";
import ModuleMap from "./student/ModuleMap";
import FoundationLessonPlan from "./student/FoundationLessonPlan";
import LessonViewer from "./student/LessonViewer";


interface GameScoreSummary {
  bestScore: number;
  lastAccuracy: number | null;
  avgAccuracy: number | null;
  bestAccuracy: number | null;
  bestStreak: number;
  sessions: number;
}

const StudentHome = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    upcomingLessons: 0,
    completedLessons: 0,
    totalNotes: 0,
    nextLesson: null as { scheduled_date: string; scheduled_time: string } | null,
    foundationProgress: 0,
    foundationModulesCompleted: 0,
    foundationModulesTotal: 0,
    quizAvgScore: null as number | null,
    hoursLearned: 0,
    totalXp: 0,
  });
  const [gameScores, setGameScores] = useState<Record<string, GameScoreSummary>>({});
  const [sessionStats, setSessionStats] = useState({
    totalLogins: 0,
    totalSeconds: 0,
    avgSeconds: 0,
    lastLogin: null as string | null,
  });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [upcomingRes, completedRes, notesRes, nextRes, modulesRes, lessonProgressRes, quizRes] = await Promise.all([
        supabase.from("lessons").select("*", { count: "exact" }).eq("student_id", user.id).eq("status", "scheduled").gte("scheduled_date", today),
        supabase.from("lessons").select("*", { count: "exact" }).eq("student_id", user.id).eq("status", "completed"),
        supabase.from("lesson_notes").select("*", { count: "exact" }).eq("is_visible_to_student", true),
        supabase.from("lessons").select("scheduled_date, scheduled_time").eq("student_id", user.id).eq("status", "scheduled").gte("scheduled_date", today).order("scheduled_date").order("scheduled_time").limit(1).maybeSingle(),
        (supabase as any).from("foundation_modules").select("id, xp_reward").order("sort_order"),
        (supabase as any).from("student_lesson_progress").select("lesson_id, completed").eq("student_id", user.id),
        (supabase as any).from("quiz_attempts").select("score, total").eq("user_id", user.id),
      ]);

      const totalModules = (modulesRes.data || []).length;

      // Count completed foundation modules/lessons and sum earned XP
      let completedModules = 0;
      let totalXp = 0;
      let foundationProgress = 0;
      if (totalModules > 0) {
        const moduleIds = (modulesRes.data || []).map((m: any) => m.id);
        const { data: allLessons } = await (supabase as any)
          .from("foundation_lessons")
          .select("id, module_id")
          .in("module_id", moduleIds);

        const completedLessonIds = new Set<string>(
          (lessonProgressRes.data || []).filter((p: any) => p.completed).map((p: any) => p.lesson_id)
        );

        const lessonsByModule: Record<string, string[]> = {};
        (allLessons || []).forEach((l: any) => {
          if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
          lessonsByModule[l.module_id].push(l.id);
        });

        const completedModuleIds = moduleIds.filter((mid: string) => {
          const ids = lessonsByModule[mid] || [];
          return ids.length > 0 && ids.every((id: string) => completedLessonIds.has(id));
        });
        completedModules = completedModuleIds.length;

        // Sum XP for every completed module
        totalXp = (modulesRes.data || [])
          .filter((m: any) => completedModuleIds.includes(m.id))
          .reduce((sum: number, m: any) => sum + (m.xp_reward || 0), 0);

        // Progress based on individual lessons (not just full modules)
        const totalLessons = (allLessons || []).length;
        const completedLessonsCount = (allLessons || []).filter((l: any) => completedLessonIds.has(l.id)).length;
        foundationProgress = totalLessons > 0 ? (completedLessonsCount / totalLessons) * 100 : 0;
      }

      // Average quiz score
      const attempts: any[] = quizRes.data || [];
      const quizAvgScore = attempts.length > 0
        ? Math.round(attempts.reduce((sum: number, a: any) => sum + (a.total > 0 ? (a.score / a.total) * 100 : 0), 0) / attempts.length)
        : null;

      const completedCount = completedRes.count || 0;

      setStats({
        upcomingLessons: upcomingRes.count || 0,
        completedLessons: completedCount,
        totalNotes: notesRes.count || 0,
        nextLesson: nextRes.data,
        foundationProgress,
        foundationModulesCompleted: completedModules,
        foundationModulesTotal: totalModules,
        quizAvgScore,
        hoursLearned: completedCount,
        totalXp,
      });
    };

    fetchStats();

    const fetchGameScores = async () => {
      const { data } = await (supabase as any)
        .from("game_scores")
        .select("game, score, correct, total, best_streak, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const rows: any[] = data || [];
      const summary: Record<string, GameScoreSummary> = {};
      for (const game of ["note_naming", "sight_reading", "piano_hero", "rhythm_quiz"]) {
        const gameSessions = rows.filter((r) => r.game === game);
        if (gameSessions.length === 0) continue;
        const bestScore = Math.max(...gameSessions.map((r) => r.score));
        const last = gameSessions[0];
        const lastAccuracy = last.total > 0 ? Math.round((last.correct / last.total) * 100) : null;
        const bestStreak = Math.max(...gameSessions.map((r) => r.best_streak || 0));
        const accuracies = gameSessions
          .filter((r) => r.total > 0)
          .map((r) => (r.correct / r.total) * 100);
        const avgAccuracy = accuracies.length > 0 ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length) : null;
        const bestAccuracy = accuracies.length > 0 ? Math.round(Math.max(...accuracies)) : null;
        summary[game] = { bestScore, lastAccuracy, avgAccuracy, bestAccuracy, bestStreak, sessions: gameSessions.length };
      }
      setGameScores(summary);
    };
    fetchGameScores();

    const fetchSessionStats = async () => {
      const { data } = await (supabase as any)
        .from("user_sessions")
        .select("started_at, duration_seconds")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      const rows: any[] = data || [];
      if (rows.length === 0) return;

      const totalSeconds = rows.reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0);
      const withDuration = rows.filter((r: any) => (r.duration_seconds || 0) > 0);
      const avgSeconds   = withDuration.length > 0
        ? Math.round(withDuration.reduce((s: number, r: any) => s + r.duration_seconds, 0) / withDuration.length)
        : 0;

      setSessionStats({
        totalLogins: rows.length,
        totalSeconds,
        avgSeconds,
        lastLogin: rows[0]?.started_at ?? null,
      });
    };
    fetchSessionStats();
  }, [user]);

  const fmtDuration = (secs: number) => {
    if (secs < 60)  return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m`;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const fmtLastLogin = (iso: string | null) => {
    if (!iso) return "—";
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    if (mins  < 2)   return "Just now";
    if (hours < 1)   return `${mins}m ago`;
    if (hours < 24)  return `${hours}h ago`;
    if (days  < 7)   return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatNextLesson = () => {
    if (!stats.nextLesson) return "No upcoming lessons";
    const date = new Date(stats.nextLesson.scheduled_date);
    return `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${stats.nextLesson.scheduled_time.slice(0, 5)}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("student.upcoming")}</CardTitle>
            <Calendar className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.upcomingLessons}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("student.lessons")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("student.completed")}</CardTitle>
            <BookOpen className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.completedLessons}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("student.lessons")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("student.quizAvg")}</CardTitle>
            <TrendingUp className="w-4 h-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            {stats.quizAvgScore !== null ? (
              <p className="text-3xl font-bold text-yellow-400">{stats.quizAvgScore}%</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">—</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("student.totalXp")}</CardTitle>
            <Trophy className="w-4 h-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">{stats.totalXp.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("student.xpEarned")}</p>
          </CardContent>
        </Card>

        {/* ── Session stats ── */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("student.logins")}</CardTitle>
            <LogIn className="w-4 h-4 text-sky-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-sky-400">{sessionStats.totalLogins}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {sessionStats.lastLogin ? t("student.lastLogin", { time: fmtLastLogin(sessionStats.lastLogin) }) : t("student.noDataYet")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("student.timeSpent")}</CardTitle>
            <Clock className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-400">
              {sessionStats.totalSeconds > 0 ? fmtDuration(sessionStats.totalSeconds) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {sessionStats.avgSeconds > 0 ? t("student.avgPerVisit", { duration: fmtDuration(sessionStats.avgSeconds) }) : t("student.acrossAllVisits")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Foundation & Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              {t("student.foundationProgress")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">{t("student.foundationModules")}</p>
                <p className="text-sm font-semibold">{stats.foundationModulesCompleted}/{stats.foundationModulesTotal}</p>
              </div>
              <Progress value={stats.foundationProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{t("student.percentComplete", { percent: Math.round(stats.foundationProgress) })}</p>
            </div>
            <Link to="/dashboard/foundation" className="feature-card flex items-center gap-3 p-3 mt-2 inline-block w-full justify-center rounded">
              <Map className="w-4 h-4" />
              <span>{t("student.continuelearning")}</span>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {t("student.learningGoals")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t("student.completeFoundation")}</span>
                  <span className="font-semibold">{stats.foundationModulesTotal > 0 ? Math.round((stats.foundationModulesCompleted / stats.foundationModulesTotal) * 100) : 0}%</span>
                </div>
                <Progress value={stats.foundationModulesTotal > 0 ? (stats.foundationModulesCompleted / stats.foundationModulesTotal) * 100 : 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t("student.quizAverage")}</span>
                  <span className="font-semibold">{stats.quizAvgScore !== null ? `${stats.quizAvgScore}%` : "—"}</span>
                </div>
                <Progress value={stats.quizAvgScore ?? 0} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Game Performance */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            {t("student.gamePerformance")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { key: "note_naming",  label: t("student.gameNames.noteNaming"),   icon: <Music className="w-5 h-5 text-pink-400" />,   accentClass: "text-pink-400",   bgClass: "bg-pink-500/10",   href: "/note_naming.html",   tests: null },
            { key: "sight_reading", label: t("student.gameNames.sightReading"), icon: <Eye className="w-5 h-5 text-sky-400" />,      accentClass: "text-sky-400",    bgClass: "bg-sky-500/10",    href: "/sight-reading.html", tests: [
              { label: t("student.gameNames.trebleTest"), href: "/sight-reading.html?mode=treble_test&clef=treble&from=C4&to=C5&count=20&autostart=1" },
              { label: t("student.gameNames.bassTest"),   href: "/sight-reading.html?mode=bass_test&clef=bass&from=C2&to=C4&count=20&autostart=1" },
            ]},
            { key: "piano_hero",   label: t("student.gameNames.pianoHero"),    icon: <Piano className="w-5 h-5 text-purple-400" />, accentClass: "text-purple-400", bgClass: "bg-purple-500/10", href: "/piano_hero.html",    tests: null },
            { key: "rhythm_quiz",  label: t("student.gameNames.rhythmQuiz"),   icon: <Drum className="w-5 h-5 text-amber-400" />,   accentClass: "text-amber-400",  bgClass: "bg-amber-500/10",  href: "/rhythm-quiz.html",   tests: null,
              passThreshold: 70,
            },
          ].map(({ key, label, icon, accentClass, bgClass, href, tests, passThreshold }: any) => {
            const gs = gameScores[key];
            return (
              <div key={key} className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${bgClass}`}>{icon}</div>
                    <p className="font-semibold text-sm">{label}</p>
                  </div>
                  <a href={href} className="text-xs text-primary hover:underline font-medium">{t("student.play")}</a>
                </div>
                {tests && (
                  <div className="flex gap-2">
                    {tests.map((t) => (
                      <a
                        key={t.label}
                        href={t.href}
                        className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg bg-pink-500/20 border border-pink-500/50 text-pink-400 hover:bg-pink-500/30 transition-colors"
                      >
                        🎯 {t.label}
                      </a>
                    ))}
                  </div>
                )}

                {gs ? (
                  <>
                    {/* Pass badge for rhythm quiz */}
                    {passThreshold && (
                      <div className={`text-xs font-semibold px-2 py-1 rounded-full w-fit ${
                        (gs.bestAccuracy ?? 0) >= passThreshold
                          ? "bg-green-500/20 text-green-400 border border-green-500/40"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}>
                        {(gs.bestAccuracy ?? 0) >= passThreshold ? t("student.passed") : t("student.needToPass", { threshold: passThreshold })}
                      </div>
                    )}

                    {/* Best score highlight */}
                    <div className="flex items-end gap-1">
                      <span className={`text-3xl font-bold ${accentClass}`}>{gs.bestScore.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground mb-1">{t("student.bestScore")}</span>
                    </div>

                    {/* Accuracy bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{t("student.bestAccuracy")}</span>
                        <span className="font-semibold">{gs.bestAccuracy !== null ? `${gs.bestAccuracy}%` : "—"}</span>
                      </div>
                      <Progress value={gs.bestAccuracy ?? 0} className="h-1.5" />
                    </div>

                    {/* Row stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">{t("student.avgAccuracy")}</p>
                        <p className="text-sm font-bold">{gs.avgAccuracy !== null ? `${gs.avgAccuracy}%` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("student.bestStreak")}</p>
                        <p className="text-sm font-bold">{gs.bestStreak} 🔥</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("student.sessions")}</p>
                        <p className="text-sm font-bold">{gs.sessions}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-sm text-muted-foreground">{t("student.noSessions")}</p>
                    <a href={href} className={`text-sm font-semibold ${accentClass} hover:underline`}>{t("student.startPlaying")}</a>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

    </div>
  );
};

interface RankTrigger { type: "game" | "module"; id: string; label: string; }

const StudentDashboard = () => {
  const { t } = useTranslation();
  const [rankTrigger, setRankTrigger] = useState<RankTrigger | null>(null);

  useEffect(() => {
    const check = () => {
      const raw = localStorage.getItem("musicable_rank_trigger");
      if (!raw) return;
      localStorage.removeItem("musicable_rank_trigger");
      try {
        const data = JSON.parse(raw);
        if (Date.now() - data.ts < 60_000) {
          setRankTrigger({ type: data.type, id: data.id, label: data.label });
        }
      } catch {}
    };

    const onFocus = () => check();
    const onVisible = () => { if (document.visibilityState === "visible") check(); };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <DashboardLayout title={t("dashboard.title")} role="student">
      <DailyReviewModal />
      {rankTrigger && (
        <RankingModal
          type={rankTrigger.type}
          id={rankTrigger.id}
          label={rankTrigger.label}
          onClose={() => setRankTrigger(null)}
        />
      )}
      <Routes>
        <Route index element={<StudentHome />} />
        <Route path="/" element={<StudentHome />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/book" element={<BookLesson />} />
        <Route path="/foundation" element={<ModuleMap onModuleComplete={(id, label) => setRankTrigger({ type: "module", id, label })} />} />
        <Route path="/foundation/lesson-plan/:moduleId" element={<FoundationLessonPlan />} />
        <Route path="/foundation/lesson-viewer/:moduleId/:lessonId" element={<LessonViewer />} />
        <Route path="/review-quiz" element={<DailyReviewQuiz />} />
      </Routes>
    </DashboardLayout>
  );
};

export default StudentDashboard;
