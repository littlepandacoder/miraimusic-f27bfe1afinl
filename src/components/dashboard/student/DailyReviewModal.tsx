import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Music, Drum, Piano, Eye, Flame, BookOpen } from "lucide-react";

interface GameRow {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  sessions: number;
  bestAcc: number | null;
}

interface ReviewData {
  name: string;
  foundationCompleted: number;
  foundationTotal: number;
  lessonCompleted: number;
  lessonTotal: number;
  nextModuleTitle: string | null;
  totalXp: number;
  games: GameRow[];
}

const STORAGE_KEY_PREFIX = "musicable_daily_review_";

function todayKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}_${new Date().toISOString().slice(0, 10)}`;
}

const DailyReviewModal = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReviewData | null>(null);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t("dailyReview.goodMorning");
    if (h < 18) return t("dailyReview.goodAfternoon");
    return t("dailyReview.goodEvening");
  };

  const motivationalLine = (d: ReviewData): string => {
    const { lessonCompleted, lessonTotal, games } = d;
    const pct = lessonTotal > 0 ? lessonCompleted / lessonTotal : 0;
    const totalSessions = games.reduce((s, g) => s + g.sessions, 0);
    if (pct === 1) return t("dailyReview.motivComplete");
    if (pct === 0 && totalSessions === 0) return t("dailyReview.motivWelcome");
    if (pct < 0.3) return t("dailyReview.motivStart");
    if (pct < 0.7) return t("dailyReview.motivProgress");
    return t("dailyReview.motivAlmost");
  };

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(todayKey(user.id))) return;

    const fetchData = async () => {
      const name =
        (user as any).user_metadata?.full_name ||
        (user as any).user_metadata?.name ||
        user.email?.split("@")[0] ||
        "there";

      const [modulesRes, lessonsRes, progressRes, gameRes] = await Promise.all([
        (supabase as any)
          .from("foundation_modules")
          .select("id, title, xp_reward, sort_order")
          .eq("is_published", true)
          .order("sort_order"),
        (supabase as any).from("foundation_lessons").select("id, module_id"),
        (supabase as any)
          .from("student_lesson_progress")
          .select("lesson_id, completed")
          .eq("student_id", user.id),
        (supabase as any)
          .from("game_scores")
          .select("game, correct, total, best_streak")
          .eq("user_id", user.id),
      ]);

      const rawModules: any[] = modulesRes.data || [];
      const allLessons: any[] = lessonsRes.data || [];
      const progress: any[] = progressRes.data || [];
      const gameRows: any[] = gameRes.data || [];

      const completedSet = new Set<string>(
        progress.filter((p) => p.completed).map((p) => p.lesson_id)
      );
      const lessonsByModule: Record<string, string[]> = {};
      allLessons.forEach((l) => {
        if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
        lessonsByModule[l.module_id].push(l.id);
      });

      let completedModules = 0;
      let totalXp = 0;
      let nextModuleTitle: string | null = null;

      rawModules.forEach((m) => {
        const ids = lessonsByModule[m.id] || [];
        const done = ids.length > 0 && ids.every((id) => completedSet.has(id));
        if (done) {
          completedModules++;
          totalXp += m.xp_reward || 0;
        } else if (!nextModuleTitle) {
          nextModuleTitle = m.title;
        }
      });

      const lessonTotal = allLessons.length;
      const lessonCompleted = allLessons.filter((l) => completedSet.has(l.id)).length;

      const buildGame = (key: string): { sessions: number; bestAcc: number | null } => {
        const rows = gameRows.filter((r) => r.game === key);
        if (rows.length === 0) return { sessions: 0, bestAcc: null };
        const accs = rows.filter((r) => r.total > 0).map((r) => Math.round((r.correct / r.total) * 100));
        return {
          sessions: rows.length,
          bestAcc: accs.length > 0 ? Math.max(...accs) : null,
        };
      };

      const gameDefinitions: Omit<GameRow, "sessions" | "bestAcc">[] = [
        { key: "piano_hero",    label: t("student.gameNames.pianoHero"),    icon: <Piano className="w-4 h-4" />, color: "text-purple-400" },
        { key: "note_naming",   label: t("student.gameNames.noteNaming"),   icon: <Music className="w-4 h-4" />, color: "text-pink-400"   },
        { key: "rhythm_quiz",   label: t("student.gameNames.rhythmQuiz"),   icon: <Drum  className="w-4 h-4" />, color: "text-amber-400"  },
        { key: "sight_reading", label: t("student.gameNames.sightReading"), icon: <Eye   className="w-4 h-4" />, color: "text-sky-400"    },
      ];

      const games: GameRow[] = gameDefinitions.map((def) => {
        const { sessions, bestAcc } = buildGame(def.key);
        return { ...def, sessions, bestAcc };
      });

      setData({
        name,
        foundationCompleted: completedModules,
        foundationTotal: rawModules.length,
        lessonCompleted,
        lessonTotal,
        nextModuleTitle,
        totalXp,
        games,
      });
      setLoading(false);
      setVisible(true);
    };

    fetchData().catch(() => setLoading(false));
  }, [user]);

  const dismiss = (navigateTo?: string, navState?: object) => {
    if (user) localStorage.setItem(todayKey(user.id), "1");
    setVisible(false);
    if (navigateTo) navigate(navigateTo, { state: navState });
  };

  const goToFoundation = () => dismiss("foundation");

  const goToQuiz = () =>
    dismiss("review-quiz", {
      foundationPct: data ? (data as any).foundationPct : 0,
      games: data
        ? Object.fromEntries(
            data.games.map((g) => [g.key, { sessions: g.sessions, bestAcc: g.bestAcc, avgAccuracy: g.bestAcc }])
          )
        : {},
      name: data?.name ?? "",
    });

  if (!visible) return null;

  const foundationPct = data
    ? data.lessonTotal > 0
      ? Math.round((data.lessonCompleted / data.lessonTotal) * 100)
      : 0
    : 0;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => dismiss()}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(145deg, #151228 0%, #0f0d1a 100%)", border: "1px solid rgba(255,45,120,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #FF2D78, #A855F7, #00D4FF)" }} />

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
                {t("dailyReview.dailyProgress")}
              </p>
              <h2
                className="text-2xl font-black text-white"
                style={{ fontFamily: "'Orbitron', monospace", textShadow: "0 0 20px rgba(255,45,120,0.4)" }}
              >
                {greeting()}, {data.name}!
              </h2>
              <p className="text-sm text-muted-foreground">{motivationalLine(data)}</p>
            </div>

            {data.totalXp > 0 && (
              <div className="flex items-center justify-center gap-2">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-400" style={{ fontFamily: "'Orbitron', monospace" }}>
                    {data.totalXp.toLocaleString()} {t("dailyReview.xpEarned")}
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-white">{t("dailyReview.foundationJourney")}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: "#FF2D78" }}>
                  {data.foundationCompleted}/{data.foundationTotal} {t("dailyReview.modules")}
                </span>
              </div>
              <Progress value={foundationPct} className="h-2" />
              {data.nextModuleTitle && (
                <button
                  onClick={goToFoundation}
                  className="w-full text-left text-xs rounded-lg px-3 py-2 transition-colors"
                  style={{ background: "rgba(255,45,120,0.08)", border: "1px solid rgba(255,45,120,0.2)", color: "#FF2D78" }}
                >
                  {t("dailyReview.nextUp", { title: data.nextModuleTitle })}
                </button>
              )}
              {!data.nextModuleTitle && (
                <p className="text-xs text-green-400 font-semibold">{t("dailyReview.allComplete")}</p>
              )}
            </div>

            {data.games.some((g) => g.sessions > 0) && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">{t("dailyReview.gamePerformance")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {data.games
                    .filter((g) => g.sessions > 0)
                    .map((g) => (
                      <div
                        key={g.label}
                        className="flex items-center gap-2 rounded-lg px-3 py-2"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <span className={g.color}>{g.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{g.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {g.bestAcc !== null ? (
                              <span className={`font-bold ${g.color}`}>{g.bestAcc}%</span>
                            ) : "—"}{" "}
                            · {g.sessions} {g.sessions !== 1 ? t("dailyReview.sessions") : t("dailyReview.session")}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <Button
              onClick={goToQuiz}
              className="w-full text-base font-bold py-5"
              style={{
                background: "linear-gradient(135deg, #FF2D78, #A855F7)",
                border: "none",
                boxShadow: "0 0 24px rgba(255,45,120,0.35)",
                fontFamily: "'Orbitron', monospace",
                letterSpacing: "0.06em",
              }}
            >
              {t("dailyReview.letsGo")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DailyReviewModal;
