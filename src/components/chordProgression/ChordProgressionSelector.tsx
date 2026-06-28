import { useState } from "react";
import { ChevronRight, Music, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  POPULAR_PROGRESSIONS,
  ChordProgression,
  getAllDifficulties,
  getAllCategories,
} from "@/lib/chordProgressionData";
import CreateCustomProgression from "./CreateCustomProgression";

interface ChordProgressionSelectorProps {
  onSelectProgression: (progression: ChordProgression) => void;
}

const ChordProgressionSelector = ({ onSelectProgression }: ChordProgressionSelectorProps) => {
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<"beginner" | "intermediate" | "advanced" | "all">("all");

  const difficulties = getAllDifficulties();
  const categories = getAllCategories();

  const filteredProgressions =
    selectedDifficulty === "all"
      ? POPULAR_PROGRESSIONS
      : POPULAR_PROGRESSIONS.filter(p => p.difficulty === selectedDifficulty);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700";
      case "intermediate":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700";
      case "advanced":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700";
      default:
        return "bg-gray-100 dark:bg-gray-800";
    }
  };

  if (showCreateCustom) {
    return (
      <CreateCustomProgression
        onProgressionCreated={onSelectProgression}
        onCancel={() => setShowCreateCustom(false)}
      />
    );
  }

  return (
    <div className="w-full h-full p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="hidden md:block mb-8">
          <h1 className="text-3xl font-bold mb-2">Chord Progression Quiz</h1>
          <p className="text-muted-foreground">
            Practice chord progressions by selecting from popular patterns or create your own
          </p>
        </div>

        {/* Create Custom Button */}
        <Button
          onClick={() => setShowCreateCustom(true)}
          className="w-full md:w-auto flex items-center gap-2"
          variant="outline"
        >
          <Plus className="w-4 h-4" />
          Create Custom Progression
        </Button>
      </div>

      {/* Difficulty Filter - Desktop */}
      <div className="hidden md:flex gap-2 mb-6">
        <Button
          variant={selectedDifficulty === "all" ? "default" : "outline"}
          onClick={() => setSelectedDifficulty("all")}
          size="sm"
        >
          All Levels
        </Button>
        {difficulties.map((diff) => (
          <Button
            key={diff}
            variant={selectedDifficulty === diff ? "default" : "outline"}
            onClick={() => setSelectedDifficulty(diff)}
            size="sm"
            className="capitalize"
          >
            {diff}
          </Button>
        ))}
      </div>

      {/* Difficulty Filter - Mobile */}
      <Tabs value={selectedDifficulty} onValueChange={(v: any) => setSelectedDifficulty(v)} className="md:hidden mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          {difficulties.map((diff) => (
            <TabsTrigger key={diff} value={diff} className="text-xs capitalize">
              {diff.slice(0, 3)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Progressions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProgressions.map((progression) => (
          <Card
            key={progression.id}
            className="hover:shadow-lg transition-all cursor-pointer overflow-hidden"
            onClick={() => onSelectProgression(progression)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg line-clamp-1">{progression.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{progression.description}</CardDescription>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Chords */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Chords</p>
                <div className="flex flex-wrap gap-1">
                  {progression.chords.map((chord, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium"
                    >
                      {chord.symbol}
                    </span>
                  ))}
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2 py-1 rounded font-semibold capitalize ${getDifficultyColor(progression.difficulty)}`}>
                  {progression.difficulty}
                </span>
                <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded font-medium">
                  {progression.category}
                </span>
                {progression.genre && (
                  <span className="px-2 py-1 bg-muted text-muted-foreground rounded flex items-center gap-1">
                    <Music className="w-3 h-3" />
                    {progression.genre}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProgressions.length === 0 && (
        <div className="text-center py-12">
          <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No progressions found</p>
        </div>
      )}

      {/* Featured Info Card */}
      <Card className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Tip: Start with Beginner Progressions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The I-IV-V progression (C-F-G) is one of the most common patterns in music. Master this first,
          then explore intermediate patterns like the modern I-V-vi-IV progression used in countless pop songs.
        </CardContent>
      </Card>
    </div>
  );
};

export default ChordProgressionSelector;
