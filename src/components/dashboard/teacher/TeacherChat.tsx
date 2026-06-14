import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatWindow } from "../shared/ChatWindow";
import { Users, MessageSquare, Loader2, ArrowLeft } from "lucide-react";

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  unreadCount: number;
}

const TeacherChat = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [selected, setSelected] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStudents = async () => {
      const { data: roster } = await (supabase as any)
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", user.id);

      const ids: string[] = (roster || []).map((r: any) => r.student_id);
      if (ids.length === 0) { setLoading(false); return; }

      const [profilesRes, unreadRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids),
        (supabase as any)
          .from("chat_messages")
          .select("student_id")
          .eq("teacher_id", user.id)
          .neq("sender_id", user.id)
          .is("read_at", null)
          .in("student_id", ids),
      ]);

      const unreadMap: Record<string, number> = {};
      for (const m of unreadRes.data || []) {
        unreadMap[m.student_id] = (unreadMap[m.student_id] || 0) + 1;
      }

      setStudents(
        (profilesRes.data || []).map((p: any) => ({
          id: p.user_id,
          name: p.full_name || p.email,
          email: p.email,
          unreadCount: unreadMap[p.user_id] || 0,
        }))
      );
      setLoading(false);
    };

    fetchStudents();
  }, [user]);

  // Real-time: update unread badge when new messages arrive for unselected students
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("teacher-chat-list")
      .on("postgres_changes" as any, {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `teacher_id=eq.${user.id}`,
      }, (payload: any) => {
        const msg = payload.new;
        if (msg.sender_id === user.id) return;
        if (selected?.id === msg.student_id) return;
        setStudents((prev) =>
          prev.map((s) =>
            s.id === msg.student_id ? { ...s, unreadCount: s.unreadCount + 1 } : s
          )
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selected?.id]);

  const handleSelect = (student: StudentInfo) => {
    setSelected(student);
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, unreadCount: 0 } : s))
    );
  };

  if (!user) return null;

  const totalUnread = students.reduce((n, s) => n + s.unreadCount, 0);

  return (
    <div className="flex h-[calc(100vh-150px)] rounded-xl border border-border overflow-hidden bg-card">
      {/* Sidebar */}
      <div className={`w-72 border-r border-border flex flex-col shrink-0 ${selected ? "hidden md:flex" : "flex"}`}>
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Students</span>
          {totalUnread > 0 && (
            <span className="ml-auto w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
              {totalUnread}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <p className="text-sm text-muted-foreground">No students assigned yet</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => handleSelect(student)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors border-b border-border/40 ${
                  selected?.id === student.id ? "bg-secondary" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {student.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{student.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                </div>
                {student.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shrink-0">
                    {student.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat panel */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selected ? "hidden md:flex" : "flex"}`}>
        {selected ? (
          <>
            <div className="md:hidden px-4 py-2 border-b border-border shrink-0">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>
            <ChatWindow
              teacherId={user.id}
              studentId={selected.id}
              currentUserId={user.id}
              recipientName={selected.name}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Select a student to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherChat;
