import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, XCircle, Music } from "lucide-react";
import {
  detectStudentLevel,
  saveQuizResult,
  type StudentData,
} from "@/lib/studentLevelDetection";
import {
  getRandomQuestions,
  type QuizQuestion,
} from "@/lib/musicTheoryQuestions";

interface MusicTheoryQuizProps {
  userId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export function MusicTheoryQuiz({
  userId,
  onComplete,
  onSkip,
}: MusicTheoryQuizProps) {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizComplete, setQuizComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load student data and questions
  useEffect(() => {
    async function loadQuiz() {
      try {
        setLoading(true);
        const student = await detectStudentLevel(userId);
        setStudentData(student);

        const quizQuestions = getRandomQuestions(student.current_level, 5);
        setQuestions(quizQuestions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [userId]);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const userAnswer = selectedAnswers[currentQuestion?.id || ""];
  const isCorrect = userAnswer === currentQuestion?.correctAnswer;

  const handleSelectAnswer = (answer: string) => {
    if (!selectedAnswers[currentQuestion.id]) {
      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: answer,
      }));

      // Update score if correct
      if (answer === currentQuestion.correctAnswer) {
        setScore((prev) => prev + 1);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = async () => {
    setQuizComplete(true);
    try {
      await saveQuizResult(userId, studentData!.current_level, score, questions.length);
    } catch (err) {
      console.error("Failed to save quiz result:", err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="pt-8 flex items-center justify-center min-h-64">
            <div className="text-center space-y-4">
              <Music className="w-12 h-12 mx-auto animate-pulse text-primary" />
              <p className="text-muted-foreground">Loading your personalized quiz...</p>
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
              Quiz Complete!
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
                  Great job! You're ready for the next level. 🎉
                </p>
              ) : (
                <p className="text-sm text-orange-600 font-medium">
                  Practice more and try again tomorrow!
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Music className="w-6 h-6" />
              Music Theory Daily Review
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
          {/* Question */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-semibold">
              {currentQuestion.category.toUpperCase()}
            </p>
            <p className="text-lg font-semibold">{currentQuestion.question}</p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = userAnswer === option;
              const isCorrectOption = option === currentQuestion.correctAnswer;
              const showCorrect = selectedAnswers[currentQuestion.id];

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(option)}
                  disabled={!!selectedAnswers[currentQuestion.id]}
                  className={`w-full p-3 rounded-lg border-2 text-left transition ${
                    isSelected
                      ? isCorrect
                        ? "border-green-500 bg-green-50/10"
                        : "border-red-500 bg-red-50/10"
                      : showCorrect && isCorrectOption
                      ? "border-green-500 bg-green-50/10"
                      : "border-border hover:border-primary"
                  } disabled:cursor-default`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option}</span>
                    {isSelected && isCorrect && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    {showCorrect && isCorrectOption && !isSelected && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {selectedAnswers[currentQuestion.id] && (
            <div
              className={`p-4 rounded-lg ${
                isCorrect
                  ? "bg-green-50/10 border border-green-500/30"
                  : "bg-blue-50/10 border border-blue-500/30"
              }`}
            >
              <p className="text-sm font-semibold mb-2">
                {isCorrect ? "✓ Correct!" : "Explanation:"}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentQuestion.explanation}
              </p>
            </div>
          )}

          {/* Next Button */}
          <Button
            onClick={handleNext}
            disabled={!selectedAnswers[currentQuestion.id]}
            className="w-full"
          >
            {currentIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
