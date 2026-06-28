import { useState, useEffect } from "react";
import { ArrowLeft, Volume2, RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChordProgression } from "@/lib/chordProgressionData";
import { useToast } from "@/hooks/use-toast";
import ChordProgressionResults from "./ChordProgressionResults";

interface ChordProgressionQuizProps {
  progression: ChordProgression;
  userId: string;
  onBack: () => void;
}

const ChordProgressionQuiz = ({
  progression,
  userId,
  onBack,
}: ChordProgressionQuizProps) => {
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultCorrect, setResultCorrect] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [playedChords, setPlayedChords] = useState<string[]>([]);
  const { toast } = useToast();

  const currentChord = progression.chords[currentChordIndex];
  const progress = ((currentChordIndex) / progression.chords.length) * 100;

  // Simulate playing audio (in a real app, this would use Tone.js or Web Audio API)
  const playChordSound = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    // Simulate audio playback
    setTimeout(() => {
      setIsPlaying(false);
    }, 500);
  };

  const handleChordCorrect = () => {
    setShowResult(true);
    setResultCorrect(true);
    setAttempts(attempts + 1);
    setScore(score + 1);
    setPlayedChords([...playedChords, currentChord.symbol]);

    setTimeout(() => {
      if (currentChordIndex < progression.chords.length - 1) {
        setCurrentChordIndex(currentChordIndex + 1);
        setShowResult(false);
      } else {
        setQuizComplete(true);
      }
    }, 1000);
  };

  const handleChordIncorrect = () => {
    setShowResult(true);
    setResultCorrect(false);
    setAttempts(attempts + 1);
  };

  const handleNext = () => {
    if (currentChordIndex < progression.chords.length - 1) {
      setCurrentChordIndex(currentChordIndex + 1);
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  const handleReset = () => {
    setCurrentChordIndex(0);
    setScore(0);
    setAttempts(0);
    setShowResult(false);
    setPlayedChords([]);
    setQuizComplete(false);
  };

  if (quizComplete) {
    return (
      <ChordProgressionResults
        progression={progression}
        score={score}
        total={progression.chords.length}
        attempts={attempts}
        userId={userId}
        onRestart={handleReset}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="w-full h-full p-4 md:p-8 max-w-2xl mx-auto overflow-y-auto">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Progressions
      </button>

      {/* Progress */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-lg">{progression.name}</CardTitle>
            <span className="text-sm font-semibold text-muted-foreground">
              Chord {currentChordIndex + 1} of {progression.chords.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
      </Card>

      {/* Main Quiz Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Identify & Play This Chord</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chord Display */}
          <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl p-8 border border-primary/30">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Current Chord</p>
              <div className="text-6xl font-bold text-primary">{currentChord.symbol}</div>
              <p className="text-muted-foreground">{currentChord.name}</p>
            </div>
          </div>

          {/* Play Button */}
          <Button
            onClick={playChordSound}
            disabled={isPlaying}
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            variant="secondary"
          >
            <Volume2 className={`w-5 h-5 ${isPlaying ? "animate-pulse" : ""}`} />
            {isPlaying ? "Playing..." : "Play Chord Sound"}
          </Button>

          {/* Piano Notes Display */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Piano Notes</p>
            <div className="flex flex-wrap gap-2">
              {currentChord.notes.map((note, idx) => (
                <span
                  key={idx}
                  className="px-3 py-2 bg-primary/20 text-primary rounded-lg font-semibold text-sm"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>

          {/* Progression Context */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Progression</p>
            <div className="flex flex-wrap gap-2">
              {progression.chords.map((chord, idx) => (
                <div key={idx} className="relative">
                  <span
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                      idx === currentChordIndex
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                        : idx < currentChordIndex
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {chord.symbol}
                  </span>
                  {idx < currentChordIndex && (
                    <Check className="absolute -top-1 -right-1 w-4 h-4 text-green-600 dark:text-green-400 bg-white dark:bg-gray-900 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Result Feedback */}
          {showResult && (
            <div
              className={`rounded-lg p-4 flex items-start gap-3 ${
                resultCorrect
                  ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
                  : "bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700"
              }`}
            >
              {resultCorrect ? (
                <>
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-200">Correct!</p>
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Great job! You identified the {currentChord.symbol} chord correctly.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-200">Not Quite!</p>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      This is the {currentChord.symbol} chord. Try again or skip to the next chord.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {!showResult && (
          <>
            <Button onClick={() => setQuizComplete(true)} variant="outline" className="col-span-2 md:col-span-1">
              Skip
            </Button>
            <Button
              onClick={handleChordCorrect}
              className="col-span-2 md:col-span-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              I Got It!
            </Button>
            <Button
              onClick={handleChordIncorrect}
              variant="outline"
              className="col-span-2 md:col-span-1 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Incorrect
            </Button>
          </>
        )}

        {showResult && (
          <>
            {resultCorrect ? (
              <Button onClick={handleNext} className="col-span-2 md:col-span-3 flex items-center justify-center gap-2">
                {currentChordIndex === progression.chords.length - 1
                  ? "Complete Quiz"
                  : "Next Chord"}
              </Button>
            ) : (
              <>
                <Button onClick={() => setShowResult(false)} variant="outline" className="col-span-1">
                  Try Again
                </Button>
                <Button onClick={handleNext} className="col-span-1">
                  Skip
                </Button>
              </>
            )}
          </>
        )}
      </div>

      {/* Stats */}
      <Card className="mt-6 bg-muted/50">
        <CardContent className="pt-6 flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{score}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Correct</p>
          </div>
          <div className="border-l border-border" />
          <div>
            <p className="text-2xl font-bold text-muted-foreground">{attempts}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Attempts</p>
          </div>
          <div className="border-l border-border" />
          <div>
            <p className="text-2xl font-bold text-muted-foreground">
              {attempts > 0 ? Math.round((score / attempts) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Accuracy</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChordProgressionQuiz;
