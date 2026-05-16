import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Lock, Check, Star, Music, Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoundationModule {
  id: string;
  title: string;
  description: string | null;
  level: string;
  xp_reward: number;
  sort_order: number;
  is_published: boolean;
  // computed
  totalLessons: number;
  completedLessons: number;
  status: "locked" | "available" | "in-progress" | "completed";
}

interface SightReadingGate {
  trebleTestPassed:  boolean;
  bassTestPassed:    boolean;
  totalSessions:     number;
  rhythmQuizPassed:  boolean;
  rhythmBestAcc:     number; // best accuracy % across all rhythm_quiz attempts
}

const SESSIONS_REQUIRED = 10;
const RHYTHM_PASS_ACCURACY = 70; // 70% correct to unlock next module

const ModuleMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modules, setModules] = useState<FoundationModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);
  const [srGate, setSrGate] = useState<SightReadingGate>({ trebleTestPassed: false, bassTestPassed: false, totalSessions: 0, rhythmQuizPassed: false, rhythmBestAcc: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch published modules ordered by sort_order
      const { data: rawModules } = await (supabase as any)
        .from("foundation_modules")
        .select("id, title, description, level, xp_reward, sort_order")
        .eq("is_published", true)
        .order("sort_order");

      if (!rawModules || rawModules.length === 0) {
        setModules([]);
        setLoading(false);
        return;
      }

      // Fetch all lessons for these modules (just need module_id to count)
      const moduleIds = rawModules.map((m: any) => m.id);
      const [lessonsRes, progressRes, scoresRes] = await Promise.all([
        (supabase as any).from("foundation_lessons").select("id, module_id").in("module_id", moduleIds),
        (supabase as any).from("student_lesson_progress").select("lesson_id, completed").eq("student_id", user.id),
        (supabase as any).from("game_scores").select("game, correct, total").eq("user_id", user.id)
          .in("game", ["sight_reading", "sight_reading_treble_test", "sight_reading_bass_test", "rhythm_quiz"]),
      ]);

      const completedSet = new Set<string>(
        (progressRes.data || []).filter((p: any) => p.completed).map((p: any) => p.lesson_id)
      );

      // Compute sight-reading + rhythm gate status
      const scores: Array<{ game: string; correct: number; total: number }> = scoresRes.data || [];
      const rhythmScores = scores.filter(s => s.game === "rhythm_quiz" && s.total > 0);
      const rhythmBestAcc = rhythmScores.length > 0
        ? Math.max(...rhythmScores.map(s => Math.round((s.correct / s.total) * 100)))
        : 0;
      const gate: SightReadingGate = {
        trebleTestPassed:  scores.some(s => s.game === "sight_reading_treble_test" && s.total >= 20 && s.correct === s.total),
        bassTestPassed:    scores.some(s => s.game === "sight_reading_bass_test"   && s.total >= 20 && s.correct === s.total),
        totalSessions:     scores.filter(s => s.game.startsWith("sight_reading")).length,
        rhythmQuizPassed:  rhythmBestAcc >= RHYTHM_PASS_ACCURACY,
        rhythmBestAcc,
      };
      setSrGate(gate);

      // Count lessons per module
      const lessonsByModule: Record<string, string[]> = {};
      (lessonsRes.data || []).forEach((l: any) => {
        if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
        lessonsByModule[l.module_id].push(l.id);
      });

      // Compute status sequentially — each module unlocks when previous is completed.
      // SR gate: Treble Clef Songs requires treble test; Bass Clef Songs requires bass test.
      let prevCompleted = true;
      const mapped: FoundationModule[] = rawModules.map((m: any) => {
        const total = (lessonsByModule[m.id] || []).length;
        const completed = (lessonsByModule[m.id] || []).filter((id: string) => completedSet.has(id)).length;

        let status: FoundationModule["status"];
        if (total > 0 && completed === total) {
          status = "completed";
        } else if (completed > 0) {
          status = "in-progress";
        } else if (prevCompleted) {
          status = "available";
        } else {
          status = "locked";
        }

        // Rhythm gate: rhythm module lessons all done but quiz not passed → stay in-progress
        if (status === "completed" && (m.title ?? "").toLowerCase().includes("rhythm") && !gate.rhythmQuizPassed) {
          status = "in-progress";
        }

        // SR gate based on the module's OWN title:
        // "Treble Clef Songs" → needs treble test passed
        // "Bass Clef Songs"   → needs bass test passed
        if (status !== "locked") {
          const titleLc = (m.title ?? "").toLowerCase();
          const isTrebleGated = titleLc.includes("treble");
          const isBassGated   = titleLc.includes("bass clef") || (titleLc.includes("bass") && !isTrebleGated);
          if (isTrebleGated && (!gate.trebleTestPassed || gate.totalSessions < SESSIONS_REQUIRED)) {
            status = "locked";
          } else if (isBassGated && (!gate.bassTestPassed || gate.totalSessions < SESSIONS_REQUIRED)) {
            status = "locked";
          }
        }

        prevCompleted = status === "completed";

        return { ...m, totalLessons: total, completedLessons: completed, status };
      });

      setModules(mapped);
      setTotalXP(mapped.filter(m => m.status === "completed").reduce((s, m) => s + m.xp_reward, 0));
      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Winding x-offsets (px) — creates a Duolingo-style snake path
  const SNAKE_X = [0, 80, 110, 80, 0, -80, -110, -80];
  const getX = (i: number) => SNAKE_X[i % SNAKE_X.length];

  const nodeClass = (module: FoundationModule, lockedBySRTest: boolean) => {
    if (module.status === "completed") return "bg-green-500 border-green-400 shadow-[0_0_22px_rgba(34,197,94,0.5)]";
    if (module.status === "in-progress") return "bg-primary border-primary/80 shadow-[0_0_22px_hsl(330_85%_55%/0.5)]";
    if (module.status === "available") return "bg-cyan-500 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.45)] cursor-pointer";
    if (lockedBySRTest) return "bg-yellow-500/20 border-yellow-500/50 cursor-default";
    return "bg-muted/30 border-border cursor-default opacity-60";
  };

  const dotColor = (prev: FoundationModule | null) => {
    if (!prev) return "#4b5563";
    if (prev.status === "completed") return "#22c55e";
    if (prev.status === "in-progress") return "hsl(330 85% 55%)";
    return "#374151";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Foundation Journey</h2>
          <p className="text-muted-foreground">Master the fundamentals of piano</p>
        </div>
        {totalXP > 0 && (
          <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-xs text-muted-foreground">Total XP</p>
                <p className="text-xl font-bold text-yellow-400">{totalXP}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {modules.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center text-muted-foreground space-y-2">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">No modules available yet.</p>
            <p className="text-sm">Check back soon — your instructor will add lessons here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center pb-12">
          {modules.map((module, index) => {
            const prevModule = index > 0 ? modules[index - 1] : null;
            const prevModuleCompleted = prevModule?.status === "completed";
            const moduleTitleLcForGate = module.title.toLowerCase();
            const isTrebleGated = moduleTitleLcForGate.includes("treble");
            const isBassGated   = moduleTitleLcForGate.includes("bass clef") || (moduleTitleLcForGate.includes("bass") && !isTrebleGated);
            const lockedByTrebleTest = module.status === "locked" && prevModuleCompleted && isTrebleGated
              && (!srGate.trebleTestPassed || srGate.totalSessions < SESSIONS_REQUIRED);
            const lockedByBassTest   = module.status === "locked" && prevModuleCompleted && isBassGated
              && (!srGate.bassTestPassed   || srGate.totalSessions < SESSIONS_REQUIRED);
            const lockedBySRTest = lockedByTrebleTest || lockedByBassTest;
            const isRhythmModule = moduleTitleLcForGate.includes("rhythm");
            const isSRAdventureModule = moduleTitleLcForGate.includes("sight reading adventure");

            const srTestUrl = lockedByTrebleTest
              ? "/sight-reading.html?mode=treble_test&clef=treble&from=C4&to=C5&count=20&autostart=1"
              : lockedByBassTest
                ? "/sight-reading.html?mode=bass_test&clef=bass&from=C2&to=C4&count=20&autostart=1"
                : null;

            const currX = getX(index);
            const prevX = index > 0 ? getX(index - 1) : currX;
            const dc = dotColor(prevModule);

            return (
              <div key={module.id} className="flex flex-col items-center">

                {/* ── Winding dot connector ─────────────────────── */}
                {index > 0 && (
                  <div className="flex flex-col items-center gap-[10px] py-2 h-[72px] justify-center">
                    {[0, 1, 2, 3, 4].map(d => {
                      const t = (d + 1) / 6;
                      const dotX = prevX + (currX - prevX) * t;
                      return (
                        <div
                          key={d}
                          className="w-[10px] h-[10px] rounded-full shrink-0"
                          style={{ transform: `translateX(${dotX}px)`, backgroundColor: dc, opacity: 0.75 }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* ── Node + label + action ─────────────────────── */}
                <div
                  className="flex flex-col items-center"
                  style={{ transform: `translateX(${currX}px)` }}
                >
                  {/* Ping ring on current active node */}
                  <div className="relative">
                    {module.status === "available" && (
                      <div className="absolute -inset-3 rounded-full bg-cyan-400/20 animate-ping" />
                    )}
                    {module.status === "in-progress" && (
                      <div className="absolute -inset-3 rounded-full bg-primary/20 animate-pulse" />
                    )}

                    {/* Main circle */}
                    <button
                      className={cn(
                        "w-[84px] h-[84px] rounded-full border-4 flex items-center justify-center transition-transform duration-200",
                        module.status !== "locked" && "hover:scale-110 active:scale-95",
                        nodeClass(module, lockedBySRTest)
                      )}
                      onClick={() => module.status !== "locked" && navigate(`/dashboard/foundation/lesson-plan/${module.id}`)}
                    >
                      {module.status === "completed" ? (
                        <Check className="w-10 h-10 text-white" />
                      ) : module.status === "locked" && !lockedBySRTest ? (
                        <Lock className="w-7 h-7 text-muted-foreground/70" />
                      ) : lockedBySRTest ? (
                        <span className="text-3xl">🎯</span>
                      ) : (
                        <Music className="w-9 h-9 text-white" />
                      )}
                    </button>

                    {/* XP badge */}
                    {module.xp_reward > 0 && module.status !== "locked" && (
                      <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full px-1.5 py-0.5 flex items-center gap-0.5 shadow">
                        <Star className="w-2.5 h-2.5" />{module.xp_reward}
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <p className={cn(
                    "mt-2 text-sm font-bold text-center leading-tight",
                    module.status === "locked" && !lockedBySRTest ? "text-muted-foreground" : "text-foreground"
                  )} style={{ maxWidth: 140 }}>
                    {module.title}
                  </p>

                  {/* Progress bar */}
                  {(module.status === "in-progress" || module.status === "completed") && module.totalLessons > 0 && (
                    <div className="mt-1 w-24">
                      <Progress value={(module.completedLessons / module.totalLessons) * 100} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                        {module.completedLessons}/{module.totalLessons} lessons
                      </p>
                    </div>
                  )}

                  {/* Action button */}
                  {module.status !== "locked" && !lockedBySRTest && (
                    <button
                      className={cn(
                        "mt-2 px-5 py-1 rounded-full text-xs font-bold border-2 transition-all",
                        module.status === "completed"
                          ? "border-green-500 text-green-400 hover:bg-green-500/20"
                          : module.status === "in-progress"
                          ? "bg-primary text-white border-primary hover:bg-primary/90 shadow-[0_4px_14px_hsl(330_85%_55%/0.4)]"
                          : "bg-cyan-500 text-white border-cyan-500 hover:bg-cyan-600 shadow-[0_4px_14px_rgba(6,182,212,0.4)]"
                      )}
                      onClick={() => navigate(`/dashboard/foundation/lesson-plan/${module.id}`)}
                    >
                      {module.status === "completed" ? "Review" : module.status === "in-progress" ? "Continue" : "Start"}
                    </button>
                  )}

                  {/* SR test unlock button */}
                  {lockedBySRTest && srTestUrl && (
                    <div className="mt-2 flex flex-col items-center gap-1">
                      <p className="text-[10px] text-yellow-400 font-medium text-center">Test required to unlock</p>
                      <a
                        href={srTestUrl}
                        className="px-4 py-1 rounded-full text-xs font-bold bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                      >
                        Take Test →
                      </a>
                    </div>
                  )}

                  {/* SR Adventure gate details */}
                  {isSRAdventureModule && module.status !== "locked" && (
                    <div className="mt-3 w-44 space-y-2" onClick={e => e.stopPropagation()}>
                      {[
                        { label: "Treble Clef unlock", href: "/sight-reading.html?mode=treble_test&clef=treble&from=C4&to=C5&count=20&autostart=1", emoji: "🎯" },
                        { label: "Bass Clef unlock",   href: "/sight-reading.html?mode=bass_test&clef=bass&from=C2&to=C4&count=20&autostart=1",   emoji: "🎯" },
                      ].map(({ label, href, emoji }) => (
                        <div key={label} className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">{label}</span>
                            <span className={srGate.totalSessions >= SESSIONS_REQUIRED ? "text-green-400 font-semibold" : "font-semibold"}>
                              {Math.min(srGate.totalSessions, SESSIONS_REQUIRED)}/{SESSIONS_REQUIRED}
                            </span>
                          </div>
                          <Progress value={(Math.min(srGate.totalSessions, SESSIONS_REQUIRED) / SESSIONS_REQUIRED) * 100} className="h-1" />
                          <a href={href} className="block text-center text-[10px] font-semibold py-1 rounded-full bg-pink-500/20 border border-pink-500/50 text-pink-400 hover:bg-pink-500/30 transition-colors">
                            {emoji} Take Test
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rhythm gate */}
                  {isRhythmModule && module.status !== "locked" && (
                    <div className="mt-3 w-44 space-y-1" onClick={e => e.stopPropagation()}>
                      {module.completedLessons === module.totalLessons && module.totalLessons > 0 && !srGate.rhythmQuizPassed && (
                        <p className="text-[10px] text-amber-400 font-medium text-center">Pass Rhythm Quiz to complete</p>
                      )}
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Best score</span>
                        <span className={srGate.rhythmQuizPassed ? "text-green-400 font-semibold" : "font-semibold"}>{srGate.rhythmBestAcc}%</span>
                      </div>
                      <Progress value={srGate.rhythmBestAcc} className="h-1" />
                      <a href="/rhythm-quiz.html" className="block text-center text-[10px] font-semibold py-1 rounded-full bg-pink-500/20 border border-pink-500/50 text-pink-400 hover:bg-pink-500/30 transition-colors">
                        🎵 {srGate.rhythmQuizPassed ? "✓ Passed" : "Take Quiz"}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModuleMap;
