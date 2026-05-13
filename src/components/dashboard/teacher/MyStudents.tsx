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
import { UserPlus, Loader2, Users, ShoppingCart, Minus, Plus } from "lucide-react";
import { PAYPAL_ORDERS_SDK_URL, IS_SANDBOX } from "@/lib/paypal";

interface Student {
  id: string;
  full_name: string;
  email: string;
  total_lessons: number;
  completed_lessons: number;
  next_lesson?: string;
}

interface SeatInfo { total_seats: number; used_seats: number; available_seats: number; }

const SEAT_PRICE = 1; // $1 per extra seat

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

    const [profilesRes, lessonsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email").in("user_id", rosterIds),
      supabase.from("lessons").select("student_id, status, scheduled_date, scheduled_time")
        .eq("teacher_id", user.id).in("student_id", rosterIds),
    ]);

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

    setStudents((profilesRes.data || []).map((p: any) => ({
      id: p.user_id,
      full_name: p.full_name || "—",
      email: p.email || "—",
      total_lessons: statsMap.get(p.user_id)?.total || 0,
      completed_lessons: statsMap.get(p.user_id)?.completed || 0,
      next_lesson: statsMap.get(p.user_id)?.nextLesson,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleAddStudent = async () => {
    if (!newStudent.email || !newStudent.full_name) {
      toast({ title: "Missing fields", description: "Email and full name are required.", variant: "destructive" });
      return;
    }
    setIsAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("teacher-add-student", {
        body: newStudent,
      });
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

  // Load PayPal Orders SDK when buy dialog opens
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

      {/* Seat counter */}
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
                  <DialogHeader>
                    <DialogTitle>Buy Additional Seats</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <p className="text-sm text-muted-foreground">
                      Each extra seat lets you onboard one more student. <strong>${SEAT_PRICE}/seat</strong> — one-time payment.
                    </p>
                    <div className="flex items-center gap-3 justify-center">
                      <Button size="icon" variant="outline" onClick={() => setExtraSeats(s => Math.max(1, s - 1))} disabled={extraSeats <= 1}>
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-2xl font-bold w-12 text-center">{extraSeats}</span>
                      <Button size="icon" variant="outline" onClick={() => setExtraSeats(s => Math.min(50, s + 1))}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-center text-sm font-semibold">
                      Total: <span className="text-primary">${(extraSeats * SEAT_PRICE).toFixed(2)}</span>
                    </p>
                    <div id="paypal-seat-btn" className="min-h-[80px]">
                      {!paypalReady && !buyProcessing && (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    {buyError && <p className="text-red-500 text-sm text-center">{buyError}</p>}
                    {buyProcessing && (
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                      </div>
                    )}
                    {IS_SANDBOX && <p className="text-xs text-center text-muted-foreground">🧪 Sandbox — test mode</p>}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">{seatInfo.used_seats} of {seatInfo.total_seats} seats used</span>
              <span className={atLimit ? "text-red-400 font-semibold" : "text-muted-foreground"}>
                {seatInfo.available_seats} available
              </span>
            </div>
            <Progress value={usedPct} className="h-2" />
            {atLimit && (
              <p className="text-xs text-red-400 mt-2">Seat limit reached — buy more seats to add students.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student list */}
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
            <DialogHeader>
              <DialogTitle>Add Student to Roster</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-xs text-muted-foreground">
                Enter an existing student email to link them, or fill in all fields to create a new account.
              </p>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={newStudent.full_name} onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  placeholder="Jane Smith" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="jane@example.com" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Password <span className="text-muted-foreground text-xs">(only for new accounts)</span></Label>
                <Input type="password" value={newStudent.password} onChange={e => setNewStudent({ ...newStudent, password: e.target.value })}
                  placeholder="Leave blank if student already has an account" className="bg-secondary border-border" />
              </div>
              <Button onClick={handleAddStudent} disabled={isAdding} className="w-full btn-primary">
                {isAdding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding…</> : "Add Student"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Student Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : students.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No students yet. Click "Add Student" to onboard your first student.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <div className="min-w-[560px] px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Done</TableHead>
                      <TableHead>Next Lesson</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow key={s.id} className="border-border">
                        <TableCell className="font-medium">{s.full_name}</TableCell>
                        <TableCell className="max-w-[140px] truncate">{s.email}</TableCell>
                        <TableCell>{s.total_lessons}</TableCell>
                        <TableCell>
                          <Badge className="bg-lime/20 text-lime border-lime/50">{s.completed_lessons}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {s.next_lesson
                            ? new Date(s.next_lesson).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "No upcoming"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyStudents;
