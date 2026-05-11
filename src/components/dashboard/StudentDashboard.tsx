import { useState, useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, BookOpen, FileText, Clock, Map, TrendingUp, Target, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import MyLessons from "./student/MyLessons";
import Resources from "./student/Resources";
import BookLesson from "./student/BookLesson";
import ModuleMap from "./student/ModuleMap";
import FoundationLessonPlan from "./student/FoundationLessonPlan";
import LessonViewer from "./student/LessonViewer";

import CourseLibrary from "./student/CourseLibrary";

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
        (supabase as any).from("foundation_modules").select("id").order("sort_order"),
        (supabase as any).from("student_lesson_progress").select("lesson_id, completed").eq("student_id", user.id),
        (supabase as any).from("quiz_attempts").select("score, total").eq("user_id", user.id),
      ]);

      const totalModules = (modulesRes.data || []).length;

      // Count completed foundation modules: fetch all lesson IDs per module and check progress
      let completedModules = 0;
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

        completedModules = moduleIds.filter((mid: string) => {
          const ids = lessonsByModule[mid] || [];
          return ids.length > 0 && ids.every((id: string) => completedLessonIds.has(id));
        }).length;
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
      });
    };

    fetchStats();
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Hours Learned</CardTitle>
            <Clock className="w-5 h-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.hoursLearned}h</p>
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
