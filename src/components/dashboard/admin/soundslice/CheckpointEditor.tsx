import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface Checkpoint {
  id: string;
  timestamp: number;
  requiredNoteNumber: number;
  label?: string;
}

interface CheckpointEditorProps {
  checkpoints: Checkpoint[];
  onCheckpointsChange: (checkpoints: Checkpoint[]) => void;
  isEnabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export const CheckpointEditor = ({
  checkpoints,
  onCheckpointsChange,
  isEnabled,
  onEnabledChange,
}: CheckpointEditorProps) => {
  const [newTime, setNewTime] = useState("");
  const [newNote, setNewNote] = useState("60"); // Middle C
  const [editingId, setEditingId] = useState<string | null>(null);

  const getNoteDisplayName = (noteNum: number) => {
    const name = NOTE_NAMES[noteNum % 12];
    const octave = Math.floor(noteNum / 12) - 1;
    return `${name}${octave}`;
  };

  const handleAddCheckpoint = () => {
    const timestamp = parseFloat(newTime);
    const noteNum = parseInt(newNote);

    if (isNaN(timestamp) || isNaN(noteNum)) {
      toast({ title: "Invalid input", variant: "destructive" });
      return;
    }

    if (timestamp < 0 || noteNum < 0 || noteNum > 127) {
      toast({
        title: "Invalid values",
        description: "Time >= 0, Note: 0-127 (MIDI range)",
        variant: "destructive",
      });
      return;
    }

    const newCheckpoint: Checkpoint = {
      id: `cp-${Date.now()}`,
      timestamp,
      requiredNoteNumber: noteNum,
      label: `Checkpoint ${checkpoints.length + 1}`,
    };

    const updated = [...checkpoints, newCheckpoint].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    onCheckpointsChange(updated);
    setNewTime("");
    setNewNote("60");
    toast({ title: "Checkpoint added" });
  };

  const handleDeleteCheckpoint = (id: string) => {
    onCheckpointsChange(checkpoints.filter(cp => cp.id !== id));
    toast({ title: "Checkpoint deleted" });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🎵 MIDI Checkpoints</span>
          <div className="flex items-center gap-2">
            <Badge
              variant={isEnabled ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => onEnabledChange(!isEnabled)}
            >
              {isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning */}
        {isEnabled && checkpoints.length === 0 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-300">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Checkpoint testing is enabled but no checkpoints configured.</span>
            </div>
          </div>
        )}

        {/* Add Checkpoint Form */}
        <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium">Add New Checkpoint</p>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Time (seconds)</label>
                <Input
                  type="number"
                  placeholder="e.g., 5.0"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="bg-background border-border text-xs"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">MIDI Note (0-127)</label>
                <Input
                  type="number"
                  placeholder="e.g., 60 (C4)"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="bg-background border-border text-xs"
                  min="0"
                  max="127"
                />
              </div>
            </div>
            <Button
              onClick={handleAddCheckpoint}
              disabled={!newTime || !newNote}
              size="sm"
              className="w-full"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Checkpoint
            </Button>
          </div>
        </div>

        {/* Checkpoints List */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Configured Checkpoints</p>
          {checkpoints.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center bg-gray-50 dark:bg-gray-900/50 rounded">
              No checkpoints yet. Add one to get started.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {checkpoints.map((cp, idx) => (
                <div
                  key={cp.id}
                  className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded flex items-center justify-between text-sm"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {cp.label || `Checkpoint ${idx + 1}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Time: <span className="font-mono">{cp.timestamp.toFixed(2)}s</span>
                      {" | "}
                      Note: <span className="font-mono">{getNoteDisplayName(cp.requiredNoteNumber)}</span>
                      {" "}
                      <span className="text-gray-500">({cp.requiredNoteNumber})</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCheckpoint(cp.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <p className="font-medium">How Checkpoints Work:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>When playback reaches a checkpoint time, Soundslice pauses automatically.</li>
            <li>The student must play the required MIDI note to resume.</li>
            <li>Wrong notes do not advance playback.</li>
            <li>Currently supports single-note matching.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
