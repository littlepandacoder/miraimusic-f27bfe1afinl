import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio } from "lucide-react";

interface Student {
  id: string;
  name: string;
  email: string;
}

interface LiveInfo {
  song: string | null;
  since: number;
}

// Students who have their practice page open right now, with the piece they are on.
const LiveStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [live, setLive] = useState<Record<string, LiveInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: links } = await (supabase as any)
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", user.id);
      const ids: string[] = (links || []).map((r: any) => r.student_id);
      if (ids.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids);
      setStudents((profiles || []).map((p: any) => ({ id: p.user_id, name: p.full_name || "—", email: p.email || "" })));
      setLoading(false);
    })();
  }, [user?.id]);

  // Live presence on each student's room (the teacher only listens, it does not track).
  const idsKey = students.map((s) => s.id).join(",");
  useEffect(() => {
    if (!idsKey) return;
    const channels = idsKey.split(",").map((studentId) => {
      const channel: any = (supabase as any)
        .channel(`room:${studentId}`, { config: { private: true } })
        .on("presence", { event: "sync" }, () => {
          const metas = channel.presenceState()[studentId];
          setLive((prev) => {
            const next = { ...prev };
            if (metas && metas.length) next[studentId] = { song: metas[0].song ?? null, since: metas[0].at ?? Date.now() };
            else delete next[studentId];
            return next;
          });
        })
        .subscribe();
      return channel;
    });
    return () => {
      channels.forEach((c: any) => (supabase as any).removeChannel(c));
    };
  }, [idsKey]);

  const onlineStudents = students.filter((s) => live[s.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Students</h1>
        <p className="text-sm text-muted-foreground">
          Students who have their sheet music open right now. Enter a room to follow along and play together.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            Online now ({onlineStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : onlineStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students are online right now.</p>
          ) : (
            <ul className="divide-y divide-border">
              {onlineStudents.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                    <p className="text-sm">
                      {live[s.id].song ? `Playing: ${live[s.id].song}` : "On the sheet music page"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Online since {new Date(live[s.id].since).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      window.location.href = `/sheet-music-practice/index.html?room=${s.id}`;
                    }}
                  >
                    Enter room
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveStudents;
