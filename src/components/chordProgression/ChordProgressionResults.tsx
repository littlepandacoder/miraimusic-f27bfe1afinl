import { useEffect } from "react";
import { ArrowLeft, Trophy, TrendingUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChordProgression } from "@/lib/chordProgressionData";
import { supabase } from "@/integrations/supabase/client";

interface ChordProgressionResultsProps {
  progression: ChordProgression;
  score: number;
  total: number;
  attempts: number;
  userId: string;
  onRestart: () => void;
  onBack: () => void;
}

const ChordProgressionResults = ({
  progression,
  score,
  total,
  attempts,
  userId,
  onRestart,
  onBack,
}: ChordProgressionResultsProps) => {
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
  const averageAttempts = attempts > 0 ? (attempts / total).toFixed(1) : "0";

  // Save quiz result
  useEffect(() => {
    const saveResult = async () => {
      try {
        await supabase.from("gamified_activity").insert({
          user_id: userId,
          game_name: "Chord Progression Quiz",
          score,
          total_questions: total,
          progression_id: progression.id,
          progression_name: progression.name,
          accuracy,
          attempts,
        });
      } catch (err) {
        console.error("Error saving quiz result:", err);
      }
    };

    saveResult();
  }, [userId, score, total, progression, accuracy, attempts]);

  const performanceLevel = accuracy >= 80 ? "Excellent" : accuracy >= 60 ? "Good" : "Keep Practicing";
  const performanceColor =
    accuracy >= 80 ? "text-green-600 dark:text-green-400" : accuracy >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-orange-600 dark:text-orange-400";

  return (
    <div className="w-full h-full p-4 md:p-8 max-w-2xl mx-auto overflow-y-auto flex flex-col">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Progressions
      </button>

      {/* Results Card */}
      <Card className="mb-6 border-2 border-primary/20">
        <CardHeader className="text-center pb-3">
          <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
          <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score */}
          <div className="text-center space-y-2">
            <div className="text-5xl font-bold text-primary">
              {score}/{total}
            </div>
            <p className="text-muted-foreground">Chords Identified Correctly</p>
          </div>

          {/* Accuracy */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Accuracy</span>
              <span className={`font-bold ${performanceColor}`}>{accuracy}%</span>
            </div>
            <Progress value={accuracy} className="h-3" />
          </div>

          {/* Performance Rating */}
          <div className={`text-center py-4 px-4 rounded-lg ${
            accuracy >= 80
              ? "bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200"
              : accuracy >= 60
                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200"
                : "bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-200"
          }`}>
            <p className="font-semibold text-lg">{performanceLevel}</p>
            <p className="text-sm mt-1">
              {accuracy >= 80
                ? "Outstanding! You've mastered this progression."
                : accuracy >= 60
                  ? "Good work! Practice more to improve your accuracy."
                  : "Keep practicing! Try again to improve."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Progression</p>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-sm">{progression.name}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Difficulty</p>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-sm capitalize">{progression.difficulty}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Total Attempts</p>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-sm">{attempts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Avg per Chord</p>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-sm">{averageAttempts} attempts</p>
          </CardContent>
        </Card>
      </div>

      {/* Progression Breakdown */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Chords in This Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {progression.chords.map((chord, idx) => (
              <span
                key={idx}
                className="px-3 py-2 bg-primary/10 text-primary rounded-lg font-semibold text-sm"
              >
                {chord.symbol}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="mb-6 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <TrendingUp className="w-4 h-4" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 dark:text-blue-200 space-y-2">
          {accuracy >= 80 ? (
            <>
              <p>✓ Great job! Try the next difficulty level.</p>
              <p>✓ Practice with different chord progressions to expand your knowledge.</p>
            </>
          ) : accuracy >= 60 ? (
            <>
              <p>✓ You're on the right track! Practice this progression a few more times.</p>
              <p>✓ Pay attention to the intervals between chords.</p>
            </>
          ) : (
            <>
              <p>✓ Don't worry! Music skills improve with practice.</p>
              <p>✓ Try this progression again and really listen to each chord.</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-auto">
        <Button onClick={onRestart} size="lg" className="flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Try This Progression Again
        </Button>
        <Button onClick={onBack} variant="outline" size="lg">
          Choose Different Progression
        </Button>
      </div>
    </div>
  );
};

export default ChordProgressionResults;
