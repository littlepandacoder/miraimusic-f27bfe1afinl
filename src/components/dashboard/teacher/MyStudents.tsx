import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2, Users, ShoppingCart, Minus, Plus, ChevronDown, ChevronUp, Trophy, Gamepad2, BookOpen } from "lucide-react";
import { PAYPAL_ORDERS_SDK_URL, IS_SANDBOX } from "@/lib/paypal";

interface GameStat { game: string; sessions: number; bestAcc: number | null; bestStreak: number; }

interface Student {
  id: string;
  full_name: string;
  email: string;
  total_lessons: number;
  completed_lessons: number;
  next_lesson?: string;
  foundationPct: number;
  completedFoundationLessons: number;
  totalFoundationLessons: number;
  gameSessions: number;
  gameStats: GameStat[];
}

interface SeatInfo { total_seats: number; used_seats: number; available_seats: number; }

const SEAT_PRICE = 1;

const GAME_LABELS: Record<string, string> = {
  piano_hero: "Piano Hero",
  note_naming: "Note Naming",
  rhythm_quiz: "Rhythm Quiz",
  sight_reading: "Sight Reading",
  tap_rhythm: "Tap Rhythm",
};

const MyStudents = () => {
  const { user } = useAuth();
  const [students, setStudents]   = useState<Student[]>([]);
  const [loading, setLoading]     = useState(true);
  const [seatInfo, setSeatInfo]   = useState<SeatInfo | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBuyOpen, setIsBuyOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ email: "", full_name: "", password: "" });
  const [isAdding, setIsAdding]   = useState(false);
  const [extraSeats, setExtraSeats] = useState(1);
  const [buyProcessing, setBuyProcessing] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [buyError, setBuyError]   = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const paypalRendered = useRef(false);
  const { toast } = useToast();

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [seatRes, rosterRes] = await Promise.all([
      (supabase as any).rpc("get_teacher_seat_info", { p_teacher_id: user.id }),
      (supabase as any).from("teacher_students").select("student_id").eq("teacher_id", user.id),
    ]);

    const info = Array.isArray(seatRes.data) ? seatRes.data[0] : seatRes.data;
    setSeatInfo(info ?? { total_seats: 0, used_seats: 0, available_seats: 0 });

    const rosterIds: string[] = (rosterRes.data || []).map((r: any) => r.student_id);
    if (rosterIds.length === 0) { setStudents([]); setLoading(false); return; }

    // Fetch all data in parallel
    const [profilesRes, lessonsRes, allLessonsRes, progressRes, gameRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email").in("user_id", rosterIds),
      supabase.from("lessons").select("student_id, status, scheduled_date, scheduled_time")
        .eq("teacher_id", user.id).in("student_id", rosterIds),
      (supabase as any).from("foundation_lessons").select("id, module_id"),
      (supabase as any).from("student_lesson_progress").select("student_id, lesson_id, completed").in("student_id", rosterIds),
      (supabase as any).from("game_scores").select("user_id, game, correct, total, best_streak").in("user_id", rosterIds),
    ]);

    const totalFoundationLessons = (allLessonsRes.data || []).length;
    const foundationLessonIds = new Set((allLessonsRes.data || []).map((l: any) => l.id));

    // Lesson stats per student
    const statsMap = new Map<string, { total: number; completed: number; nextLesson?: string }>();
    (lessonsRes.data || []).forEach((l: any) => {
      const s = statsMap.get(l.student_id) || { total: 0, completed: 0 };
      s.total++;
      if (l.status === "completed") s.completed++;
      if (l.status === "scheduled") {
        const dt = `${l.scheduled_date}T${l.scheduled_time}`;
        if (!s.nextLesson || dt < s.nextLesson) s.nextLesson = dt;
      }
      statsMap.set(l.student_id, s);
    });

    // Foundation progress per student
    const foundationMap = new Map<string, number>();
    (progressRes.data || []).forEach((p: any) => {
      if (p.completed && foundationLessonIds.has(p.lesson_id)) {
        foundationMap.set(p.student_id, (foundationMap.get(p.student_id) || 0) + 1);
      }
    });

    // Game stats per student
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
      return {
        id: p.user_id,
        full_name: p.full_name || "—",
        email: p.email || "—",
        total_lessons: statsMap.get(p.user_id)?.total || 0,
        completed_lessons: statsMap.get(p.user_id)?.completed || 0,
        next_lesson: statsMap.get(p.user_id)?.nextLesson,
        foundationPct: totalFoundationLessons > 0
          ? Math.round((completedFoundationLessons / totalFoundationLessons) * 100)
          : 0,
        completedFoundationLessons,
        totalFoundationLessons,
        gameSessions: gameStats.reduce((s, g) => s + g.sessions, 0),
        gameStats,
      };
    }));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  useEffect(() => {
    if (!user || students.length === 0) return;
    const fetchNotes = async () => {
      const { data } = await (supabase as any)
        .from("teacher_notes")
        .select("student_id, note_text")
        .eq("teacher_id", user.id);
      const map: Record<string, string> = {};
      (data || []).forEach((n: any) => { map[n.student_id] = n.note_text; });
      setNotes(map);
    };
    fetchNotes();
  }, [user, students]);

  const saveNote = async (studentId: string) => {
    if (!user) return;
    setSavingNote(studentId);
    const text = notes[studentId] || "";
    await (supabase as any).from("teacher_notes").upsert(
      { teacher_id: user.id, student_id: studentId, note_text: text, updated_at: new Date().toISOString() },
      { onConflict: "teacher_id,student_id" }
    );
    setSavingNote(null);
    toast({ title: "Note saved", description: "Student can now see this note in their dashboard." });
  };

  const handleAddStudent = async () => {
    if (!newStudent.email || !newStudent.full_name) {
      toast({ title: "Missing fields", description: "Email and full name are required.", variant: "destructive" });
      return;
    }
    setIsAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("teacher-add-student", { body: newStudent });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Student added", description: `${newStudent.full_name} has been added to your roster.` });
      setNewStudent({ email: "", full_name: "", password: "" });
      setIsAddOpen(false);
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    if (!isBuyOpen) return;
    paypalRendered.current = false;
    setPaypalReady(false);
    setBuyError("");

    const scriptId = "paypal-orders-sdk";
    const render = () => {
      if (!(window as any).paypal || paypalRendered.current) return;
      const container = document.getElementById("paypal-seat-btn");
      if (!container) return;
      paypalRendered.current = true;
      container.innerHTML = "";

      (window as any).paypal.Buttons({
        style: { shape: "pill", color: "gold", layout: "vertical" },
        createOrder: (_: any, actions: any) =>
          actions.order.create({
            purchase_units: [{
              amount: { value: (extraSeats * SEAT_PRICE).toFixed(2), currency_code: "USD" },
              description: `${extraSeats} extra student seat${extraSeats > 1 ? "s" : ""}`,
            }],
          }),
        onApprove: async (_: any, actions: any) => {
          setBuyProcessing(true);
          try {
            await actions.order.capture();
            const { error } = await (supabase as any).rpc("teacher_add_seats", {
              p_teacher_id: user!.id,
              p_seats: extraSeats,
            });
            if (error) throw error;
            toast({ title: "Seats added!", description: `${extraSeats} new student seat${extraSeats > 1 ? "s" : ""} added.` });
            setIsBuyOpen(false);
            fetchData();
          } catch (e: any) {
            setBuyError("Payment succeeded but seat update failed. Contact support.");
          } finally {
            setBuyProcessing(false);
          }
        },
        onError: (e: any) => {
          console.error("[paypal-seats]", e);
          setBuyError("Payment failed. Please try again.");
          paypalRendered.current = false;
        },
      }).render("#paypal-seat-btn");
      setPaypalReady(true);
    };

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) { render(); return; }
    const s = document.createElement("script");
    s.id = scriptId; s.src = PAYPAL_ORDERS_SDK_URL; s.async = true;
    s.onload = render;
    document.body.appendChild(s);
  }, [isBuyOpen, extraSeats]);

  const usedPct = seatInfo ? (seatInfo.used_seats / Math.max(seatInfo.total_seats, 1)) * 100 : 0;
  const atLimit = seatInfo ? seatInfo.available_seats <= 0 : false;

  return (
    <div className="space-y-6">
      {seatInfo && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-primary" /> Student Seats
              </CardTitle>
              <Dialog open={isBuyOpen} onOpenChange={setIsBuyOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    <ShoppingCart className="w-4 h-4" /> Buy More Seats
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle>Buy Additional Seats</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <p className="text-sm text-muted-foreground">Each extra seat lets you onboard one more student. <strong>${SEAT_PRICE}/seat</strong> — one-time payment.</p>
                    <div className="flex items-center gap-3 justify-center">
                      <Button size="icon" variant="outline" onClick={() => setExtraSeats(s => Math.max(1, s - 1))} disabled={extraSeats <= 1}><Minus className="w-4 h-4" /></Button>
                      <span className="text-2xl font-bold w-12 text-center">{extraSeats}</span>
                      <Button size="icon" variant="outline" onClick={() => setExtraSeats(s => Math.min(50, s + 1))}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <p className="text-center text-sm font-semibold">Total: <span className="text-primary">${(extraSeats * SEAT_PRICE).toFixed(2)}</span></p>
                    <div id="paypal-seat-btn" className="min-h-[80px]">
                      {!paypalReady && !buyProcessing && <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
                    </div>
                    {buyError && <p className="text-red-500 text-sm text-center">{buyError}</p>}
                    {buyProcessing && <div className="flex items-center justify-center gap-2 text-primary"><Loader2 className="w-4 h-4 animate-spin" /> Processing…</div>}
                    {IS_SANDBOX && <p className="text-xs text-center text-muted-foreground">🧪 Sandbox — test mode</p>}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">{seatInfo.used_seats} of {seatInfo.total_seats} seats used</span>
              <span className={atLimit ? "text-red-400 font-semibold" : "text-muted-foreground"}>{seatInfo.available_seats} available</span>
            </div>
            <Progress value={usedPct} className="h-2" />
            {atLimit && <p className="text-xs text-red-400 mt-2">Seat limit reached — buy more seats to add students.</p>}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-xl font-semibold">My Students</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary gap-1" disabled={atLimit}>
              <UserPlus className="w-4 h-4" />
              {atLimit ? "Seats Full" : "Add Student"}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Add Student to Roster</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-xs text-muted-foreground">Enter an existing student email to link them, or fill in all fields to create a new account.</p>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={newStudent.full_name} onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })} placeholder="Jane Smith" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })} placeholder="jane@example.com" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Password <span className="text-muted-foreground text-xs">(only for new accounts)</span></Label>
                <Input type="password" value={newStudent.password} onChange={e => setNewStudent({ ...newStudent, password: e.target.value })} placeholder="Leave blank if student already has an account" className="bg-secondary border-border" />
              </div>
              <Button onClick={handleAddStudent} disabled={isAdding} className="w-full btn-primary">
                {isAdding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding…</> : "Add Student"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Student Roster</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : students.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No students yet. Click "Add Student" to onboard your first student.</p>
          ) : (
            <div className="space-y-2">
              {students.map((s) => (
                <div key={s.id} className="rounded-xl border border-border overflow-hidden">
                  {/* Row */}
                  <div
                    className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-x-4 gap-y-1 items-center min-w-0">
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
                        <p className="text-xs text-muted-foreground">Game Sessions</p>
                        <p className="font-bold">{s.gameSessions}</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-xs text-muted-foreground">Next Lesson</p>
                        <p className="text-xs font-medium whitespace-nowrap">
                          {s.next_lesson
                            ? new Date(s.next_lesson).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "None scheduled"}
                        </p>
                      </div>
                    </div>
                    {expandedId === s.id
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>

                  {/* Expanded stats */}
                  {expandedId === s.id && (
                    <>
                    <div className="border-t border-border bg-black/20 px-4 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Foundation */}
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

                      {/* Lessons */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Lessons
                        </p>
                        <div className="flex justify-between text-sm"><span>Completed</span><Badge className="bg-green-500/20 text-green-400 border-green-500/30">{s.completed_lessons}</Badge></div>
                        <div className="flex justify-between text-sm"><span>Total booked</span><span className="font-bold">{s.total_lessons}</span></div>
                        <div className="flex justify-between text-sm">
                          <span>Next lesson</span>
                          <span className="text-xs">
                            {s.next_lesson
                              ? new Date(s.next_lesson).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                              : "None"}
                          </span>
                        </div>
                      </div>

                      {/* Games */}
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
                      </div>
                    </div>
                    {/* Teacher's Note */}
                    <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(255,45,120,0.06)", border: "1px solid rgba(255,45,120,0.2)" }}>
                      <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ fontFamily: "'DM Mono',monospace", color: "#FF2D78" }}>
                        ✦ Teacher's Note
                      </p>
                      <textarea
                        rows={3}
                        className="w-full text-xs rounded-lg p-2 resize-none bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        placeholder="Write what this student needs to work on…"
                        value={notes[s.id] || ""}
                        onChange={e => setNotes(prev => ({ ...prev, [s.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        className="mt-2 w-full text-xs h-7 text-white border-0"
                        style={{ background: "linear-gradient(135deg,#FF2D78,#A855F7)" }}
                        onClick={() => saveNote(s.id)}
                        disabled={savingNote === s.id}
                      >
                        {savingNote === s.id ? "Saving…" : "Save Note"}
                      </Button>
                    </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyStudents;
