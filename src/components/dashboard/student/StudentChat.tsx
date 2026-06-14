import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatWindow } from "../shared/ChatWindow";
import { MessageSquare, Loader2 } from "lucide-react";

const StudentChat = () => {
  const { user } = useAuth();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("Your Teacher");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchTeacher = async () => {
      const { data } = await (supabase as any)
        .from("teacher_students")
        .select("teacher_id")
        .eq("student_id", user.id)
        .limit(1)
        .maybeSingle();

      if (data?.teacher_id) {
        setTeacherId(data.teacher_id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", data.teacher_id)
          .maybeSingle();
        if (profile) {
          setTeacherName((profile as any).full_name || (profile as any).email || "Your Teacher");
        }
      }

      setLoading(false);
    };

    fetchTeacher();
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!teacherId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground/30" />
        <p className="font-medium">No teacher assigned yet</p>
        <p className="text-sm text-muted-foreground">Once you're assigned a teacher, you can chat with them here.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-150px)] rounded-xl border border-border overflow-hidden bg-card">
      <ChatWindow
        teacherId={teacherId}
        studentId={user.id}
        currentUserId={user.id}
        recipientName={teacherName}
      />
    </div>
  );
};

export default StudentChat;
