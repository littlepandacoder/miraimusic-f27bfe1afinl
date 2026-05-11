import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import trackEvent from "@/lib/telemetry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, Check, Music, Trophy, ArrowLeft, ArrowRight, Play, CheckCircle, Clock, Loader2, HelpCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  sort_order: number;
  status: "completed" | "in-progress" | "available" | "locked";
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  level: string;
  xp_reward: number;
  sort_order: number;
}

const FoundationLessonPlan = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const [module, setModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [nextModuleId, setNextModuleId] = useState<string | null>(null);
  const [quizCounts, setQuizCounts] = useState<Record<string, number>>({});
  const [quizPassed, setQuizPassed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!moduleId || !user) return;

    const fetchData = async () => {
      const [modRes, lessonsRes, progressRes] = await Promise.all([
        (supabase as any).from("foundation_modules").select("id, title, description, level, xp_reward, sort_order").eq("id", moduleId).single(),
        (supabase as any).from("foundation_lessons").select("id, title, description, duration_minutes, sort_order").eq("module_id", moduleId).order("sort_order"),
        (supabase as any).from("student_lesson_progress").select("lesson_id, completed").eq("student_id", user.id),
      ]);

      setModule(modRes.data || null);

      const completedSet = new Set<string>(
        (progressRes.data || []).filter((p: any) => p.completed).map((p: any) => p.lesson_id)
      );

      const rawLessons: any[] = lessonsRes.data || [];
      let foundFirst = false;
      const mapped: Lesson[] = rawLessons.map((l, idx) => {
        if (completedSet.has(l.id)) return { ...l, status: "completed" as const };
        if (!foundFirst) {
          foundFirst = true;
          return { ...l, status: idx === 0 ? "available" : "in-progress" as const };
        }
        return { ...l, status: "locked" as const };
      });

      setLessons(mapped);
      const first = mapped.find(l => l.status === "in-progress" || l.status === "available");
      setCurrentLesson(first || null);

      // Load quiz counts and passed attempts for all lessons
      const lessonIds = rawLessons.map((l: any) => l.id);
      if (lessonIds.length > 0) {
        const [quizRes, attemptsRes] = await Promise.all([
          (supabase as any).from("module_quizzes").select("lesson_id").in("lesson_id", lessonIds),
          (supabase as any).from("quiz_attempts").select("lesson_id, passed").eq("user_id", user.id).eq("passed", true).in("lesson_id", lessonIds),
        ]);
        const counts: Record<string, number> = {};
        (quizRes.data || []).forEach((q: any) => {
          if (q.lesson_id) counts[q.lesson_id] = (counts[q.lesson_id] || 0) + 1;
        });
        const passed: Record<string, boolean> = {};
        (attemptsRes.data || []).forEach((a: any) => { if (a.lesson_id) passed[a.lesson_id] = true; });
        setQuizCounts(counts);
        setQuizPassed(passed);
      }

      setLoading(false);
    };

    fetchData();
  }, [moduleId, user]);

  // Find the next module once the current one is loaded
  useEffect(() => {
    if (module === null) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("foundation_modules")
        .select("id, sort_order")
        .gt("sort_order", module.sort_order)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data?.id) setNextModuleId(data.id);
    })();
  }, [module]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard/foundation")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Foundation
        </Button>
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Module not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = lessons.filter(l => l.status === "completed").length;
  const completionPct = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

  const getLevelColor = (level: string) => {
    switch (level) {
      case "intermediate": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "advanced": return "bg-red-500/20 text-red-400 border-red-500/50";
      default: return "bg-green-500/20 text-green-400 border-green-500/50";
    }
  };

  const startLesson = (lesson: Lesson) => {
    const preview = roles.includes("teacher") || roles.includes("admin");
    try { trackEvent("lesson_start_click", { lessonId: lesson.id, moduleId, userId: user?.id, preview }); } catch (_) {}
    navigate(`/dashboard/foundation/lesson-viewer/${moduleId}/${lesson.id}${preview ? "?preview=1" : ""}`);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/dashboard/foundation")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Foundation Journey
      </Button>

      {/* Module header */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <span className="text-2xl font-bold text-primary-foreground">{module.sort_order + 1}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Module {module.sort_order + 1}</p>
                  <CardTitle className="text-2xl mb-1">{module.title}</CardTitle>
                  {module.description && <p className="text-muted-foreground text-sm">{module.description}</p>}
                  <Badge className={cn("mt-2 text-xs", getLevelColor(module.level))}>{module.level}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Overall Progress</p>
                  <Progress value={completionPct} className="h-3" />
                  <p className="text-sm mt-2 font-semibold">
                    {completedCount} of {lessons.length} lessons completed
                  </p>
                </div>
                <div className="text-center">
                  <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">XP Reward</p>
                  <p className="text-2xl font-bold text-yellow-400">{module.xp_reward}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{lessons.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lessons list */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Lesson Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Music className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No lessons added yet.</p>
              <p className="text-sm">Your instructor will add lessons here soon.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all",
                    lesson.status === "completed" ? "bg-green-500/10 border-green-500 hover:bg-green-500/20 cursor-pointer" :
                    lesson.status === "in-progress" ? "bg-primary/10 border-primary hover:bg-primary/20 cursor-pointer" :
                    lesson.status === "available" ? "bg-cyan-500/10 border-cyan-500 hover:bg-cyan-500/20 cursor-pointer" :
                    "bg-muted/20 border-border opacity-60 cursor-not-allowed"
                  )}
                  onClick={() => lesson.status !== "locked" && setCurrentLesson(lesson)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-1 bg-background border-2 border-current">
                        {lesson.status === "completed" ? <Check className="w-5 h-5 text-green-400" /> :
                         lesson.status === "in-progress" ? <Play className="w-5 h-5 text-primary" /> :
                         lesson.status === "available" ? <CheckCircle className="w-5 h-5 text-cyan-400" /> :
                         <Lock className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{index + 1}. {lesson.title}</h4>
                        {lesson.description && <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />{lesson.duration_minutes} min
                          </span>
                          <Badge className={cn("text-xs",
                            lesson.status === "completed" ? "bg-green-500/20 text-green-400" :
                            lesson.status === "in-progress" ? "bg-primary/20 text-primary" :
                            lesson.status === "available" ? "bg-cyan-500/20 text-cyan-400" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {lesson.status === "in-progress" ? "In Progress" : lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1)}
                          </Badge>
                          {quizCounts[lesson.id] > 0 && (
                            quizPassed[lesson.id] ? (
                              <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/40 gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Quiz Passed
                              </Badge>
                            ) : (
                              <Badge className="text-xs bg-primary/10 text-primary border-primary/30 gap-1">
                                <HelpCircle className="w-3 h-3" /> Quiz · {quizCounts[lesson.id]}Q
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    {lesson.status !== "locked" && (
                      <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        {quizCounts[lesson.id] > 0 && lesson.status === "completed" && !quizPassed[lesson.id] && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-primary border-primary/40"
                            onClick={() => startLesson(lesson)}
                          >
                            <HelpCircle className="w-3.5 h-3.5" /> Take Quiz
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={lesson.status === "completed" ? "outline" : "default"}
                          onClick={() => startLesson(lesson)}
                        >
                          {lesson.status === "completed" ? "Review" : lesson.status === "in-progress" ? "Continue" : "Start"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module complete — next module CTA */}
      {completedCount === lessons.length && lessons.length > 0 && nextModuleId && (
        <Card className="border-2 border-green-500/60 bg-green-500/5">
          <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400 shrink-0" />
              <div>
                <p className="font-bold text-lg">Module Complete!</p>
                <p className="text-sm text-muted-foreground">You've finished all lessons in this module.</p>
              </div>
            </div>
            <Button
              className="gap-2 shrink-0"
              onClick={() => navigate(`/dashboard/foundation/lesson-plan/${nextModuleId}`)}
            >
              Go to Next Module
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current lesson preview */}
      {currentLesson && (
        <Card className="bg-card border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" /> Currently Selected: {currentLesson.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentLesson.description && <p className="text-muted-foreground mb-4">{currentLesson.description}</p>}
            <div className="flex items-center gap-4">
              <Badge className="bg-primary/20 text-primary">
                <Clock className="w-3 h-3 mr-1" />{currentLesson.duration_minutes} min
              </Badge>
              <Button onClick={() => startLesson(currentLesson)}>
                <Play className="w-4 h-4 mr-2" />
                {currentLesson.status === "completed" ? "Review Lesson" : "Start Lesson"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FoundationLessonPlan;
