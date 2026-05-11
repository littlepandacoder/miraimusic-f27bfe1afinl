import { useState, useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, BookOpen, Clock, Map, TrendingUp, Target, Trophy, Gamepad2, Music, Piano, Eye } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import MyLessons from "./student/MyLessons";
import Resources from "./student/Resources";
import BookLesson from "./student/BookLesson";
import ModuleMap from "./student/ModuleMap";
import FoundationLessonPlan from "./student/FoundationLessonPlan";
import LessonViewer from "./student/LessonViewer";

import CourseLibrary from "./student/CourseLibrary";

interface GameScoreSummary {
  bestScore: number;
  lastAccuracy: number | null;
  avgAccuracy: number | null;
  bestAccuracy: number | null;
  bestStreak: number;
  sessions: number;
}

const StudentHome = () => {
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

      // Count completed foundation modules and sum earned XP
      let completedModules = 0;
      let totalXp = 0;
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
      }

      // Average quiz score
      const attempts: any[] = quizRes.data || [];
      const quizAvgScore = attempts.length > 0
        ? Math.round(attempts.reduce((sum: number, a: any) => sum + (a.total > 0 ? (a.score / a.total) * 100 : 0), 0) / attempts.length)
        : null;

      const completedCount = completedRes.count || 0;
      const foundationProgress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

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
      for (const game of ["note_naming", "sight_reading", "piano_hero"]) {
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
  }, [user]);

  const formatNextLesson = () => {
    if (!stats.nextLesson) return "No upcoming lessons";
    const date = new Date(stats.nextLesson.scheduled_date);
    return `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${stats.nextLesson.scheduled_time.slice(0, 5)}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Lessons</CardTitle>
            <Calendar className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.upcomingLessons}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Lessons</CardTitle>
            <BookOpen className="w-5 h-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.completedLessons}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quiz Avg Score</CardTitle>
            <TrendingUp className="w-5 h-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            {stats.quizAvgScore !== null ? (
              <p className="text-3xl font-bold text-yellow-400">{stats.quizAvgScore}%</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No quizzes taken yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total XP Earned</CardTitle>
            <Trophy className="w-5 h-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">{stats.totalXp.toLocaleString()} <span className="text-lg font-semibold">XP</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Foundation & Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Foundation Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">Foundation Modules</p>
                <p className="text-sm font-semibold">{stats.foundationModulesCompleted}/{stats.foundationModulesTotal}</p>
              </div>
              <Progress value={stats.foundationProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{Math.round(stats.foundationProgress)}% Complete</p>
            </div>
            <Link to="/dashboard/foundation" className="feature-card flex items-center gap-3 p-3 mt-2 inline-block w-full justify-center rounded">
              <Map className="w-4 h-4" />
              <span>Continue Learning</span>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Learning Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Complete Foundation Modules</span>
                  <span className="font-semibold">{stats.foundationModulesTotal > 0 ? Math.round((stats.foundationModulesCompleted / stats.foundationModulesTotal) * 100) : 0}%</span>
                </div>
                <Progress value={stats.foundationModulesTotal > 0 ? (stats.foundationModulesCompleted / stats.foundationModulesTotal) * 100 : 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Quiz Average</span>
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
            Game Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: "note_naming",  label: "Note Naming",  icon: <Music className="w-5 h-5 text-pink-400" />,   accentClass: "text-pink-400",   bgClass: "bg-pink-500/10",   href: "/note_naming.html" },
            { key: "sight_reading", label: "Sight Reading", icon: <Eye className="w-5 h-5 text-sky-400" />,    accentClass: "text-sky-400",    bgClass: "bg-sky-500/10",    href: "/sight-reading.html" },
            { key: "piano_hero",   label: "Piano Hero",   icon: <Piano className="w-5 h-5 text-purple-400" />, accentClass: "text-purple-400", bgClass: "bg-purple-500/10", href: "/piano_hero.html" },
          ].map(({ key, label, icon, accentClass, bgClass, href }) => {
            const gs = gameScores[key];
            return (
              <div key={key} className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${bgClass}`}>{icon}</div>
                    <p className="font-semibold text-sm">{label}</p>
                  </div>
                  <a href={href} className="text-xs text-primary hover:underline font-medium">Play →</a>
                </div>

                {gs ? (
                  <>
                    {/* Best score highlight */}
                    <div className="flex items-end gap-1">
                      <span className={`text-3xl font-bold ${accentClass}`}>{gs.bestScore.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground mb-1">best score</span>
                    </div>

                    {/* Accuracy bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Avg Accuracy</span>
                        <span className="font-semibold">{gs.avgAccuracy !== null ? `${gs.avgAccuracy}%` : "—"}</span>
                      </div>
                      <Progress value={gs.avgAccuracy ?? 0} className="h-1.5" />
                    </div>

                    {/* Row stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Best %</p>
                        <p className="text-sm font-bold">{gs.bestAccuracy !== null ? `${gs.bestAccuracy}%` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Best Streak</p>
                        <p className="text-sm font-bold">{gs.bestStreak} 🔥</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sessions</p>
                        <p className="text-sm font-bold">{gs.sessions}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-sm text-muted-foreground">No sessions yet</p>
                    <a href={href} className={`text-sm font-semibold ${accentClass} hover:underline`}>Start playing →</a>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/dashboard/book" className="feature-card flex items-center gap-4 p-4">
            <Calendar className="w-8 h-8 text-primary" />
            <div>
              <p className="font-semibold">Book a Lesson</p>
              <p className="text-sm text-muted-foreground">Schedule your next class</p>
            </div>
          </Link>
          <Link to="/dashboard/my-lessons" className="feature-card flex items-center gap-4 p-4">
            <Clock className="w-8 h-8 text-cyan-400" />
            <div>
              <p className="font-semibold">My Lessons</p>
              <p className="text-sm text-muted-foreground">View and manage lessons</p>
            </div>
          </Link>
          <Link to="/dashboard/foundation" className="feature-card flex items-center gap-4 p-4">
            <Map className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="font-semibold">Foundation Journey</p>
              <p className="text-sm text-muted-foreground">Learn the fundamentals</p>
            </div>
          </Link>
          <Link to="/dashboard/resources" className="feature-card flex items-center gap-4 p-4">
            <BookOpen className="w-8 h-8 text-green-400" />
            <div>
              <p className="font-semibold">Learning Resources</p>
              <p className="text-sm text-muted-foreground">Access lesson materials</p>
            </div>
          </Link>
        </CardContent>
      </Card>

    </div>
  );
};

const StudentDashboard = () => {
  return (
    <DashboardLayout title="Music Lesson Dashboard" role="student">
      <Routes>
        <Route index element={<StudentHome />} />
        <Route path="/" element={<StudentHome />} />
        <Route path="/my-lessons" element={<MyLessons />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/book" element={<BookLesson />} />
        <Route path="/foundation" element={<ModuleMap />} />
        <Route path="/foundation/lesson-plan/:moduleId" element={<FoundationLessonPlan />} />
        <Route path="/foundation/lesson-viewer/:moduleId/:lessonId" element={<LessonViewer />} />

        <Route path="/courses" element={<CourseLibrary />} />
      </Routes>
    </DashboardLayout>
  );
};

export default StudentDashboard;
