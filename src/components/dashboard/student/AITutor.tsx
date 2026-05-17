import { useState, useCallback, useRef, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const AGENT_ID = "agent_7401krc6fjd4e1hvvce2m7mn0ss0";

interface GameSummary {
  sessions: number;
  bestAccuracy: number | null;
  avgAccuracy: number | null;
  bestStreak: number;
}

interface StudentStats {
  name: string;
  foundationCompleted: number;
  foundationTotal: number;
  foundationPct: number;
  quizAvg: number | null;
  games: Record<string, GameSummary>;
}

interface AITutorProps {
  lessonContext?: {
    title: string;
    description: string | null;
  };
}

function buildSystemPrompt(stats: StudentStats): string {
  const { name, foundationCompleted, foundationTotal, foundationPct, quizAvg, games } = stats;

  const gameLines = (["note_naming", "sight_reading", "piano_hero", "rhythm_quiz"] as const)
    .map((g) => {
      const labels: Record<string, string> = {
        note_naming: "Note Naming",
        sight_reading: "Sight Reading",
        piano_hero: "Piano Hero",
        rhythm_quiz: "Rhythm Quiz",
      };
      const gs = games[g];
      if (!gs || gs.sessions === 0) return `  - ${labels[g]}: no sessions yet`;
      return (
        `  - ${labels[g]}: ${gs.sessions} session${gs.sessions !== 1 ? "s" : ""}` +
        (gs.bestAccuracy !== null ? `, best accuracy ${gs.bestAccuracy}%` : "") +
        (gs.avgAccuracy !== null ? `, avg ${gs.avgAccuracy}%` : "") +
        (gs.bestStreak > 0 ? `, best streak ${gs.bestStreak}` : "")
      );
    })
    .join("\n");

  const weakGames = (["note_naming", "sight_reading", "piano_hero", "rhythm_quiz"] as const).filter(
    (g) => games[g] && games[g].sessions > 0 && (games[g].avgAccuracy ?? 100) < 70
  );

  const weakAreas =
    weakGames.length > 0
      ? `The student is struggling with: ${weakGames.map((g) => g.replace("_", " ")).join(", ")}. Focus encouragement and teaching here.`
      : "The student is performing well across all games so far.";

  return `You are an encouraging, knowledgeable AI music tutor on the Musicable platform — a Trinity Piano exam preparation app. You help students learn music theory, practice techniques, note reading, rhythm, and piano skills.

Always be warm, patient, and specific. Keep answers concise (2–4 sentences unless a detailed explanation is requested). Relate everything back to Trinity Piano exam skills when relevant.

== Student Profile ==
Name: ${name || "the student"}
Foundation Modules: ${foundationCompleted} of ${foundationTotal} completed (${Math.round(foundationPct)}%)
Average Quiz Score: ${quizAvg !== null ? quizAvg + "%" : "no quizzes taken yet"}

Game Performance:
${gameLines}

== Teaching Guidance ==
${weakAreas}
${foundationPct < 50 ? "The student has not yet completed most foundation modules — prioritise fundamental concepts like note names, staff reading, and basic rhythm." : foundationPct < 100 ? "The student is making good foundation progress — reinforce concepts from incomplete modules." : "The student has completed all foundation modules — focus on exam technique and performance polish."}

Always address the student by name (${name || "the student"}) when appropriate. Celebrate progress and guide them gently on weak areas.`;
}

const AITutor = ({ lessonContext }: AITutorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userEndedRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const name =
        (user as any).user_metadata?.full_name ||
        (user as any).user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Student";

      const [modulesRes, progressRes, quizRes, gameRes] = await Promise.all([
        (supabase as any).from("foundation_modules").select("id"),
        (supabase as any).from("student_lesson_progress").select("lesson_id, completed").eq("student_id", user.id),
        (supabase as any).from("quiz_attempts").select("score, total").eq("user_id", user.id),
        (supabase as any)
          .from("game_scores")
          .select("game, score, correct, total, best_streak")
          .eq("user_id", user.id),
      ]);

      // Foundation progress
      const totalModules = (modulesRes.data || []).length;
      const completedLessonIds = new Set<string>(
        (progressRes.data || []).filter((p: any) => p.completed).map((p: any) => p.lesson_id)
      );
      // Approximate: count distinct lesson IDs completed as a proxy for module completion
      // (full module completion logic requires joining lessons — use lesson count ratio as fallback)
      const completedModules = Math.min(totalModules, completedLessonIds.size > 0 ? Math.floor(completedLessonIds.size / 3) : 0);
      const foundationPct = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

      // Quiz avg
      const attempts: any[] = quizRes.data || [];
      const quizAvg =
        attempts.length > 0
          ? Math.round(
              attempts.reduce((s: number, a: any) => s + (a.total > 0 ? (a.score / a.total) * 100 : 0), 0) /
                attempts.length
            )
          : null;

      // Game scores
      const rows: any[] = gameRes.data || [];
      const games: Record<string, GameSummary> = {};
      for (const g of ["note_naming", "sight_reading", "piano_hero", "rhythm_quiz"]) {
        const sessions = rows.filter((r) => r.game === g);
        if (sessions.length === 0) { games[g] = { sessions: 0, bestAccuracy: null, avgAccuracy: null, bestStreak: 0 }; continue; }
        const accs = sessions.filter((r) => r.total > 0).map((r) => Math.round((r.correct / r.total) * 100));
        games[g] = {
          sessions: sessions.length,
          bestAccuracy: accs.length > 0 ? Math.max(...accs) : null,
          avgAccuracy: accs.length > 0 ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null,
          bestStreak: Math.max(...sessions.map((r) => r.best_streak || 0)),
        };
      }

      setStudentStats({ name, foundationCompleted: completedModules, foundationTotal: totalModules, foundationPct, quizAvg, games });
    };

    fetchStats().catch(console.error);
  }, [user]);

  const stopMicStream = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
  }, []);

  const doStart = useCallback(
    async (conv: ReturnType<typeof useConversation>) => {
      stopMicStream(); // stop any previous stream before requesting a new one
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const sessionConfig: any = { agentId: AGENT_ID };
      if (studentStats) {
        sessionConfig.overrides = {
          agent: {
            prompt: { prompt: buildSystemPrompt(studentStats) },
          },
        };
      }
      await conv.startSession(sessionConfig);
    },
    [studentStats, stopMicStream]
  );

  const conversation = useConversation({
    onConnect: () => {
      setIsConnecting(false);
      toast({ title: "Connected!", description: "You can now speak with your AI music tutor." });
    },
    onDisconnect: () => {
      stopMicStream(); // kill the audio worklet source so it stops posting to the closed WebSocket
      if (!userEndedRef.current) return;
      userEndedRef.current = false;
      toast({ title: "Disconnected", description: "Your session with the AI tutor has ended." });
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      const msg = error instanceof Error ? error.message : String(error);
      if (!userEndedRef.current && (msg.includes("negotiation") || msg.includes("rtc") || msg.includes("404"))) {
        console.warn("Transient connection error, retrying in 2 s…", msg);
        retryTimeout.current = setTimeout(() => {
          doStart(conversation).catch(console.error);
        }, 2000);
        return;
      }
      stopMicStream();
      setIsConnecting(false);
      toast({
        title: "Connection Error",
        description: "Failed to connect to AI tutor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startConversation = useCallback(async () => {
    userEndedRef.current = false;
    if (retryTimeout.current) clearTimeout(retryTimeout.current);
    setIsConnecting(true);
    try {
      await doStart(conversation);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setIsConnecting(false);
      toast({
        title: "Failed to start",
        description: error instanceof Error ? error.message : "Could not start AI tutor session.",
        variant: "destructive",
      });
    }
  }, [conversation, doStart, toast]);

  const stopConversation = useCallback(async () => {
    userEndedRef.current = true;
    if (retryTimeout.current) clearTimeout(retryTimeout.current);
    stopMicStream(); // stop audio worklet source BEFORE closing WebSocket to prevent stale sends
    await conversation.endSession();
  }, [conversation, stopMicStream]);

  const toggleMute = useCallback(async () => {
    if (isMuted) {
      await conversation.setVolume({ volume: 1 });
    } else {
      await conversation.setVolume({ volume: 0 });
    }
    setIsMuted(!isMuted);
  }, [conversation, isMuted]);

  const isConnected = conversation.status === "connected";

  const statsReady = studentStats !== null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          Ask Tutor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {lessonContext && (
          <div className="bg-secondary/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Current Lesson:</p>
            <p className="font-medium">{lessonContext.title}</p>
            {lessonContext.description && (
              <p className="text-sm text-muted-foreground mt-1">{lessonContext.description}</p>
            )}
          </div>
        )}

        {statsReady && studentStats && (
          <div className="bg-secondary/30 rounded-lg p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Profile (tutor has this context)</p>
            <div className="flex flex-wrap gap-3">
              <span className="text-foreground">
                Foundation: <span className="font-semibold text-primary">{Math.round(studentStats.foundationPct)}%</span>
              </span>
              {studentStats.quizAvg !== null && (
                <span className="text-foreground">
                  Quiz Avg: <span className="font-semibold text-yellow-400">{studentStats.quizAvg}%</span>
                </span>
              )}
              {Object.entries(studentStats.games)
                .filter(([, gs]) => gs.sessions > 0)
                .map(([game, gs]) => (
                  <span key={game} className="text-foreground capitalize">
                    {game.replace("_", " ")}: <span className="font-semibold text-sky-400">{gs.bestAccuracy ?? "—"}%</span>
                  </span>
                ))}
            </div>
          </div>
        )}

        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                isConnected
                  ? conversation.isSpeaking
                    ? "bg-primary animate-pulse"
                    : "bg-primary/70"
                  : "bg-secondary"
              }`}
            >
              {isConnected ? (
                conversation.isSpeaking ? (
                  <Volume2 className="w-12 h-12 text-primary-foreground" />
                ) : (
                  <Mic className="w-12 h-12 text-primary-foreground" />
                )
              ) : (
                <MicOff className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {isConnected
              ? conversation.isSpeaking
                ? "AI Tutor is speaking..."
                : "Listening... Ask your question!"
              : statsReady
              ? "Click Start to begin your session"
              : "Loading your profile…"}
          </p>

          <div className="flex justify-center gap-4">
            {!isConnected ? (
              <Button
                onClick={startConversation}
                disabled={isConnecting || !statsReady}
                className="btn-primary px-8"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Start Session
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button onClick={toggleMute} variant="outline" size="icon">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Button onClick={stopConversation} variant="destructive">
                  <MicOff className="w-4 h-4 mr-2" />
                  End Session
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="bg-secondary/30 rounded-lg p-4">
          <p className="text-sm font-medium mb-2">Tips for your session:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Ask about music theory concepts</li>
            <li>• Get help with practice techniques</li>
            <li>• Learn about your instrument</li>
            <li>• Understand rhythm and timing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AITutor;
