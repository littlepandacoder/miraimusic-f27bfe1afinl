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

function accuracy(correct: number, total: number): number | null {
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

function pct(val: number | null): string {
  return val !== null ? `${val}%` : "—";
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

// ─── Student self-report ──────────────────────────────────────────────────────

export async function exportStudentReport(
  userId: string,
  userName: string,
  supabase: SupabaseClient
): Promise<void> {
  const [scoresRes, quizRes, sessionsRes] = await Promise.all([
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
  ]);

  const scores: any[]   = scoresRes.data   || [];
  const quizzes: any[]  = quizRes.data      || [];
  const sessions: any[] = sessionsRes.data  || [];

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Overview ──────────────────────────────────────────────────────
  const totalGameSessions = scores.length;
  const totalSeconds      = sessions.reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0);
  const allAccuracies     = scores
    .filter((s: any) => s.total > 0)
    .map((s: any) => Math.round((s.correct / s.total) * 100));
  const avgAcc = allAccuracies.length > 0
    ? Math.round(allAccuracies.reduce((a: number, b: number) => a + b, 0) / allAccuracies.length)
    : null;
  const gamesPlayed = new Set(scores.map((s: any) => s.game)).size;

  const overviewRows = [
    { Metric: "Student Name",            Value: userName },
    { Metric: "Report Generated",        Value: fmtDate(new Date().toISOString()) },
    { Metric: "",                         Value: "" },
    { Metric: "── Game Activity ──",     Value: "" },
    { Metric: "Total Game Sessions",     Value: totalGameSessions },
    { Metric: "Games Played",            Value: gamesPlayed },
    { Metric: "Overall Avg Accuracy",    Value: pct(avgAcc) },
    { Metric: "",                         Value: "" },
    { Metric: "── Per-Game Sessions ──", Value: "" },
    ...Object.entries(GAME_LABELS).map(([key, label]) => ({
      Metric: label,
      Value:  scores.filter((s: any) => s.game === key).length,
    })),
    { Metric: "",                         Value: "" },
    { Metric: "── Learning Activity ──", Value: "" },
    { Metric: "Quiz Attempts",           Value: quizzes.length },
    { Metric: "Quizzes Passed",          Value: quizzes.filter((q: any) => q.passed).length },
    { Metric: "",                         Value: "" },
    { Metric: "── Session Log ──",       Value: "" },
    { Metric: "Total Login Sessions",    Value: sessions.length },
    { Metric: "Total Time Spent",        Value: fmtDuration(totalSeconds) },
    { Metric: "Last Login",              Value: sessions[0] ? fmtDate(sessions[0].started_at) : "—" },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewRows), "Overview");

  // ── Sheet 2: All Game Sessions ─────────────────────────────────────────────
  const sessionRows = scores.map((s: any) => {
    const acc = accuracy(s.correct, s.total);
    return {
      "Date / Time":      fmtDate(s.created_at),
      "Game":             GAME_LABELS[s.game] || s.game,
      "Score":            s.score,
      "Correct":          s.correct,
      "Total Questions":  s.total,
      "Accuracy %":       pct(acc),
      "Grade":            acc !== null ? getGrade(acc) : "—",
      "Best Streak":      s.best_streak || 0,
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(sessionRows.length ? sessionRows : [{ Note: "No game sessions yet" }]),
    "All Game Sessions"
  );

  // ── Sheet 3: Game Summary ──────────────────────────────────────────────────
  const gameMap = new Map<string, {
    sessions: number; bestScore: number; accuracies: number[]; streaks: number[]; lastPlayed: string;
  }>();
  scores.forEach((s: any) => {
    const e = gameMap.get(s.game) || { sessions: 0, bestScore: 0, accuracies: [], streaks: [], lastPlayed: "" };
    e.sessions++;
    if (s.score > e.bestScore) e.bestScore = s.score;
    if (s.total > 0) e.accuracies.push(Math.round((s.correct / s.total) * 100));
    e.streaks.push(s.best_streak || 0);
    if (!e.lastPlayed || s.created_at > e.lastPlayed) e.lastPlayed = s.created_at;
    gameMap.set(s.game, e);
  });

  const summaryRows = Array.from(gameMap.entries()).map(([game, d]) => {
    const avgA  = d.accuracies.length > 0
      ? Math.round(d.accuracies.reduce((a, b) => a + b, 0) / d.accuracies.length) : null;
    const bestA = d.accuracies.length > 0 ? Math.max(...d.accuracies) : null;
    return {
      "Game":             GAME_LABELS[game] || game,
      "Sessions":         d.sessions,
      "Best Score":       d.bestScore,
      "Avg Accuracy %":   pct(avgA),
      "Best Accuracy %":  pct(bestA),
      "Grade (Best)":     bestA !== null ? getGrade(bestA) : "—",
      "Best Streak":      Math.max(...d.streaks),
      "Last Played":      fmtDate(d.lastPlayed),
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ Note: "No game activity yet" }]),
    "Game Summary"
  );

  // ── Sheet 4: Daily Review Quiz ─────────────────────────────────────────────
  const dailyRows = scores
    .filter((s: any) => s.game === "daily_review")
    .map((s: any) => {
      const acc = accuracy(s.correct, s.total);
      return {
        "Date / Time":      fmtDate(s.created_at),
        "Score":            s.score,
        "Correct":          s.correct,
        "Out Of":           s.total,
        "Accuracy %":       pct(acc),
        "Grade":            acc !== null ? getGrade(acc) : "—",
        "Best Streak":      s.best_streak || 0,
        "Analysis":         acc !== null
          ? acc >= 85
            ? "Strong performance"
            : acc >= 70
              ? "Good – keep practising"
              : acc >= 55
                ? "Fair – review weak areas"
                : "Needs improvement – revisit foundation lessons"
          : "—",
      };
    });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(dailyRows.length ? dailyRows : [{ Note: "No Daily Review sessions yet" }]),
    "Daily Review"
  );

  // ── Sheet 5: Quiz Attempts ─────────────────────────────────────────────────
  const quizRows = quizzes.map((q: any) => {
    const acc = accuracy(q.score, q.total);
    return {
      "Date / Time":    fmtDate(q.created_at),
      "Score":          q.score,
      "Out Of":         q.total,
      "Accuracy %":     pct(acc),
      "Grade":          acc !== null ? getGrade(acc) : "—",
      "Passed":         q.passed ? "Yes" : "No",
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(quizRows.length ? quizRows : [{ Note: "No quiz attempts yet" }]),
    "Quiz Attempts"
  );

  // ── Sheet 6: Session Activity ──────────────────────────────────────────────
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

  const safeName = userName.replace(/[^a-z0-9]/gi, "_");
  downloadWorkbook(wb, `Musicable_Report_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      .select("user_id, score, total, passed, created_at")
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

  const nameMap = new Map(students.map((s) => [s.id, s.full_name]));
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Student Overview ──────────────────────────────────────────────
  const overviewRows = students.map((s) => {
    const studentScores = scores.filter((sc: any) => sc.user_id === s.id);
    const allAcc = studentScores
      .filter((sc: any) => sc.total > 0)
      .map((sc: any) => Math.round((sc.correct / sc.total) * 100));
    const avgAcc = allAcc.length > 0
      ? Math.round(allAcc.reduce((a: number, b: number) => a + b, 0) / allAcc.length) : null;
    return {
      "Name":                     s.full_name,
      "Email":                    s.email,
      "Foundation %":             `${s.foundationPct}%`,
      "Foundation Lessons Done":  s.completedFoundationLessons,
      "Foundation Lessons Total": s.totalFoundationLessons,
      "Lessons Completed":        s.completed_lessons,
      "Lessons Total":            s.total_lessons,
      "Game Sessions":            s.gameSessions,
      "Avg Accuracy %":           pct(avgAcc),
      "Time Spent":               fmtDuration(s.totalSeconds),
      "Last Login":               fmtDate(s.lastSignIn),
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewRows), "Student Overview");

  // ── Sheet 2: All Game Sessions ─────────────────────────────────────────────
  const allSessionRows = scores.map((s: any) => {
    const acc = accuracy(s.correct, s.total);
    return {
      "Student":          nameMap.get(s.user_id) || s.user_id,
      "Date / Time":      fmtDate(s.created_at),
      "Game":             GAME_LABELS[s.game] || s.game,
      "Score":            s.score,
      "Correct":          s.correct,
      "Total Questions":  s.total,
      "Accuracy %":       pct(acc),
      "Grade":            acc !== null ? getGrade(acc) : "—",
      "Best Streak":      s.best_streak || 0,
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(allSessionRows.length ? allSessionRows : [{ Note: "No game sessions recorded" }]),
    "All Game Sessions"
  );

  // ── Sheet 3: Game Performance (per student per game) ──────────────────────
  const perfRows: any[] = [];
  students.forEach((s) => {
    const studentScores = scores.filter((sc: any) => sc.user_id === s.id);
    const games = new Set(studentScores.map((sc: any) => sc.game));
    games.forEach((game: any) => {
      const gs = studentScores.filter((sc: any) => sc.game === game);
      const accs = gs.filter((sc: any) => sc.total > 0).map((sc: any) =>
        Math.round((sc.correct / sc.total) * 100));
      const bestA = accs.length > 0 ? Math.max(...accs) : null;
      const avgA  = accs.length > 0
        ? Math.round(accs.reduce((a: number, b: number) => a + b, 0) / accs.length) : null;
      perfRows.push({
        "Student":           s.full_name,
        "Game":              GAME_LABELS[game] || game,
        "Sessions":          gs.length,
        "Best Score":        Math.max(...gs.map((sc: any) => sc.score)),
        "Avg Accuracy %":    pct(avgA),
        "Best Accuracy %":   pct(bestA),
        "Grade (Best)":      bestA !== null ? getGrade(bestA) : "—",
        "Best Streak":       Math.max(...gs.map((sc: any) => sc.best_streak || 0)),
        "Last Played":       fmtDate(gs[0]?.created_at ?? null),
      });
    });
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(perfRows.length ? perfRows : [{ Note: "No game data" }]),
    "Game Performance"
  );

  // ── Sheet 4: Quiz Attempts ─────────────────────────────────────────────────
  const quizRows = quizzes.map((q: any) => {
    const acc = accuracy(q.score, q.total);
    return {
      "Student":        nameMap.get(q.user_id) || q.user_id,
      "Date / Time":    fmtDate(q.created_at),
      "Score":          q.score,
      "Out Of":         q.total,
      "Accuracy %":     pct(acc),
      "Grade":          acc !== null ? getGrade(acc) : "—",
      "Passed":         q.passed ? "Yes" : "No",
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(quizRows.length ? quizRows : [{ Note: "No quiz attempts yet" }]),
    "Quiz Attempts"
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

  downloadWorkbook(wb, `Musicable_Class_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Single-student admin export ──────────────────────────────────────────────

export async function exportSingleStudentReport(
  student: AdminStudentRow,
  supabase: SupabaseClient
): Promise<void> {
  return exportStudentReport(student.id, student.full_name, supabase);
}
