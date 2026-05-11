import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Play, CheckCircle, ChevronLeft, Loader2, Video, HelpCircle, Trophy } from "lucide-react";

interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  sort_order: number;
}

interface ProgressRecord {
  module_id: string;
  completed: boolean;
  watched_seconds: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  sort_order: number;
}

interface QuizResult {
  score: number;
  total: number;
}

const SkeletonCard = () => (
  <Card className="bg-card border-border">
    <CardContent className="py-5">
      <div className="flex items-start gap-4 animate-pulse">
        <div className="w-10 h-10 rounded-lg bg-secondary flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-secondary rounded w-3/4" />
          <div className="h-3 bg-secondary rounded w-1/2" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const CourseLibrary = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressRecord>>({});
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<CourseModule | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [modRes, progRes] = await Promise.all([
        supabase
          .from("course_modules")
          .select("id, title, description, video_url, thumbnail_url, sort_order")
          .eq("is_published", true)
          .order("sort_order"),
        user
          ? supabase.from("course_progress").select("module_id, completed, watched_seconds").eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);
      setModules((modRes.data as CourseModule[]) || []);
      const map: Record<string, ProgressRecord> = {};
      ((progRes.data as ProgressRecord[]) || []).forEach(p => { map[p.module_id] = p; });
      setProgress(map);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const openModule = async (mod: CourseModule) => {
    setActiveModule(mod);
    setShowQuiz(false);
    setQuizAnswers({});
    setQuizResult(null);

    // Fetch quiz questions for this module
    setQuizLoading(true);
    const { data } = await (supabase as any)
      .from("module_quizzes")
      .select("id, question, options, correct_index, sort_order")
      .eq("module_id", mod.id)
      .order("sort_order");
    setQuizQuestions((data as QuizQuestion[]) || []);
    setQuizLoading(false);
  };

  const markComplete = async (moduleId: string) => {
    if (!user) return;
    const existing = progress[moduleId];
    if (existing) {
      await supabase.from("course_progress").update({ completed: true, completed_at: new Date().toISOString() }).eq("user_id", user.id).eq("module_id", moduleId);
    } else {
      await supabase.from("course_progress").insert({ user_id: user.id, module_id: moduleId, completed: true, completed_at: new Date().toISOString() });
    }
    setProgress(prev => ({ ...prev, [moduleId]: { module_id: moduleId, completed: true, watched_seconds: prev[moduleId]?.watched_seconds || 0 } }));
    toast({ title: "Module completed!" });
  };

  const submitQuiz = async () => {
    if (!user || !activeModule) return;
    const total = quizQuestions.length;
    if (total === 0) return;

    let score = 0;
    quizQuestions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct_index) score++;
    });

    setSubmitting(true);
    await (supabase as any).from("quiz_attempts").insert({
      user_id: user.id,
      module_id: activeModule.id,
      score,
      total,
    });
    setSubmitting(false);
    setQuizResult({ score, total });

    if (score / total >= 0.7 && !progress[activeModule.id]?.completed) {
      markComplete(activeModule.id);
    }
  };

  const completedCount = Object.values(progress).filter(p => p.completed).length;
  const totalCount = modules.length;
  const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-secondary rounded w-48" />
              <div className="h-3 bg-secondary rounded" />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (activeModule) {
    const hasQuiz = quizQuestions.length > 0;
    const allAnswered = hasQuiz && quizQuestions.every((_, i) => quizAnswers[i] !== undefined);

    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setActiveModule(null)} className="gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to Course
        </Button>
        <h2 className="text-2xl font-bold">{activeModule.title}</h2>
        {activeModule.description && <p className="text-muted-foreground">{activeModule.description}</p>}

        {activeModule.video_url ? (
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              src={activeModule.video_url}
              controls
              preload="none"
              poster={activeModule.thumbnail_url || undefined}
              className="w-full h-full"
              onEnded={() => {
                if (!progress[activeModule.id]?.completed) {
                  markComplete(activeModule.id);
                }
                if (hasQuiz) setShowQuiz(true);
              }}
            />
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Video coming soon</p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {progress[activeModule.id]?.completed ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Completed</span>
            </div>
          ) : (
            <Button variant="outline" onClick={() => markComplete(activeModule.id)}>
              Mark as Complete
            </Button>
          )}

          {!quizLoading && hasQuiz && !showQuiz && (
            <Button variant="outline" className="gap-2" onClick={() => setShowQuiz(true)}>
              <HelpCircle className="w-4 h-4" /> Take Quiz
            </Button>
          )}
        </div>

        {/* Quiz section */}
        {showQuiz && hasQuiz && (
          <Card className="bg-card border-border mt-4">
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Module Quiz</h3>
              </div>

              {quizResult ? (
                <div className="text-center space-y-3 py-4">
                  <Trophy className="w-12 h-12 mx-auto text-yellow-400" />
                  <p className="text-2xl font-bold">{quizResult.score}/{quizResult.total}</p>
                  <p className={`text-sm font-medium ${quizResult.score / quizResult.total >= 0.7 ? "text-green-400" : "text-red-400"}`}>
                    {quizResult.score / quizResult.total >= 0.7 ? "Passed! Great job!" : "Not quite — review the video and try again."}
                  </p>
                  <Button variant="outline" onClick={() => { setQuizResult(null); setQuizAnswers({}); }}>
                    Retake Quiz
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {quizQuestions.map((q, qi) => (
                      <div key={q.id} className="space-y-3">
                        <p className="font-medium text-sm">
                          <span className="text-primary mr-2">{qi + 1}.</span>{q.question}
                        </p>
                        <div className="space-y-2 pl-4">
                          {q.options.map((opt, oi) => (
                            <label key={oi} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${quizAnswers[qi] === oi ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                              <input
                                type="radio"
                                name={`q-${qi}`}
                                value={oi}
                                checked={quizAnswers[qi] === oi}
                                onChange={() => setQuizAnswers(prev => ({ ...prev, [qi]: oi }))}
                                className="accent-primary"
                              />
                              <span className="text-sm">{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={submitQuiz}
                    disabled={!allAnswered || submitting}
                    className="w-full btn-primary"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Submit Quiz
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Your Course Progress</h3>
            <span className="text-sm text-muted-foreground">{completedCount}/{totalCount} modules</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">{Math.round(overallProgress)}% complete</p>
        </CardContent>
      </Card>

      {modules.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No course modules available yet. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((mod, idx) => {
            const isCompleted = progress[mod.id]?.completed;
            return (
              <Card
                key={mod.id}
                className={`bg-card border-border cursor-pointer transition-all hover:border-primary/50 hover:scale-[1.01] ${isCompleted ? "border-green-500/30" : ""}`}
                onClick={() => openModule(mod)}
              >
                <CardContent className="py-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isCompleted ? "bg-green-500/10" : "bg-primary/10"}`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <span className="text-sm font-bold text-primary">{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{mod.title}</h3>
                      {mod.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{mod.description}</p>}
                    </div>
                    <Play className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourseLibrary;
