import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Loader2, UserCheck, UserX } from "lucide-react";

interface Person { id: string; full_name: string; email: string; }

const ManageAssignments = () => {
  const { toast } = useToast();
  const [students, setStudents]     = useState<Person[]>([]);
  const [teachers, setTeachers]     = useState<Person[]>([]);
  // studentId → teacherId (null = unassigned)
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});
  const [saving, setSaving]         = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterTeacher, setFilterTeacher] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      const [rolesRes, profilesRes, assignRes] = await Promise.all([
        (supabase as any).rpc("admin_get_all_user_roles"),
        supabase.from("profiles").select("user_id, full_name, email"),
        (supabase as any).from("teacher_students").select("teacher_id, student_id"),
      ]);

      const roles: any[] = rolesRes.data || [];
      const profiles: any[] = profilesRes.data || [];
      const assigns: any[] = assignRes.data || [];

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

      const studentIds = new Set(roles.filter((r: any) => r.role === "student").map((r: any) => r.user_id));
      const teacherIds = new Set(roles.filter((r: any) => r.role === "teacher").map((r: any) => r.user_id));

      const studentList: Person[] = [...studentIds].map((id) => {
        const p = profileMap.get(id);
        return { id, full_name: p?.full_name || "—", email: p?.email || "—" };
      }).sort((a, b) => a.full_name.localeCompare(b.full_name));

      const teacherList: Person[] = [...teacherIds].map((id) => {
        const p = profileMap.get(id);
        return { id, full_name: p?.full_name || "—", email: p?.email || "—" };
      }).sort((a, b) => a.full_name.localeCompare(b.full_name));

      const map: Record<string, string | null> = {};
      studentList.forEach((s) => { map[s.id] = null; });
      assigns.forEach((a: any) => { if (map.hasOwnProperty(a.student_id)) map[a.student_id] = a.teacher_id; });

      setStudents(studentList);
      setTeachers(teacherList);
      setAssignments(map);
      setLoading(false);
    };
    load();
  }, []);

  const assign = async (studentId: string, teacherId: string | null) => {
    setSaving(studentId);
    const prev = assignments[studentId];

    try {
      // Remove existing assignment first
      if (prev) {
        await (supabase as any).from("teacher_students")
          .delete()
          .eq("student_id", studentId)
          .eq("teacher_id", prev);
      }

      if (teacherId) {
        const { error } = await (supabase as any).from("teacher_students").insert({
          teacher_id: teacherId,
          student_id: studentId,
        });
        if (error) throw error;
      }

      setAssignments((prev) => ({ ...prev, [studentId]: teacherId }));
      const teacherName = teachers.find((t) => t.id === teacherId)?.full_name;
      const studentName = students.find((s) => s.id === studentId)?.full_name;
      toast({
        title: teacherId ? "Assigned" : "Unassigned",
        description: teacherId
          ? `${studentName} → ${teacherName}`
          : `${studentName} removed from teacher`,
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update assignment", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        !search ||
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());
      const matchTeacher =
        filterTeacher === "all" ||
        (filterTeacher === "unassigned" && !assignments[s.id]) ||
        assignments[s.id] === filterTeacher;
      return matchSearch && matchTeacher;
    });
  }, [students, search, filterTeacher, assignments]);

  const unassignedCount = students.filter((s) => !assignments[s.id]).length;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Teacher–Student Assignments
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Assign each student to a teacher. Changes save immediately.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary chips */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <UserCheck className="w-3 h-3 text-green-400" />
              {students.length - unassignedCount} assigned
            </Badge>
            <Badge variant="outline" className="gap-1">
              <UserX className="w-3 h-3 text-red-400" />
              {unassignedCount} unassigned
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Users className="w-3 h-3 text-primary" />
              {teachers.length} teachers
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-secondary border-border"
                placeholder="Search students…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
            >
              <option value="all">All students</option>
              <option value="unassigned">Unassigned only</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No students match this filter.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_1fr_180px] gap-3 px-4 py-2 bg-secondary text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <span>Student</span>
                <span>Email</span>
                <span>Assigned Teacher</span>
              </div>

              {filtered.map((student, i) => {
                const currentTeacherId = assignments[student.id];
                const isSaving = saving === student.id;
                return (
                  <div
                    key={student.id}
                    className={`grid grid-cols-[1fr_1fr_180px] gap-3 px-4 py-3 items-center text-sm transition-colors ${
                      i % 2 === 0 ? "bg-background" : "bg-card"
                    } hover:bg-secondary/40`}
                  >
                    <div className="font-medium truncate">{student.full_name}</div>
                    <div className="text-muted-foreground truncate text-xs">{student.email}</div>
                    <div className="flex items-center gap-2">
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <select
                          className="w-full h-8 rounded-md border border-border bg-secondary px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          value={currentTeacherId || ""}
                          onChange={(e) => assign(student.id, e.target.value || null)}
                          disabled={isSaving}
                        >
                          <option value="">— Unassigned —</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>{t.full_name}</option>
                          ))}
                        </select>
                      )}
                      {currentTeacherId && !isSaving && (
                        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Assigned" />
                      )}
                      {!currentTeacherId && !isSaving && (
                        <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" title="Unassigned" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageAssignments;
