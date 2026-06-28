import { useState } from "react";
import { ArrowLeft, Plus, X, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CHORD_BANK,
  Chord,
  ChordProgression,
  ChordProgression as CP,
} from "@/lib/chordProgressionData";
import { useToast } from "@/hooks/use-toast";

interface CreateCustomProgressionProps {
  onProgressionCreated: (progression: ChordProgression) => void;
  onCancel: () => void;
}

const CreateCustomProgression = ({ onProgressionCreated, onCancel }: CreateCustomProgressionProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedChords, setSelectedChords] = useState<Chord[]>([]);
  const { toast } = useToast();

  const chordOptions = Object.values(CHORD_BANK);
  const chordSymbols = Object.keys(CHORD_BANK);

  const handleAddChord = (chordKey: string) => {
    const chord = CHORD_BANK[chordKey];
    setSelectedChords([...selectedChords, chord]);
  };

  const handleRemoveChord = (index: number) => {
    setSelectedChords(selectedChords.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Please enter a progression name", variant: "destructive" });
      return;
    }

    if (selectedChords.length < 2) {
      toast({
        title: "Error",
        description: "Please select at least 2 chords",
        variant: "destructive",
      });
      return;
    }

    const customProgression: ChordProgression = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || "Custom progression",
      chords: selectedChords,
      difficulty: "intermediate",
      category: "Custom",
    };

    onProgressionCreated(customProgression);
    toast({ title: "Success", description: "Custom progression created!" });
  };

  return (
    <div className="w-full h-full p-4 md:p-8 max-w-2xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Progressions
        </button>
        <h1 className="text-3xl font-bold mb-2">Create Custom Progression</h1>
        <p className="text-muted-foreground">
          Build your own chord progression by selecting chords in order
        </p>
      </div>

      {/* Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Progression Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Progression Name *</label>
            <Input
              placeholder="e.g., My Favorite Pop Progression"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <Textarea
              placeholder="Describe your progression, how to use it, what it sounds like..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Selected Chords */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Selected Chords ({selectedChords.length})</span>
            {selectedChords.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChords([])}
                className="text-destructive hover:text-destructive"
              >
                Clear All
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            {selectedChords.length === 0
              ? "No chords added yet. Add chords below to create your progression."
              : `You've selected ${selectedChords.length} chord${selectedChords.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedChords.length > 0 ? (
            <div className="space-y-3">
              {selectedChords.map((chord, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 p-3 bg-primary/10 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-primary w-8">{index + 1}.</span>
                    <div>
                      <p className="font-semibold">{chord.symbol}</p>
                      <p className="text-xs text-muted-foreground">{chord.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveChord(index)}
                    className="p-2 hover:bg-destructive/20 text-destructive rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select chords to build your progression</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Chords */}
      <Card>
        <CardHeader>
          <CardTitle>Available Chords</CardTitle>
          <CardDescription>Click a chord to add it to your progression</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {chordSymbols.map((key) => (
              <button
                key={key}
                onClick={() => handleAddChord(key)}
                className="p-3 rounded-lg border border-border hover:bg-primary hover:text-primary-foreground transition-colors font-semibold text-sm"
              >
                {key}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!name.trim() || selectedChords.length < 2}
          className="flex-1 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create & Start Quiz
        </Button>
      </div>
    </div>
  );
};

export default CreateCustomProgression;
