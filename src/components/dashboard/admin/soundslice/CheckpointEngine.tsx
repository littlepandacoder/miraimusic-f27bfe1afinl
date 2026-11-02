import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Play } from "lucide-react";
import { Checkpoint } from "./CheckpointEditor";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

interface CheckpointEngineProps {
  checkpoints: Checkpoint[];
  isEnabled: boolean;
  currentTime: number;
  isPlaying: boolean;
  lastDetectedNote: { number: number; name: string; octave: number } | null;
  iframe: HTMLIFrameElement | null;
  onPause?: () => void;
}

interface CheckpointState {
  active: Checkpoint | null;
  isPausedAtCheckpoint: boolean;
  hasBeenTriggered: boolean;
  detectedCorrectNote: boolean;
}

export const CheckpointEngine = ({
  checkpoints,
  isEnabled,
  currentTime,
  isPlaying,
  lastDetectedNote,
  iframe,
  onPause,
}: CheckpointEngineProps) => {
  const [state, setState] = useState<CheckpointState>({
    active: null,
    isPausedAtCheckpoint: false,
    hasBeenTriggered: false,
    detectedCorrectNote: false,
  });

  const passedCheckpointsRef = useRef<Set<string>>(new Set());

  // Monitor playback position and trigger checkpoints
  useEffect(() => {
    if (!isEnabled || checkpoints.length === 0 || !iframe?.contentWindow) {
      return;
    }

    // Find active checkpoint (upcoming or current)
    const active = checkpoints.find(cp => {
      const timeTolerance = 0.5; // 500ms window
      return (
        currentTime >= cp.timestamp - timeTolerance &&
        currentTime <= cp.timestamp + timeTolerance &&
        !passedCheckpointsRef.current.has(cp.id)
      );
    });

    if (active && isPlaying && !state.isPausedAtCheckpoint) {
      // Trigger checkpoint
      passedCheckpointsRef.current.add(active.id);
      setState(prev => ({
        ...prev,
        active,
        isPausedAtCheckpoint: true,
        hasBeenTriggered: true,
        detectedCorrectNote: false,
      }));

      // Pause player
      iframe.contentWindow.postMessage(
        { command: "player.pause" },
        "https://www.soundslice.com"
      );

      if (onPause) {
        onPause();
      }
    }

    // Clear active checkpoint if we've moved past it (seeking)
    if (state.active && currentTime > state.active.timestamp + 2) {
      setState(prev => ({
        ...prev,
        isPausedAtCheckpoint: false,
      }));
    }
  }, [isEnabled, checkpoints, currentTime, isPlaying, iframe, state.isPausedAtCheckpoint, onPause]);

  // Check if correct note was detected
  useEffect(() => {
    if (!state.isPausedAtCheckpoint || !state.active || !lastDetectedNote) {
      return;
    }

    const correctNote = state.active.requiredNoteNumber === lastDetectedNote.number;

    if (correctNote) {
      setState(prev => ({
        ...prev,
        detectedCorrectNote: true,
      }));

      // Auto-resume after a short delay
      setTimeout(() => {
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            { command: "player.play" },
            "https://www.soundslice.com"
          );
          setState(prev => ({
            ...prev,
            isPausedAtCheckpoint: false,
            active: null,
            hasBeenTriggered: false,
          }));
        }
      }, 500);
    }
  }, [state, lastDetectedNote, iframe]);

  // Reset when starting new playback
  useEffect(() => {
    if (!isEnabled) {
      passedCheckpointsRef.current.clear();
      setState({
        active: null,
        isPausedAtCheckpoint: false,
        hasBeenTriggered: false,
        detectedCorrectNote: false,
      });
    }
  }, [isEnabled]);

  const getNoteDisplayName = (noteNum: number) => {
    const name = NOTE_NAMES[noteNum % 12];
    const octave = Math.floor(noteNum / 12) - 1;
    return `${name}${octave}`;
  };

  if (!isEnabled) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Checkpoint Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enable checkpoint testing in the Checkpoint Editor to begin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🎯 Checkpoint Status</span>
          <Badge
            variant={state.isPausedAtCheckpoint ? "destructive" : "secondary"}
          >
            {state.isPausedAtCheckpoint ? "⏸ Paused at Checkpoint" : "▶ Playing"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Checkpoint */}
        {state.active ? (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded space-y-3">
            <p className="font-medium text-yellow-900 dark:text-yellow-400">
              ⏸ Waiting for Student Input
            </p>

            <div className="space-y-2">
              <div className="p-3 bg-white dark:bg-gray-900 rounded border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-muted-foreground mb-1">Required Note</p>
                <p className="text-lg font-bold">
                  {getNoteDisplayName(state.active.requiredNoteNumber)}
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-gray-900 rounded border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-muted-foreground mb-1">
                  Last Detected Note
                </p>
                {lastDetectedNote ? (
                  <p className={`text-lg font-bold ${
                    state.detectedCorrectNote
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-600 dark:text-gray-400"
                  }`}>
                    {lastDetectedNote.name}{lastDetectedNote.octave}
                    {state.detectedCorrectNote && (
                      <span className="ml-2">✓ Correct!</span>
                    )}
                  </p>
                ) : (
                  <p className="text-lg font-bold text-gray-400">
                    (No input yet)
                  </p>
                )}
              </div>
            </div>

            {state.detectedCorrectNote && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-900 dark:text-green-400">
                  Correct note detected! Resuming...
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-400">
                No active checkpoint
              </span>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Checkpoints</p>
            <p className="text-2xl font-bold">{checkpoints.length}</p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-center">
            <p className="text-xs text-muted-foreground mb-1">Passed</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {passedCheckpointsRef.current.size}
            </p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-center">
            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
            <p className="text-2xl font-bold">
              {checkpoints.length - passedCheckpointsRef.current.size}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <p className="font-medium">How It Works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Playback automatically pauses when reaching a checkpoint.</li>
            <li>Student must press the required MIDI note to resume.</li>
            <li>Wrong notes are ignored (no automatic resume).</li>
            <li>Resume happens automatically 500ms after correct note.</li>
          </ul>
        </div>

        {/* Limitations Notice */}
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Prototype Limitations:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Single-note matching only (no chords or sequences yet)</li>
              <li>Soundslice controls can bypass checkpoints</li>
              <li>Seeking may cause unpredictable behavior</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
