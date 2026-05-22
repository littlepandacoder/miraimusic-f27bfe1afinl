import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";

const GAME_LABELS: Record<string, string> = {
  note_naming:                "Note Naming",
  sight_reading:              "Sight Reading",
  sight_reading_treble_test:  "Sight Reading – Treble Test",
  sight_reading_bass_test:    "Sight Reading – Bass Test",
  rhythm_quiz:                "Rhythm Quiz",
  piano_hero:                 "Piano Hero",
  daily_review:               "Daily Review Quiz",
};

function getGrade(accuracy: number): string {
  if (accuracy >= 95) return "S";
  if (accuracy >= 85) return "A";
  if (accuracy >= 70) return "B";
  if (accuracy >= 55) return "C";
  if (accuracy >= 40) return "D";
  return "F";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  if (seconds < 60)   return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function acc(correct: number, total: number): number | null {
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

function pct(val: number | null): string {
  return val !== null ? `${val}%` : "—";
}

function avg(arr: number[]): number | null {
  return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
}

// ─── AI analysis via edge function ───────────────────────────────────────────

async function fetchAiAnalysis(
  supabase: SupabaseClient,
  studentName: string,
  scores: any[],
  quizzes: any[],
  sessions: any[]
): Promise<string> {
  // Build per-game summary
  const gameMap = new Map<string, { sessions: number; accuracies: number[]; streaks: number[] }>();
  scores.forEach((s: any) => {
    const e = gameMap.get(s.game) ?? { sessions: 0, accuracies: [], streaks: [] };
    e.sessions++;
    if (s.total > 0) e.accuracies.push(Math.round((s.correct / s.total) * 100));
    e.streaks.push(s.best_streak || 0);
    gameMap.set(s.game, e);
  });

  const gameStats = Array.from(gameMap.entries()).map(([game, d]) => ({
    game:         GAME_LABELS[game] || game,
    sessions:     d.sessions,
    avgAccuracy:  avg(d.accuracies),
    bestAccuracy: d.accuracies.length > 0 ? Math.max(...d.accuracies) : null,
    bestStreak:   d.streaks.length > 0 ? Math.max(...d.streaks) : 0,
  }));

  const quizAccuracies = quizzes
    .filter((q: any) => q.total > 0)
    .map((q: any) => Math.round((q.score / q.total) * 100));

  const dailyAccuracies = scores
    .filter((s: any) => s.game === "daily_review" && s.total > 0)
    .map((s: any) => Math.round((s.correct / s.total) * 100));

  const totalSeconds = sessions.reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0);

  const quizStats = {
    total:              quizzes.length,
    passRate:           quizzes.length > 0
      ? Math.round((quizzes.filter((q: any) => q.passed).length / quizzes.length) * 100)
      : null,
    avgAccuracy:        avg(quizAccuracies),
    dailyReviewSessions: scores.filter((s: any) => s.game === "daily_review").length,
    avgDailyAccuracy:   avg(dailyAccuracies),
  };

  const sessionStats = {
    totalLogins: sessions.length,
    totalTime:   fmtDuration(totalSeconds),
  };

  try {
    const { data, error } = await (supabase as any).functions.invoke(
      "analyze-student-performance",
      { body: { studentName, gameStats, quizStats, sessionStats } }
    );
    if (error) throw error;
    return (data?.analysis as string) || "";
  } catch (e) {
    console.error("[exportReport] AI analysis failed:", e);
    return "";
  }
}

// ─── Student self-report ──────────────────────────────────────────────────────

export async function exportStudentReport(
  userId: string,
  userName: string,
  supabase: SupabaseClient
): Promise<void> {
  // Fetch raw data
  const [scoresRes, quizRes, sessionsRes, analysesRes] = await Promise.all([
    (supabase as any).from("game_scores")
      .select("game, score, correct, total, best_streak, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    (supabase as any).from("quiz_attempts")
      .select("score, total, passed, created_at, module_id, lesson_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    (supabase as any).from("user_sessions")
      .select("started_at, ended_at, duration_seconds")
      .eq("user_id", userId)
      .order("started_at", { ascending: false }),
    (supabase as any).from("student_session_analyses")
      .select("game, analysis_text, accuracy, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const scores: any[]   = scoresRes.data   || [];
  const quizzes: any[]  = quizRes.data      || [];
  const sessions: any[] = sessionsRes.data  || [];
  const analyses: any[] = analysesRes.data  || [];

  // Fetch module names for quiz rows
  const moduleIds = [...new Set(quizzes.map((q: any) => q.module_id).filter(Boolean))];
  const moduleNames: Record<string, string> = {};
  if (moduleIds.length > 0) {
    const { data: mods } = await (supabase as any)
      .from("foundation_modules").select("id, title").in("id", moduleIds);
    (mods || []).forEach((m: any) => { moduleNames[m.id] = m.title; });
  }

  // Fetch AI coaching notes (runs in parallel with workbook build)
  const aiPromise = fetchAiAnalysis(supabase, userName, scores, quizzes, sessions);

  // ── Build game-level aggregates ────────────────────────────────────────────
  const gameMap = new Map<string, {
    sessions: number; bestScore: number; accuracies: number[]; streaks: number[]; lastPlayed: string;
  }>();
  scores.forEach((s: any) => {
    const e = gameMap.get(s.game) ?? { sessions: 0, bestScore: 0, accuracies: [], streaks: [], lastPlayed: "" };
    e.sessions++;
    if (s.score > e.bestScore) e.bestScore = s.score;
    if (s.total > 0) e.accuracies.push(Math.round((s.correct / s.total) * 100));
    e.streaks.push(s.best_streak || 0);
    if (!e.lastPlayed || s.created_at > e.lastPlayed) e.lastPlayed = s.created_at;
    gameMap.set(s.game, e);
  });

  // ── Quiz summary values ────────────────────────────────────────────────────
  const quizAccuracies   = quizzes.filter((q: any) => q.total > 0).map((q: any) => Math.round((q.score / q.total) * 100));
  const dailyAccuracies  = scores.filter((s: any) => s.game === "daily_review" && s.total > 0)
                                 .map((s: any) => Math.round((s.correct / s.total) * 100));
  const totalSeconds     = sessions.reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0);
  const allAccuracies    = scores.filter((s: any) => s.total > 0).map((s: any) => Math.round((s.correct / s.total) * 100));

  // Await AI before writing the sheet
  const aiAnalysis = await aiPromise;

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: AI Analysis ───────────────────────────────────────────────────
  const analysisText = aiAnalysis ||
    "AI analysis could not be generated. Please check your internet connection and regenerate the report.";

  // Split into paragraphs so each reads as a distinct row in Excel
  const paragraphs = analysisText.split(/\n+/).filter((p: string) => p.trim());
  const analysisSheet: Record<string, string>[] = [
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": `Student: ${userName}` },
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": `Report generated: ${fmtDate(new Date().toISOString())}` },
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": "" },
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": "── AI COACHING NOTES ──" },
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": "" },
    ...paragraphs.map((p: string) => ({ "MUSICABLE STUDENT PERFORMANCE ANALYSIS": p })),
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": "" },
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": "── QUICK STATS ──" },
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": `Overall avg accuracy: ${pct(avg(allAccuracies))}` },
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": `Total game sessions: ${scores.length}` },
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": `Total login sessions: ${sessions.length}` },
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": `Total time spent: ${fmtDuration(totalSeconds)}` },
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": `Quiz attempts: ${quizzes.length}  |  Pass rate: ${quizzes.length > 0 ? pct(Math.round((quizzes.filter((q: any) => q.passed).length / quizzes.length) * 100)) : "—"}` },
    { "MUSICABLE STUDENT PERFORMANCE ANALYSIS": `Daily Review avg: ${pct(avg(dailyAccuracies))}` },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analysisSheet), "AI Analysis");

  // ── Sheet 2: Overview ──────────────────────────────────────────────────────
  const overviewRows = [
    { Metric: "Student Name",             Value: userName },
    { Metric: "Report Generated",         Value: fmtDate(new Date().toISOString()) },
    { Metric: "",                          Value: "" },
    { Metric: "── Game Activity ──",      Value: "" },
    { Metric: "Total Game Sessions",      Value: scores.length },
    { Metric: "Games Played",             Value: gameMap.size },
    { Metric: "Overall Avg Accuracy",     Value: pct(avg(allAccuracies)) },
    { Metric: "",                          Value: "" },
    { Metric: "── Per-Game Sessions ──",  Value: "" },
    ...Object.entries(GAME_LABELS).map(([key, label]) => ({
      Metric: label, Value: scores.filter((s: any) => s.game === key).length,
    })),
    { Metric: "",                          Value: "" },
    { Metric: "── Quiz & Review ──",      Value: "" },
    { Metric: "Quiz Attempts",            Value: quizzes.length },
    { Metric: "Quiz Pass Rate",           Value: quizzes.length > 0 ? pct(Math.round((quizzes.filter((q: any) => q.passed).length / quizzes.length) * 100)) : "—" },
    { Metric: "Quiz Avg Accuracy",        Value: pct(avg(quizAccuracies)) },
    { Metric: "Daily Review Sessions",    Value: scores.filter((s: any) => s.game === "daily_review").length },
    { Metric: "Daily Review Avg Accuracy",Value: pct(avg(dailyAccuracies)) },
    { Metric: "",                          Value: "" },
    { Metric: "── Session Log ──",        Value: "" },
    { Metric: "Total Login Sessions",     Value: sessions.length },
    { Metric: "Total Time Spent",         Value: fmtDuration(totalSeconds) },
    { Metric: "Last Login",               Value: sessions[0] ? fmtDate(sessions[0].started_at) : "—" },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewRows), "Overview");

  // ── Sheet 3: Quiz Attempts (with module name & % per attempt) ─────────────
  const quizRows = quizzes.map((q: any) => {
    const a = acc(q.score, q.total);
    return {
      "Date / Time":    fmtDate(q.created_at),
      "Module":         (q.module_id && moduleNames[q.module_id]) ? moduleNames[q.module_id] : "—",
      "Score":          q.score,
      "Out Of":         q.total,
      "Percentage":     pct(a),
      "Grade":          a !== null ? getGrade(a) : "—",
      "Passed":         q.passed ? "Yes" : "No",
      "Needs Work":     a !== null && a < 70
        ? a < 55 ? "Yes – revisit this module" : "Yes – more practice needed"
        : "No",
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(quizRows.length ? quizRows : [{ Note: "No quiz attempts yet" }]),
    "Quiz Attempts"
  );

  // ── Sheet 4: Daily Review Quiz ─────────────────────────────────────────────
  const dailyRows = scores
    .filter((s: any) => s.game === "daily_review")
    .map((s: any) => {
      const a = acc(s.correct, s.total);
      return {
        "Date / Time":  fmtDate(s.created_at),
        "Score":        s.score,
        "Correct":      s.correct,
        "Out Of":       s.total,
        "Percentage":   pct(a),
        "Grade":        a !== null ? getGrade(a) : "—",
        "Best Streak":  s.best_streak || 0,
        "Coaching Note": a !== null
          ? a >= 95 ? "Excellent – maintain this standard"
          : a >= 85 ? "Strong – keep up the daily reviews"
          : a >= 70 ? "Good – focus on any missed questions"
          : a >= 55 ? "Fair – revisit weak note/rhythm areas"
          : "Needs work – review foundation lessons before next session"
          : "—",
      };
    });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(dailyRows.length ? dailyRows : [{ Note: "No Daily Review sessions yet" }]),
    "Daily Review"
  );

  // ── Sheet 5: All Game Sessions ─────────────────────────────────────────────
  const sessionRows = scores.map((s: any) => {
    const a = acc(s.correct, s.total);
    return {
      "Date / Time":     fmtDate(s.created_at),
      "Game":            GAME_LABELS[s.game] || s.game,
      "Score":           s.score,
      "Correct":         s.correct,
      "Total Questions": s.total,
      "Percentage":      pct(a),
      "Grade":           a !== null ? getGrade(a) : "—",
      "Best Streak":     s.best_streak || 0,
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(sessionRows.length ? sessionRows : [{ Note: "No game sessions yet" }]),
    "All Game Sessions"
  );

  // ── Sheet 6: Game Summary ──────────────────────────────────────────────────
  const summaryRows = Array.from(gameMap.entries()).map(([game, d]) => {
    const avgA  = avg(d.accuracies);
    const bestA = d.accuracies.length > 0 ? Math.max(...d.accuracies) : null;
    return {
      "Game":            GAME_LABELS[game] || game,
      "Sessions":        d.sessions,
      "Best Score":      d.bestScore,
      "Avg Accuracy %":  pct(avgA),
      "Best Accuracy %": pct(bestA),
      "Grade (Best)":    bestA !== null ? getGrade(bestA) : "—",
      "Best Streak":     Math.max(...d.streaks),
      "Status":          bestA !== null
        ? bestA >= 85 ? "Strong"
        : bestA >= 70 ? "Good – keep practising"
        : "Needs improvement"
        : "No data",
      "Last Played":     fmtDate(d.lastPlayed),
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ Note: "No game activity yet" }]),
    "Game Summary"
  );

  // ── Sheet 7: Session Activity ──────────────────────────────────────────────
  const activityRows = sessions.map((s: any) => ({
    "Login Time":         fmtDate(s.started_at),
    "Session End":        fmtDate(s.ended_at),
    "Duration":           fmtDuration(s.duration_seconds || 0),
    "Duration (seconds)": s.duration_seconds || 0,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(activityRows.length ? activityRows : [{ Note: "No session data yet" }]),
    "Session Activity"
  );

  // ── Sheet 8: Session Notes (AI/rule-based per-session analyses) ─────────────
  const notesRows = analyses.map((a: any) => ({
    "Date / Time": fmtDate(a.created_at),
    "Game":        GAME_LABELS[a.game] || a.game,
    "Accuracy":    a.accuracy !== null ? `${a.accuracy}%` : "—",
    "Session Note": a.analysis_text,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(notesRows.length ? notesRows : [{ Note: "No session analyses yet — complete a game to generate notes" }]),
    "Session Notes"
  );

  const safeName = userName.replace(/[^a-z0-9]/gi, "_");
  XLSX.writeFile(wb, `Musicable_Report_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Admin all-students report ────────────────────────────────────────────────

export interface AdminStudentRow {
  id: string;
  full_name: string;
  email: string;
  completed_lessons: number;
  total_lessons: number;
  foundationPct: number;
  completedFoundationLessons: number;
  totalFoundationLessons: number;
  gameSessions: number;
  gameStats: { game: string; sessions: number; bestAcc: number | null; bestStreak: number }[];
  lastSignIn: string | null;
  totalSeconds: number;
}

export async function exportAllStudentsReport(
  students: AdminStudentRow[],
  supabase: SupabaseClient
): Promise<void> {
  const studentIds = students.map((s) => s.id);

  const [scoresRes, quizRes, sessionsRes] = await Promise.all([
    (supabase as any).from("game_scores")
      .select("user_id, game, score, correct, total, best_streak, created_at")
      .in("user_id", studentIds)
      .order("created_at", { ascending: false }),
    (supabase as any).from("quiz_attempts")
      .select("user_id, score, total, passed, created_at, module_id")
      .in("user_id", studentIds)
      .order("created_at", { ascending: false }),
    (supabase as any).from("user_sessions")
      .select("user_id, started_at, duration_seconds")
      .in("user_id", studentIds)
      .order("started_at", { ascending: false }),
  ]);

  const scores: any[]   = scoresRes.data   || [];
  const quizzes: any[]  = quizRes.data      || [];
  const sessions: any[] = sessionsRes.data  || [];

  // Fetch module names
  const moduleIds = [...new Set(quizzes.map((q: any) => q.module_id).filter(Boolean))];
  const moduleNames: Record<string, string> = {};
  if (moduleIds.length > 0) {
    const { data: mods } = await (supabase as any)
      .from("foundation_modules").select("id, title").in("id", moduleIds);
    (mods || []).forEach((m: any) => { moduleNames[m.id] = m.title; });
  }

  const nameMap = new Map(students.map((s) => [s.id, s.full_name]));
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Student Overview ──────────────────────────────────────────────
  const overviewRows = students.map((s) => {
    const studentScores = scores.filter((sc: any) => sc.user_id === s.id);
    const allAcc = studentScores
      .filter((sc: any) => sc.total > 0)
      .map((sc: any) => Math.round((sc.correct / sc.total) * 100));
    const studentQuizzes = quizzes.filter((q: any) => q.user_id === s.id);
    const quizAcc = studentQuizzes
      .filter((q: any) => q.total > 0)
      .map((q: any) => Math.round((q.score / q.total) * 100));
    return {
      "Name":                      s.full_name,
      "Email":                     s.email,
      "Foundation %":              `${s.foundationPct}%`,
      "Foundation Done":           s.completedFoundationLessons,
      "Foundation Total":          s.totalFoundationLessons,
      "Lessons Completed":         s.completed_lessons,
      "Lessons Total":             s.total_lessons,
      "Game Sessions":             s.gameSessions,
      "Game Avg Accuracy %":       pct(avg(allAcc)),
      "Quiz Attempts":             studentQuizzes.length,
      "Quiz Avg Accuracy %":       pct(avg(quizAcc)),
      "Quiz Pass Rate":            studentQuizzes.length > 0
        ? pct(Math.round((studentQuizzes.filter((q: any) => q.passed).length / studentQuizzes.length) * 100))
        : "—",
      "Time Spent":                fmtDuration(s.totalSeconds),
      "Last Login":                fmtDate(s.lastSignIn),
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewRows), "Student Overview");

  // ── Sheet 2: Quiz Attempts (all students, with % per attempt) ─────────────
  const allQuizRows = quizzes.map((q: any) => {
    const a = acc(q.score, q.total);
    return {
      "Student":      nameMap.get(q.user_id) || q.user_id,
      "Date / Time":  fmtDate(q.created_at),
      "Module":       (q.module_id && moduleNames[q.module_id]) ? moduleNames[q.module_id] : "—",
      "Score":        q.score,
      "Out Of":       q.total,
      "Percentage":   pct(a),
      "Grade":        a !== null ? getGrade(a) : "—",
      "Passed":       q.passed ? "Yes" : "No",
      "Needs Work":   a !== null && a < 70 ? "Yes" : "No",
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(allQuizRows.length ? allQuizRows : [{ Note: "No quiz attempts yet" }]),
    "Quiz Attempts"
  );

  // ── Sheet 3: All Game Sessions ─────────────────────────────────────────────
  const allSessionRows = scores.map((s: any) => {
    const a = acc(s.correct, s.total);
    return {
      "Student":         nameMap.get(s.user_id) || s.user_id,
      "Date / Time":     fmtDate(s.created_at),
      "Game":            GAME_LABELS[s.game] || s.game,
      "Score":           s.score,
      "Correct":         s.correct,
      "Total Questions": s.total,
      "Percentage":      pct(a),
      "Grade":           a !== null ? getGrade(a) : "—",
      "Best Streak":     s.best_streak || 0,
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(allSessionRows.length ? allSessionRows : [{ Note: "No game sessions recorded" }]),
    "All Game Sessions"
  );

  // ── Sheet 4: Game Performance (per student per game) ──────────────────────
  const perfRows: any[] = [];
  students.forEach((s) => {
    const studentScores = scores.filter((sc: any) => sc.user_id === s.id);
    const games = new Set(studentScores.map((sc: any) => sc.game));
    games.forEach((game: any) => {
      const gs  = studentScores.filter((sc: any) => sc.game === game);
      const accs = gs.filter((sc: any) => sc.total > 0).map((sc: any) =>
        Math.round((sc.correct / sc.total) * 100));
      const bestA = accs.length > 0 ? Math.max(...accs) : null;
      const avgA  = avg(accs);
      perfRows.push({
        "Student":          s.full_name,
        "Game":             GAME_LABELS[game] || game,
        "Sessions":         gs.length,
        "Best Score":       Math.max(...gs.map((sc: any) => sc.score)),
        "Avg Accuracy %":   pct(avgA),
        "Best Accuracy %":  pct(bestA),
        "Grade (Best)":     bestA !== null ? getGrade(bestA) : "—",
        "Best Streak":      Math.max(...gs.map((sc: any) => sc.best_streak || 0)),
        "Status":           bestA !== null
          ? bestA >= 85 ? "Strong"
          : bestA >= 70 ? "Good"
          : "Needs improvement"
          : "No data",
        "Last Played":      fmtDate(gs[0]?.created_at ?? null),
      });
    });
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(perfRows.length ? perfRows : [{ Note: "No game data" }]),
    "Game Performance"
  );

  // ── Sheet 5: Session Activity ──────────────────────────────────────────────
  const actRows = sessions.map((s: any) => ({
    "Student":            nameMap.get(s.user_id) || s.user_id,
    "Login Time":         fmtDate(s.started_at),
    "Duration":           fmtDuration(s.duration_seconds || 0),
    "Duration (seconds)": s.duration_seconds || 0,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(actRows.length ? actRows : [{ Note: "No session data" }]),
    "Session Activity"
  );

  XLSX.writeFile(wb, `Musicable_Class_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Single-student admin export (includes AI analysis) ───────────────────────

export async function exportSingleStudentReport(
  student: AdminStudentRow,
  supabase: SupabaseClient
): Promise<void> {
  return exportStudentReport(student.id, student.full_name, supabase);
}
