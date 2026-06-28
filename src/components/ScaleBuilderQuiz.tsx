import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Music,
  RotateCcw,
} from 'lucide-react';
import {
  scaleFormulas,
  buildScale,
  chromaticNotes,
  flatNotes,
  getNoteIndex,
  type ScaleType,
  type ScaleFormula,
} from '@/lib/scaleFormulas';
import {
  detectStudentLevel,
  saveQuizResult,
  type StudentData,
} from '@/lib/studentLevelDetection';

interface ScaleQuestion {
  id: string;
  rootNote: string;
  scaleType: ScaleType;
  correctScale: string[];
  formula: ScaleFormula;
}

interface ScaleBuilderQuizProps {
  userId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export function ScaleBuilderQuiz({
  userId,
  onComplete,
  onSkip,
}: ScaleBuilderQuizProps) {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [questions, setQuestions] = useState<ScaleQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  useEffect(() => {
    async function loadQuiz() {
      try {
        setLoading(true);
        const student = await detectStudentLevel(userId);
        setStudentData(student);

        // Generate 5 scale questions
        const newQuestions: ScaleQuestion[] = [];
        const notes = chromaticNotes.filter((n) => !n.includes('#'));
        const types: ScaleType[] = ['major', 'naturalMinor'];

        for (let i = 0; i < 5; i++) {
          const rootNote =
            notes[Math.floor(Math.random() * notes.length)];
          const scaleType =
            types[Math.floor(Math.random() * types.length)];
          const formula = scaleFormulas[scaleType];
          const correctScale = buildScale(rootNote, formula);

          newQuestions.push({
            id: `scale-${i}`,
            rootNote,
            scaleType,
            correctScale,
            formula,
          });
        }

        setQuestions(newQuestions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [userId]);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleSelectNote = (note: string) => {
    if (!submitted) {
      const newSelected = new Set(selectedNotes);
      if (newSelected.has(note)) {
        newSelected.delete(note);
      } else {
        newSelected.add(note);
      }
      setSelectedNotes(newSelected);
      setFeedback('');
    }
  };

  const handleSubmit = () => {
    if (!currentQuestion) return;

    const selectedArray = Array.from(selectedNotes).sort(
      (a, b) =>
        getNoteIndex(a) - getNoteIndex(b) ||
        currentQuestion.correctScale.indexOf(a) -
          currentQuestion.correctScale.indexOf(b)
    );
    const correctArray = currentQuestion.correctScale;

    const isCorrect =
      selectedArray.length === correctArray.length &&
      selectedArray.every((note, idx) => note === correctArray[idx]);

    setSubmitted(true);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFeedback('✓ Perfect! You built the scale correctly!');
    } else {
      setFeedback(
        `The correct ${currentQuestion.formula.name} scale is: ${correctArray.join(' - ')}`
      );
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedNotes(new Set());
      setSubmitted(false);
      setFeedback('');
    } else {
      completeQuiz();
    }
  };

  const handleReset = () => {
    setSelectedNotes(new Set());
    setSubmitted(false);
    setFeedback('');
  };

  const completeQuiz = async () => {
    setQuizComplete(true);
    try {
      await saveQuizResult(
        userId,
        studentData!.current_level,
        score,
        questions.length
      );
    } catch (err) {
      console.error('Failed to save quiz result:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="pt-8 flex items-center justify-center min-h-64">
            <div className="text-center space-y-4">
              <Music className="w-12 h-12 mx-auto animate-pulse text-primary" />
              <p className="text-muted-foreground">
                Loading Scale Builder Quiz...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="pt-8">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertCircle className="w-6 h-6" />
              <p>{error}</p>
            </div>
            <Button onClick={onComplete} className="w-full">
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 80;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-6 h-6" />
              Scale Quiz Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                {passed ? (
                  <CheckCircle className="w-16 h-16 text-green-500" />
                ) : (
                  <XCircle className="w-16 h-16 text-orange-500" />
                )}
              </div>

              <div>
                <p className="text-4xl font-bold text-primary">{percentage}%</p>
                <p className="text-muted-foreground">
                  {score} out of {questions.length} correct
                </p>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold">Your Level</p>
                <p className="text-2xl font-bold text-primary">
                  {studentData?.current_level}
                </p>
                <p className="text-xs text-muted-foreground">
                  Lessons Completed: {studentData?.lessons_completed}
                </p>
              </div>

              {passed ? (
                <p className="text-sm text-green-600 font-medium">
                  Excellent! You're mastering scale construction! 🎉
                </p>
              ) : (
                <p className="text-sm text-orange-600 font-medium">
                  Practice more scales and try again tomorrow!
                </p>
              )}
            </div>

            <Button onClick={onComplete} className="w-full">
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const allNotes = [...chromaticNotes];
  const selectedArray = Array.from(selectedNotes);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Music className="w-6 h-6" />
              Scale Builder Quiz
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-xs"
            >
              Skip for today
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-primary font-semibold">
                {studentData?.current_level}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Formula Display */}
          <div className="bg-secondary/30 rounded-lg p-4 border border-secondary">
            <p className="text-sm text-muted-foreground mb-2 font-semibold">
              SCALE FORMULA
            </p>
            <p className="text-2xl font-bold text-primary font-mono tracking-wide">
              {currentQuestion.formula.displayFormula}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              W = Whole step (2 semitones) | H = Half step (1 semitone)
            </p>
          </div>

          {/* Question */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-semibold">
              {currentQuestion.formula.name.toUpperCase()} SCALE
            </p>
            <p className="text-lg font-semibold">
              Build a {currentQuestion.formula.name} scale starting from{' '}
              <span className="text-primary text-xl">
                {currentQuestion.rootNote}
              </span>
            </p>
          </div>

          {/* Root Note Display */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Root Note (starting point):</p>
            <div className="flex gap-2 flex-wrap">
              <div className="px-4 py-2 bg-green-500/20 border-2 border-green-500 rounded-lg font-semibold text-green-600">
                {currentQuestion.rootNote}
              </div>
            </div>
          </div>

          {/* Note Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground font-semibold">
                Select the remaining notes:
              </p>
              {submitted && (
                <p className="text-sm">
                  Selected: <span className="font-semibold">{selectedNotes.size + 1}/8</span>
                </p>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {allNotes.map((note) => {
                const isRoot = note === currentQuestion.rootNote;
                const isSelected = selectedNotes.has(note);
                const isCorrect = currentQuestion.correctScale.includes(note);

                if (isRoot) return null;

                let bgClass =
                  'bg-secondary/50 border-secondary hover:border-primary';
                if (isSelected) {
                  bgClass = isCorrect
                    ? 'bg-green-500/20 border-green-500'
                    : 'bg-red-500/20 border-red-500';
                } else if (submitted && isCorrect) {
                  bgClass = 'bg-green-500/10 border-green-500/50';
                }

                return (
                  <button
                    key={note}
                    onClick={() => handleSelectNote(note)}
                    disabled={submitted}
                    className={`px-3 py-2 rounded-lg border-2 font-semibold transition ${bgClass} disabled:cursor-default`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{note}</span>
                      {isSelected && isCorrect && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`p-4 rounded-lg border ${
                feedback.includes('✓')
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              <p className="text-sm text-muted-foreground">{feedback}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!submitted ? (
              <Button
                onClick={handleSubmit}
                disabled={selectedNotes.size === 0}
                className="flex-1"
              >
                Check Answer
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
