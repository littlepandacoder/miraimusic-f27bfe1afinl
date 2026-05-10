import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, Check, Star, Music, Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoundationModule {
  id: string;
  title: string;
  description: string | null;
  level: string;
  xp_reward: number;
  sort_order: number;
  is_published: boolean;
  // computed
  totalLessons: number;
  completedLessons: number;
  status: "locked" | "available" | "in-progress" | "completed";
}

const ModuleMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modules, setModules] = useState<FoundationModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch published modules ordered by sort_order
      const { data: rawModules } = await (supabase as any)
        .from("foundation_modules")
        .select("id, title, description, level, xp_reward, sort_order")
        .eq("is_published", true)
        .order("sort_order");

      if (!rawModules || rawModules.length === 0) {
        setModules([]);
        setLoading(false);
        return;
      }

      // Fetch all lessons for these modules (just need module_id to count)
      const moduleIds = rawModules.map((m: any) => m.id);
      const { data: lessons } = await (supabase as any)
        .from("foundation_lessons")
        .select("id, module_id")
        .in("module_id", moduleIds);

      // Fetch student lesson progress
      const { data: progress } = await (supabase as any)
        .from("student_lesson_progress")
        .select("lesson_id, completed")
        .eq("student_id", user.id);

      const completedSet = new Set<string>(
        (progress || []).filter((p: any) => p.completed).map((p: any) => p.lesson_id)
      );

      // Count lessons per module
      const lessonsByModule: Record<string, string[]> = {};
      (lessons || []).forEach((l: any) => {
        if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
        lessonsByModule[l.module_id].push(l.id);
      });

      // Compute status sequentially (each module unlocks when previous is completed)
      let prevCompleted = true; // first module is always available
      const mapped: FoundationModule[] = rawModules.map((m: any) => {
        const total = (lessonsByModule[m.id] || []).length;
        const completed = (lessonsByModule[m.id] || []).filter((id: string) => completedSet.has(id)).length;

        let status: FoundationModule["status"];
        if (total > 0 && completed === total) {
          status = "completed";
        } else if (completed > 0) {
          status = "in-progress";
        } else if (prevCompleted) {
          status = "available";
        } else {
          status = "locked";
        }

        prevCompleted = status === "completed";

        return { ...m, totalLessons: total, completedLessons: completed, status };
      });

      setModules(mapped);
      setTotalXP(mapped.filter(m => m.status === "completed").reduce((s, m) => s + m.xp_reward, 0));
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "intermediate": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "advanced": return "bg-red-500/20 text-red-400 border-red-500/50";
      default: return "bg-green-500/20 text-green-400 border-green-500/50";
    }
  };

  const getStatusStyles = (status: FoundationModule["status"]) => {
    switch (status) {
      case "completed": return "bg-green-500/20 border-green-500 text-green-400";
      case "in-progress": return "bg-primary/20 border-primary text-primary";
      case "available": return "bg-cyan-500/20 border-cyan-500 text-cyan-400 hover:scale-[1.02] cursor-pointer";
      case "locked": return "bg-muted/50 border-border text-muted-foreground opacity-60";
    }
  };

  const getConnectorStyle = (idx: number) => {
    if (idx === 0) return "";
    const prev = modules[idx - 1];
    if (prev?.status === "completed") return "bg-green-500";
    if (prev?.status === "in-progress") return "bg-primary/40";
    return "bg-border";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Foundation Journey</h2>
          <p className="text-muted-foreground">Master the fundamentals of piano</p>
        </div>
        {totalXP > 0 && (
          <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-xs text-muted-foreground">Total XP</p>
                <p className="text-xl font-bold text-yellow-400">{totalXP}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {modules.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center text-muted-foreground space-y-2">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">No modules available yet.</p>
            <p className="text-sm">Check back soon — your instructor will add lessons here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center space-y-0">
          {modules.map((module, index) => (
            <div key={module.id} className="w-full max-w-2xl">
              {index > 0 && (
                <div className="flex justify-center">
                  <div className={cn("w-1 h-8 rounded-full", getConnectorStyle(index))} />
                </div>
              )}

              <div
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200",
                  getStatusStyles(module.status),
                  index % 2 === 0 ? "ml-0 mr-auto md:max-w-md w-full" : "ml-auto mr-0 md:max-w-md w-full"
                )}
                onClick={() => module.status !== "locked" && navigate(`/dashboard/foundation/lesson-plan/${module.id}`)}
              >
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center border-2 shrink-0",
                  module.status === "completed" ? "bg-green-500/30 border-green-500" :
                  module.status === "in-progress" ? "bg-primary/30 border-primary" :
                  module.status === "available" ? "bg-cyan-500/30 border-cyan-500" :
                  "bg-muted border-border"
                )}>
                  {module.status === "completed" ? (
                    <Check className="w-7 h-7 text-green-400" />
                  ) : module.status === "locked" ? (
                    <Lock className="w-6 h-6" />
                  ) : (
                    <Music className="w-7 h-7" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{module.title}</h3>
                    <Badge className={cn("text-xs", getLevelColor(module.level))}>
                      {module.level}
                    </Badge>
                  </div>
                  {module.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{module.description}</p>
                  )}

                  {(module.status === "in-progress" || module.status === "completed") && module.totalLessons > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{module.completedLessons}/{module.totalLessons} lessons</span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          {module.xp_reward} XP
                        </span>
                      </div>
                      <Progress value={(module.completedLessons / module.totalLessons) * 100} className="h-2" />
                    </div>
                  )}

                  {module.status === "available" && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {module.totalLessons > 0 && <span>{module.totalLessons} lessons</span>}
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        {module.xp_reward} XP
                      </span>
                    </div>
                  )}
                </div>

                {module.status !== "locked" && (
                  <Button
                    size="sm"
                    variant={module.status === "completed" ? "outline" : "default"}
                    className="shrink-0"
                    onClick={e => { e.stopPropagation(); navigate(`/dashboard/foundation/lesson-plan/${module.id}`); }}
                  >
                    {module.status === "completed" ? "Review" : module.status === "in-progress" ? "Continue" : "Start"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModuleMap;
