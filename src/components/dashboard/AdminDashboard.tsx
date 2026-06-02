import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, BookOpen, UserPlus, Gamepad2, Loader2, ChevronDown, ChevronUp, Trophy, Clock, LogIn, FileDown, RotateCcw } from "lucide-react";
import { exportAllStudentsReport, exportSingleStudentReport, type AdminStudentRow } from "@/lib/exportReport";
import ManageUsers from "./admin/ManageUsers";
import ManageLessons from "./admin/ManageLessons";
import ManageSlots from "./admin/ManageSlots";
import ManageFoundation from "./admin/ManageFoundation";

import ManageCourses from "./admin/ManageCourses";
import ManagePianoHero from "./admin/ManagePianoHero";
import ManageAssignments from "./admin/ManageAssignments";
import ManageAffiliates from "./admin/ManageAffiliates";
import ManageStudentVideos from "./admin/ManageStudentVideos";
import LessonEditor from "./teacher/LessonEditor";
import LessonViewer from "./student/LessonViewer";

interface GameStat { game: string; sessions: number; bestAcc: number | null; bestStreak: number; }

interface StudentStat {
  id: string;
  full_name: string;
  email: string;
  total_lessons: number;
  completed_lessons: number;
  foundationPct: number;
  completedFoundationLessons: number;
  totalFoundationLessons: number;
  gameSessions: number;
  gameStats: GameStat[];
  lastSignIn: string | null;
  totalSeconds: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function formatLastSeen(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const GAME_LABELS: Record<string, string> = {
  piano_hero: "Piano Hero",
  note_naming: "Note Naming",
  rhythm_quiz: "Rhythm Quiz",
  sight_reading: "Sight Reading",
};

const StudentStatsTable = () => {
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [resettingTimeId, setResettingTimeId] = useState<string | null>(null);

  const handleExportAll = async () => {
    setExportingAll(true);
    try { await exportAllStudentsReport(students as AdminStudentRow[], supabase); }
    finally { setExportingAll(false); }
  };

  const handleExportStudent = async (s: StudentStat) => {
    setExportingId(s.id);
    try { await exportSingleStudentReport(s as AdminStudentRow, supabase); }
    finally { setExportingId(null); }
  };

  const handleResetTime = async (userId: string) => {
    setResettingTimeId(userId);
    try {
      await (supabase as any).rpc("admin_reset_student_time", { p_user_id: userId });
      setStudents(prev => prev.map(s => s.id === userId ? { ...s, totalSeconds: 0 } : s));
    } catch (e: any) {
      console.error("Reset time failed:", e.message);
    } finally {
      setResettingTimeId(null);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      const [rolesRes, allLessonsRes] = await Promise.all([
        (supabase as any).rpc("admin_get_all_user_roles"),
        (supabase as any).from("foundation_lessons").select("id"),
      ]);

      const studentIds: string[] = (rolesRes.data || [])
        .filter((r: any) => r.role === "student")
        .map((r: any) => r.user_id);
      if (studentIds.length === 0) { setLoading(false); return; }

      const totalFoundationLessons = (allLessonsRes.data || []).length;
      const foundationLessonIds = new Set((allLessonsRes.data || []).map((l: any) => l.id));

      const [profilesRes, lessonsRes, progressRes, gameRes, activityRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", studentIds),
        supabase.from("lessons").select("student_id, status").in("student_id", studentIds),
        (supabase as any).from("student_lesson_progress").select("student_id, lesson_id, completed").in("student_id", studentIds),
        (supabase as any).from("game_scores").select("user_id, game, correct, total, best_streak").in("user_id", studentIds),
        (supabase as any).rpc("admin_get_student_activity", { p_user_ids: studentIds }),
      ]);

      const activityMap = new Map<string, { lastSignIn: string | null; totalSeconds: number }>();
      (activityRes.data || []).forEach((a: any) => {
        activityMap.set(a.user_id, { lastSignIn: a.last_sign_in_at, totalSeconds: Number(a.total_seconds) || 0 });
      });

      const statsMap = new Map<string, { total: number; completed: number }>();
      (lessonsRes.data || []).forEach((l: any) => {
        const s = statsMap.get(l.student_id) || { total: 0, completed: 0 };
        s.total++;
        if (l.status === "completed") s.completed++;
        statsMap.set(l.student_id, s);
      });

      const foundationMap = new Map<string, number>();
      (progressRes.data || []).forEach((p: any) => {
        if (p.completed && foundationLessonIds.has(p.lesson_id)) {
          foundationMap.set(p.student_id, (foundationMap.get(p.student_id) || 0) + 1);
        }
      });

      const gameMap = new Map<string, GameStat[]>();
      (gameRes.data || []).forEach((g: any) => {
        const list = gameMap.get(g.user_id) || [];
        const existing = list.find(x => x.game === g.game);
        const acc = g.total > 0 ? Math.round((g.correct / g.total) * 100) : null;
        if (existing) {
          existing.sessions++;
          if (acc !== null && (existing.bestAcc === null || acc > existing.bestAcc)) existing.bestAcc = acc;
          if (g.best_streak > existing.bestStreak) existing.bestStreak = g.best_streak;
        } else {
          list.push({ game: g.game, sessions: 1, bestAcc: acc, bestStreak: g.best_streak || 0 });
        }
        gameMap.set(g.user_id, list);
      });

      setStudents((profilesRes.data || []).map((p: any) => {
        const completedFoundationLessons = foundationMap.get(p.user_id) || 0;
        const gameStats = gameMap.get(p.user_id) || [];
        const activity = activityMap.get(p.user_id) ?? { lastSignIn: null, totalSeconds: 0 };
        return {
          id: p.user_id,
          full_name: p.full_name || "—",
          email: p.email || "—",
          total_lessons: statsMap.get(p.user_id)?.total || 0,
          completed_lessons: statsMap.get(p.user_id)?.completed || 0,
          foundationPct: totalFoundationLessons > 0
            ? Math.round((completedFoundationLessons / totalFoundationLessons) * 100)
            : 0,
          completedFoundationLessons,
          totalFoundationLessons,
          gameSessions: gameStats.reduce((s, g) => s + g.sessions, 0),
          gameStats,
          lastSignIn: activity.lastSignIn,
          totalSeconds: activity.totalSeconds,
        };
      }));
      setLoading(false);
    };

    fetch();
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading students…
    </div>
  );

  if (students.length === 0) return (
    <p className="text-muted-foreground text-center py-8">No students registered yet.</p>
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-end pb-1">
        <Button
          size="sm"
          onClick={handleExportAll}
          disabled={exportingAll}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-pink-500 text-white border-0"
        >
          {exportingAll
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            : <><FileDown className="w-4 h-4" /> Export All Students</>}
        </Button>
      </div>
      {students.map((s) => (
        <div key={s.id} className="rounded-xl border border-border overflow-hidden">
          <div
            className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-x-4 gap-y-1 items-center min-w-0">
              <div className="min-w-0">
                <p className="font-semibold truncate">{s.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{s.email}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Foundation</p>
                <div className="flex items-center gap-2">
                  <Progress value={s.foundationPct} className="h-1.5 flex-1" />
                  <span className="text-xs font-semibold whitespace-nowrap">{s.foundationPct}%</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Lessons</p>
                <p className="font-bold">{s.completed_lessons}<span className="text-muted-foreground font-normal">/{s.total_lessons}</span></p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Games</p>
                <p className="font-bold">{s.gameSessions}</p>
              </div>
              <div className="text-center hidden sm:block">
                <p className="text-xs text-muted-foreground">Last Login</p>
                <p className="text-xs font-semibold whitespace-nowrap">{formatLastSeen(s.lastSignIn)}</p>
              </div>
              <div className="text-center hidden sm:block">
                <p className="text-xs text-muted-foreground">Time Spent</p>
                <p className="text-xs font-semibold whitespace-nowrap">{s.totalSeconds > 0 ? formatDuration(s.totalSeconds) : "—"}</p>
              </div>
            </div>
            {expandedId === s.id
              ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
          </div>

          {expandedId === s.id && (
            <div className="border-t border-border bg-black/20 px-4 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Foundation
                </p>
                <div className="flex justify-between text-sm">
                  <span>Lessons completed</span>
                  <span className="font-bold">{s.completedFoundationLessons} / {s.totalFoundationLessons}</span>
                </div>
                <Progress value={s.foundationPct} className="h-2" />
                <p className="text-xs text-muted-foreground">{s.foundationPct}% of foundation curriculum</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Lessons
                </p>
                <div className="flex justify-between text-sm"><span>Completed</span><Badge className="bg-green-500/20 text-green-400 border-green-500/30">{s.completed_lessons}</Badge></div>
                <div className="flex justify-between text-sm"><span>Total booked</span><span className="font-bold">{s.total_lessons}</span></div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <LogIn className="w-3 h-3" /> Activity
                </p>
                <div className="flex justify-between text-sm">
                  <span>Last login</span>
                  <span className="font-bold">{formatLastSeen(s.lastSignIn)}</span>
                </div>
                {s.lastSignIn && (
                  <p className="text-xs text-muted-foreground">{new Date(s.lastSignIn).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                )}
                <div className="flex justify-between text-sm items-center">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Time spent</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{s.totalSeconds > 0 ? formatDuration(s.totalSeconds) : "—"}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      title="Reset time spent"
                      disabled={resettingTimeId === s.id}
                      onClick={(e) => { e.stopPropagation(); handleResetTime(s.id); }}
                    >
                      {resettingTimeId === s.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <RotateCcw className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <Gamepad2 className="w-3 h-3" /> Games
                </p>
                {s.gameStats.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No game activity yet</p>
                ) : (
                  s.gameStats.map(g => (
                    <div key={g.game} className="flex justify-between text-xs items-center">
                      <span className="text-muted-foreground">{GAME_LABELS[g.game] || g.game}</span>
                      <div className="flex gap-2 items-center">
                        <span>{g.sessions} sessions</span>
                        {g.bestAcc !== null && <Badge className="bg-primary/20 text-primary border-primary/30 text-xs py-0">{g.bestAcc}% best</Badge>}
                      </div>
                    </div>
                  ))
                )}
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleExportStudent(s); }}
                  disabled={exportingId === s.id}
                  className="w-full mt-2 flex items-center gap-2 bg-yellow-400 hover:bg-pink-500 text-white border-0 text-xs h-7"
                >
                  {exportingId === s.id
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                    : <><FileDown className="w-3 h-3" /> Download Student Report</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const AdminHome = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalLessons: 0,
    upcomingLessons: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [studentsRes, teachersRes, lessonsRes, upcomingRes] = await Promise.all([
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("lessons").select("*", { count: "exact", head: true }),
        supabase.from("lessons").select("*", { count: "exact", head: true }).eq("status", "scheduled").gte("scheduled_date", new Date().toISOString().split("T")[0]),
      ]);

      if (studentsRes.error) console.error("fetchStats students:", studentsRes.error.message);
      if (teachersRes.error) console.error("fetchStats teachers:", teachersRes.error.message);
      if (lessonsRes.error)  console.error("fetchStats lessons:",  lessonsRes.error.message);
      if (upcomingRes.error) console.error("fetchStats upcoming:", upcomingRes.error.message);

      setStats({
        totalStudents: studentsRes.count ?? 0,
        totalTeachers: teachersRes.count ?? 0,
        totalLessons:  lessonsRes.count  ?? 0,
        upcomingLessons: upcomingRes.count ?? 0,
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalStudents}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Teachers</CardTitle>
            <UserPlus className="w-5 h-5 text-cyan" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalTeachers}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Lessons</CardTitle>
            <BookOpen className="w-5 h-5 text-lime" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalLessons}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Lessons</CardTitle>
            <Calendar className="w-5 h-5 text-purple" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.upcomingLessons}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/dashboard/users" className="feature-card flex items-center gap-4 p-4">
            <UserPlus className="w-8 h-8 text-primary" />
            <div>
              <p className="font-semibold">Register New User</p>
              <p className="text-sm text-muted-foreground">Add students or teachers</p>
            </div>
          </a>
          <a href="/dashboard/lessons" className="feature-card flex items-center gap-4 p-4">
            <Calendar className="w-8 h-8 text-cyan" />
            <div>
              <p className="font-semibold">View All Lessons</p>
              <p className="text-sm text-muted-foreground">Manage scheduled lessons</p>
            </div>
          </a>
          <a href="/dashboard/slots" className="feature-card flex items-center gap-4 p-4">
            <BookOpen className="w-8 h-8 text-lime" />
            <div>
              <p className="font-semibold">Manage Time Slots</p>
              <p className="text-sm text-muted-foreground">Set available times</p>
            </div>
          </a>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Student Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StudentStatsTable />
        </CardContent>
      </Card>
    </div>
  );
};

const AdminDashboard = () => {
  return (
    <DashboardLayout title="Admin Dashboard" role="admin">
      <Routes>
        <Route index element={<AdminHome />} />
        <Route path="/" element={<AdminHome />} />
        <Route path="/users" element={<ManageUsers />} />
        <Route path="/lessons" element={<ManageLessons />} />
        <Route path="/slots" element={<ManageSlots />} />
        <Route path="/foundation" element={<ManageFoundation />} />

        <Route path="/courses" element={<ManageCourses />} />
        <Route path="/piano-hero" element={<ManagePianoHero />} />
        <Route path="/districts"  element={<ManageAssignments />} />
        <Route path="/affiliates" element={<ManageAffiliates />} />
        <Route path="/student-videos" element={<ManageStudentVideos />} />
        <Route path="/foundation/lesson-editor/:moduleId/:lessonId" element={<LessonEditor />} />
        <Route path="/foundation/lesson-viewer/:moduleId/:lessonId" element={<LessonViewer />} />
      </Routes>
    </DashboardLayout>
  );
};

export default AdminDashboard;
