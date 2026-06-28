import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ScaleBuilderQuiz } from "@/components/ScaleBuilderQuiz";

const ScaleBuilderQuizPage = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [showQuiz, setShowQuiz] = useState(false);

  if (loading || !user) {
    return null;
  }

  if (!hasRole("student") && !hasRole("teacher")) {
    return (
      <DashboardLayout
        title="Scale Builder Quiz"
        role={hasRole("student") ? "student" : "teacher"}
      >
        <div className="text-center">Access denied</div>
      </DashboardLayout>
    );
  }

  if (showQuiz) {
    return (
      <ScaleBuilderQuiz
        userId={user.id}
        onComplete={() => {
          setShowQuiz(false);
          navigate("/dashboard");
        }}
        onSkip={() => {
          setShowQuiz(false);
          navigate("/dashboard");
        }}
      />
    );
  }

  return (
    <DashboardLayout
      title="Scale Builder Quiz"
      role={hasRole("student") ? "student" : "teacher"}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden px-4 py-4 border-b border-border flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Scale Builder</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-4xl mx-auto w-full">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Scale Builder Quiz</h2>
              <p className="text-muted-foreground">
                Learn and practice building major and minor scales using their
                interval formulas.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-lg border border-border p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">What is a Scale?</h3>
                  <p className="text-sm text-muted-foreground">
                    A scale is a sequence of notes in ascending or descending
                    order. Each scale follows a specific pattern of intervals
                    (whole steps and half steps) that gives it its unique
                    character.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Major Scale Formula</h3>
                  <div className="bg-primary/10 p-4 rounded-lg font-mono text-sm font-bold text-primary mb-2">
                    W - W - H - W - W - W - H
                  </div>
                  <p className="text-sm text-muted-foreground">
                    W = Whole step (2 semitones) | H = Half step (1 semitone)
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Natural Minor Scale Formula
                  </h3>
                  <div className="bg-secondary/50 p-4 rounded-lg font-mono text-sm font-bold text-primary mb-2">
                    W - H - W - W - H - W - W
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The natural minor scale has a different interval pattern
                    that creates its characteristic minor quality.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-6 space-y-4 bg-secondary/30">
                <div>
                  <h3 className="font-semibold text-lg mb-2">How to Play</h3>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>You'll see a scale formula at the top</li>
                    <li>A root note will be provided as your starting point</li>
                    <li>Select all the notes that complete the scale</li>
                    <li>Submit your answer to check if it's correct</li>
                    <li>Learn from the feedback and try the next scale!</li>
                  </ol>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowQuiz(true)}
              size="lg"
              className="w-full md:w-auto"
            >
              Start Quiz
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ScaleBuilderQuizPage;
