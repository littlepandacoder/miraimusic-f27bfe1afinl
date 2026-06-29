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

const GAMES = [
  { name: "Key Signature Quiz", icon: "🎼", desc: "Master key signatures with sharps and flats" },
  { name: "Create the Scale", icon: "🎵", desc: "Build scales from note formulas" },
  { name: "Staff Note Names", icon: "🎼", desc: "Learn treble and bass clef notes" },
  { name: "Interval Quiz", icon: "📏", desc: "Identify musical intervals by sight and ear" },
  { name: "Line or Space?", icon: "⚡", desc: "Determine if notes are on lines or spaces" },
  { name: "Falling Notes", icon: "🎮", desc: "Dynamic note-falling game for fast recognition" },
  { name: "2 or 3 Black Keys?", icon: "🎹", desc: "Practice black key grouping patterns" },
  { name: "Complete the Pattern", icon: "🧩", desc: "Identify missing black key patterns" },
  { name: "Music Vocabulary", icon: "🎭", desc: "Learn musical terms and dynamics" },
  { name: "Flats & Sharps Quiz", icon: "♭♯", desc: "Master accidental symbols" },
  { name: "Cadence Quiz", icon: "🎧", desc: "Learn common chord progressions and cadences" },
  { name: "Chord Progression Quiz", icon: "🎸", desc: "Identify and build chord progressions" },
];

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

  const handleGameClick = (gameName: string) => {
    if (gameName === "Create the Scale") {
      setCurrentView("scale-builder");
    } else {
      // Redirect to piano-theory.html with the game name
      const gameMap: { [key: string]: string } = {
        "Key Signature Quiz": "startKeyQuiz",
        "Staff Note Names": "startStaffNaming",
        "Interval Quiz": "startIntervalQuiz",
        "Line or Space?": "startLineSpace",
        "Falling Notes": "startFallingNotes",
        "2 or 3 Black Keys?": "startBK",
        "Complete the Pattern": "startPD",
        "Music Vocabulary": "startDTA",
        "Flats & Sharps Quiz": "startFlatsSharpsQuiz",
        "Cadence Quiz": "startCadenceQuiz",
        "Chord Progression Quiz": "startProgressionQuiz",
      };

      const gameFunc = gameMap[gameName];
      if (gameFunc) {
        window.location.href = `/piano-theory.html#${gameFunc}`;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 flex items-center gap-2">
          <Music className="w-6 md:w-8 h-6 md:h-8" />
          Piano Theory
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Master music theory through interactive lessons and quizzes
        </p>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {GAMES.map((game) => (
          <Card
            key={game.name}
            className="hover:shadow-lg transition cursor-pointer h-full"
            onClick={() => handleGameClick(game.name)}
          >
            <CardHeader className="pb-2 md:pb-3">
              <div className="text-2xl md:text-3xl mb-2">{game.icon}</div>
              <CardTitle className="text-sm md:text-base line-clamp-2">
                {game.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                {game.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* External Link Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Full Theory Hub
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs md:text-sm text-muted-foreground">
            Access the complete interactive theory lessons with all games and advanced features.
          </p>
          <Button
            onClick={() => {
              window.location.href = "/piano-theory.html";
            }}
            className="w-full gap-2 text-xs md:text-sm h-8 md:h-10"
          >
            Open Full Theory Hub <ArrowRight className="w-3 md:w-4 h-3 md:h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
