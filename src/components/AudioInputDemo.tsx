import { useAudioInput } from "@/hooks/useAudioInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff } from "lucide-react";

/**
 * Example component showing real-time pitch detection
 * This can be integrated into lessons, practice mode, or any interactive feature
 */
export function AudioInputDemo() {
  const { isListening, hasPermission, error, currentNote, start, stop } =
    useAudioInput();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Real-Time Pitch Detection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Status: {isListening ? "🎤 Listening..." : "Idle"}
          </p>
          {error && <p className="text-sm text-red-500">Error: {error}</p>}
        </div>

        {/* Current Note Display */}
        {currentNote && (
          <div className="bg-primary/10 rounded-lg p-4 space-y-2">
            <div className="text-center">
              <p className="text-4xl font-black text-primary">
                {currentNote.noteName}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentNote.frequency.toFixed(1)} Hz (MIDI {currentNote.midiNote})
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-center">
                {currentNote.cents > 0 ? "🔴 Sharp" : currentNote.cents < 0 ? "🔵 Flat" : "✅ Perfect"}
              </p>
              <p className="text-xs text-center text-muted-foreground">
                {Math.abs(currentNote.cents)} cents
                {currentNote.cents > 0 ? " sharp" : currentNote.cents < 0 ? " flat" : ""}
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={start}
            disabled={isListening}
            className="flex-1"
            variant={isListening ? "outline" : "default"}
          >
            <Mic className="w-4 h-4 mr-2" />
            Start
          </Button>
          <Button
            onClick={stop}
            disabled={!isListening}
            variant="destructive"
            className="flex-1"
          >
            <MicOff className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </div>

        {!hasPermission && !isListening && (
          <p className="text-xs text-muted-foreground text-center">
            Click Start to request microphone access
          </p>
        )}
      </CardContent>
    </Card>
  );
}
