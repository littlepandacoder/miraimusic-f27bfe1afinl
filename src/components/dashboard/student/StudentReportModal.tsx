import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Download, Loader2, Trophy, Zap, Flame, Target, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportStudentReport } from "@/lib/exportReport";

const GAME_LABELS: Record<string, string> = {
  note_naming: "Note Naming",
  sight_reading: "Sight Reading",
  sight_reading_treble_test: "Sight Reading – Treble",
  sight_reading_bass_test: "Sight Reading – Bass",
  rhythm_quiz: "Rhythm Quiz",
  piano_hero: "Piano Hero",
  daily_review: "Daily Review",
};

function getGrade(pct: number) {
  if (pct >= 95) return "S";
  if (pct >= 85) return "A";
  if (pct >= 70) return "B";
  if (pct >= 55) return "C";
  if (pct >= 40) return "D";
  return "F";
}

const GRADE_COLORS: Record<string, string> = {
  S: "#FFD700", A: "#39D98A", B: "#A855F7", C: "#00D4FF", D: "#F59E0B", F: "#EF4444",
};

function fmtTime(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
}

const StudentReportModal = ({ userId, userName, onClose }: Props) => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [scores, setScores] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [scoresRes, quizRes, sessionsRes, analysesRes] = await Promise.all([
        (supabase as any).from("game_scores")
          .select("game, score, correct, total, best_streak, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        (supabase as any).from("quiz_attempts")
          .select("score, total, passed, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        (supabase as any).from("user_sessions")
          .select("started_at, duration_seconds")
          .eq("user_id", userId)
          .order("started_at", { ascending: false }),
        (supabase as any).from("student_session_analyses")
          .select("game, analysis_text, accuracy, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      setScores(scoresRes.data || []);
      setQuizzes(quizRes.data || []);
      setSessions(sessionsRes.data || []);
      setAnalyses(analysesRes.data || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportStudentReport(userId, userName, supabase);
    } finally {
      setExporting(false);
    }
  };

  const allAccuracies = scores.filter(s => s.total > 0).map(s => Math.round((s.correct / s.total) * 100));
  const avgAcc = allAccuracies.length ? Math.round(allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length) : null;
  const overallGrade = avgAcc !== null ? getGrade(avgAcc) : "—";
  const gradeColor = avgAcc !== null ? GRADE_COLORS[overallGrade] : "#666";
  const bestStreak = Math.max(0, ...scores.map(s => s.best_streak || 0));
  const totalSeconds = sessions.reduce((s, r) => s + (r.duration_seconds || 0), 0);

  const gameMap = new Map<string, { sessions: number; accs: number[] }>();
  scores.forEach(s => {
    const e = gameMap.get(s.game) ?? { sessions: 0, accs: [] };
    e.sessions++;
    if (s.total > 0) e.accs.push(Math.round((s.correct / s.total) * 100));
    gameMap.set(s.game, e);
  });

  return (
    <div
      className="fixed inset-0 z-[950] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        style={{ background: "linear-gradient(145deg, #151228 0%, #0f0d1a 100%)", border: "1px solid rgba(255,45,120,0.25)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 w-full shrink-0" style={{ background: "linear-gradient(90deg, #FF2D78, #A855F7, #00D4FF)" }} />

        <div className="px-5 pt-4 pb-3 flex items-start justify-between shrink-0">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase" style={{ fontFamily: "'DM Mono',monospace" }}>
              Performance Report
            </p>
            <h2 className="text-lg font-black text-white" style={{ fontFamily: "'Orbitron',monospace" }}>
              {userName}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div
                className="rounded-xl p-4 text-center"
                style={{ background: "rgba(255,45,120,0.08)", border: "1px solid rgba(255,45,120,0.2)" }}
              >
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest" style={{ fontFamily: "'DM Mono',monospace" }}>
                  Overall Grade
                </p>
                <div
                  className="text-7xl font-black"
                  style={{ fontFamily: "'Orbitron',monospace", color: gradeColor, textShadow: `0 0 40px ${gradeColor}80` }}
                >
                  {overallGrade}
                </div>
                {avgAcc !== null && (
                  <p className="text-sm text-muted-foreground mt-1">{avgAcc}% average accuracy</p>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: <Target className="w-4 h-4" />, label: "Sessions", value: scores.length, color: "#00D4FF" },
                  { icon: <Flame className="w-4 h-4" />, label: "Best Streak", value: `${bestStreak}🔥`, color: "#FF2D78" },
                  { icon: <Trophy className="w-4 h-4" />, label: "Quizzes", value: quizzes.length, color: "#F59E0B" },
                  { icon: <Zap className="w-4 h-4" />, label: "Time", value: fmtTime(totalSeconds), color: "#39D98A" },
                ].map(s => (
                  <div
                    key={s.label}
                    className="rounded-xl p-2.5 text-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                    <p className="text-sm font-bold text-white">{s.value}</p>
                    <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono',monospace" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {gameMap.size > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p
                    className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-3 py-2"
                    style={{ fontFamily: "'DM Mono',monospace", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    Games
                  </p>
                  {Array.from(gameMap.entries()).map(([game, d], i) => {
                    const avgGameAcc = d.accs.length ? Math.round(d.accs.reduce((a, b) => a + b, 0) / d.accs.length) : null;
                    const g = avgGameAcc !== null ? getGrade(avgGameAcc) : null;
                    return (
                      <div
                        key={game}
                        className="flex items-center gap-3 px-3 py-2.5"
                        style={{ borderBottom: i < gameMap.size - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                      >
                        <span className="text-xs text-white flex-1 font-medium">{GAME_LABELS[game] || game}</span>
                        <span className="text-xs text-muted-foreground">{d.sessions}×</span>
                        {g && (
                          <span className="text-xs font-black w-5 text-center" style={{ color: GRADE_COLORS[g] }}>{g}</span>
                        )}
                        {avgGameAcc !== null && (
                          <span className="text-xs font-bold text-muted-foreground w-10 text-right">{avgGameAcc}%</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {analyses.length > 0 && (
                <div className="space-y-2">
                  <p
                    className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                    style={{ fontFamily: "'DM Mono',monospace" }}
                  >
                    Recent Session Notes
                  </p>
                  {analyses.map((a, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-3"
                      style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Brain className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs font-semibold text-purple-300">{GAME_LABELS[a.game] || a.game}</span>
                        {a.accuracy !== null && (
                          <span className="text-xs text-muted-foreground ml-auto">{a.accuracy}%</span>
                        )}
                        <span className="text-xs text-muted-foreground">{fmtDate(a.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{a.analysis_text}</p>
                    </div>
                  ))}
                </div>
              )}

              {analyses.length === 0 && !loading && (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.15)" }}
                >
                  <Brain className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Complete a game or quiz to see AI session notes here.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-4 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <Button
            className="w-full font-bold gap-2 text-white"
            onClick={handleExport}
            disabled={exporting || loading}
            style={{ background: "linear-gradient(135deg,#FF2D78,#A855F7)", border: "none" }}
          >
            {exporting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Excel…</>
              : <><Download className="w-4 h-4" /> Download Full Excel Report</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StudentReportModal;
