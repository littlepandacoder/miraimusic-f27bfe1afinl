import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, BookOpen, ArrowRight } from "lucide-react";
import { ScaleBuilderQuiz } from "@/components/ScaleBuilderQuiz";
import { useAuth } from "@/hooks/useAuth";

type ViewType = "menu" | "scale-builder";

interface PianoTheoryHubProps {
  userId: string;
}

export function PianoTheoryHub({ userId }: PianoTheoryHubProps) {
  const [currentView, setCurrentView] = useState<ViewType>("menu");

  if (currentView === "scale-builder") {
    return (
      <div>
        <Button
          variant="ghost"
          onClick={() => setCurrentView("menu")}
          className="mb-4"
        >
          ← Back to Piano Theory
        </Button>
        <ScaleBuilderQuiz
          userId={userId}
          onComplete={() => setCurrentView("menu")}
          onSkip={() => setCurrentView("menu")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Music className="w-8 h-8" />
          Piano Theory
        </h1>
        <p className="text-muted-foreground">
          Master music theory through interactive lessons and quizzes
        </p>
      </div>

      {/* Theory Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* External Piano Theory */}
        <Card className="hover:shadow-lg transition cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Music Theory Lessons
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Comprehensive lessons covering:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Note naming and staff reading</li>
              <li>Intervals and scales</li>
              <li>Chords and progressions</li>
              <li>Key signatures</li>
              <li>Music notation</li>
            </ul>
            <Button
              onClick={() => {
                window.location.href = "/piano-theory.html";
              }}
              className="w-full gap-2"
            >
              Open Lessons <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Scale Builder Quiz */}
        <Card
          onClick={() => setCurrentView("scale-builder")}
          className="hover:shadow-lg transition cursor-pointer"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              Scale Builder Quiz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Learn scale construction through interactive quizzes:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Major scale formula</li>
              <li>Natural minor scale</li>
              <li>Harmonic minor scale</li>
              <li>Melodic minor scale</li>
              <li>Real-time feedback</li>
            </ul>
            <Button className="w-full gap-2" onClick={() => setCurrentView("scale-builder")}>
              Start Quiz <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Why Learn Piano Theory?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <li className="flex gap-2">
              <span className="text-primary">✓</span>
              <span className="text-sm">Understand music fundamentals</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">✓</span>
              <span className="text-sm">Improve sight reading</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">✓</span>
              <span className="text-sm">Write and compose music</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">✓</span>
              <span className="text-sm">Accelerate learning</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">✓</span>
              <span className="text-sm">Master scale patterns</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">✓</span>
              <span className="text-sm">Build confidence</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
