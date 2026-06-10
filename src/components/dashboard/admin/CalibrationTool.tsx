import { useState, useEffect } from "react";
import { useAudioInput } from "@/hooks/useAudioInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, RotateCcw } from "lucide-react";

// Standard piano notes for testing
const TEST_NOTES = [
  { name: "C4", frequency: 261.63, midi: 60 },
  { name: "D4", frequency: 293.66, midi: 62 },
  { name: "E4", frequency: 329.63, midi: 64 },
  { name: "F4", frequency: 349.23, midi: 65 },
  { name: "G4", frequency: 392.0, midi: 67 },
  { name: "A4", frequency: 440.0, midi: 69 },
  { name: "B4", frequency: 493.88, midi: 71 },
  { name: "C5", frequency: 523.25, midi: 72 },
];

export function CalibrationTool() {
  const { isListening, currentNote, error, start, stop } = useAudioInput();
  const [selectedTestNote, setSelectedTestNote] = useState(TEST_NOTES[5]); // A4 = 440Hz
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [testHistory, setTestHistory] = useState<
    { expected: string; detected: string; error: number }[]
  >([]);
  const [isTestActive, setIsTestActive] = useState(false);

  // Calculate accuracy when note is detected
  useEffect(() => {
    if (!currentNote || !isTestActive) return;

    const expectedFreq = selectedTestNote.frequency;
    const detectedFreq = currentNote.frequency;
    const errorHz = Math.abs(expectedFreq - detectedFreq);
    const errorPercent = (errorHz / expectedFreq) * 100;

    setAccuracy(errorPercent);

    // If very close, add to history
    if (errorPercent < 2) {
      setTestHistory((prev) => [
        {
          expected: selectedTestNote.name,
          detected: currentNote.noteName,
          error: errorPercent,
        },
        ...prev.slice(0, 9), // Keep last 10
      ]);
    }
  }, [currentNote, isTestActive, selectedTestNote]);

  const handleStartTest = async () => {
    setIsTestActive(true);
    await start();
  };

  const handleStopTest = async () => {
    setIsTestActive(false);
    await stop();
    setAccuracy(null);
  };

  const handleReset = () => {
    setTestHistory([]);
    setAccuracy(null);
  };

  const averageError =
    testHistory.length > 0
      ? testHistory.reduce((sum, t) => sum + t.error, 0) / testHistory.length
      : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Calibration Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Expected Note Selector */}
            <div className="space-y-2">
              <Label>Expected Note</Label>
              <div className="grid grid-cols-4 gap-2">
                {TEST_NOTES.map((note) => (
                  <Button
                    key={note.midi}
                    variant={selectedTestNote.midi === note.midi ? "default" : "outline"}
                    onClick={() => setSelectedTestNote(note)}
                    className="text-sm"
                  >
                    {note.name}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedTestNote.name} = {selectedTestNote.frequency}Hz
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
                <p className="text-sm">
                  Listening: {isTestActive ? "🔴 Active" : "⚪ Inactive"}
                </p>
                {error && <p className="text-xs text-red-500">Error: {error}</p>}
                {accuracy !== null && (
                  <p className="text-sm font-semibold">
                    Accuracy: {accuracy < 1 ? "✅ Perfect" : `${accuracy.toFixed(2)}% off`}
                  </p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                onClick={handleStartTest}
                disabled={isTestActive}
                className="flex-1"
              >
                <Mic className="w-4 h-4 mr-2" />
                Start Test
              </Button>
              <Button
                onClick={handleStopTest}
                disabled={!isTestActive}
                variant="destructive"
                className="flex-1"
              >
                <MicOff className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </div>

            {/* Reset */}
            <Button onClick={handleReset} variant="outline" className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          </CardContent>
        </Card>

        {/* Right: Real-time Detection */}
        <Card>
          <CardHeader>
            <CardTitle>Real-Time Detection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentNote && isTestActive ? (
              <div className="space-y-4">
                {/* Detected Note */}
                <div className="bg-primary/10 rounded-lg p-4 text-center">
                  <p className="text-4xl font-black text-primary">
                    {currentNote.noteName}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentNote.frequency.toFixed(2)} Hz
                  </p>
                </div>

                {/* Tuning Indicator */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Flat</span>
                    <span>Perfect</span>
                    <span>Sharp</span>
                  </div>
                  <div className="w-full h-8 bg-secondary rounded-lg relative overflow-hidden">
                    {/* Indicator */}
                    <div
                      className={`absolute h-full w-1 transition-all ${
                        Math.abs(currentNote.cents) < 5 ? "bg-green-500" : "bg-yellow-500"
                      }`}
                      style={{
                        left: `${50 + (currentNote.cents / 50) * 50}%`,
                        transform: "translateX(-50%)",
                      }}
                    />
                  </div>
                  <p className="text-xs text-center">
                    {currentNote.cents > 0 ? "🔴 Sharp" : currentNote.cents < 0 ? "🔵 Flat" : "✅ Perfect"}
                    {" "}{Math.abs(currentNote.cents)} cents
                  </p>
                </div>

                {/* Confidence */}
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan transition-all"
                      style={{ width: `${currentNote.confidence * 100}%` }}
                    />
                  </div>
                  <p className="text-xs mt-1">{(currentNote.confidence * 100).toFixed(0)}%</p>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                {isTestActive ? "Waiting for input..." : "Click Start Test to begin"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test History */}
      <Card>
        <CardHeader>
          <CardTitle>Test History</CardTitle>
        </CardHeader>
        <CardContent>
          {testHistory.length > 0 ? (
            <div className="space-y-3">
              <div className="bg-secondary/50 rounded-lg p-3 mb-3">
                <p className="text-sm">
                  Average Error: <span className="font-bold">{averageError?.toFixed(2)}%</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Successful detections: {testHistory.length}
                </p>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {testHistory.map((test, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 bg-secondary/30 rounded">
                    <span>
                      Expected: <span className="font-semibold">{test.expected}</span> → Detected:{" "}
                      <span className="font-semibold">{test.detected}</span>
                    </span>
                    <span
                      className={
                        test.error < 1
                          ? "text-green-500"
                          : test.error < 2
                          ? "text-yellow-500"
                          : "text-orange-500"
                      }
                    >
                      {test.error.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No detections yet. Start the test and play notes to see results.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Calibrate</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <ol className="list-decimal list-inside space-y-1">
            <li>Select a test note (A4 = 440Hz is the standard)</li>
            <li>Click "Start Test"</li>
            <li>Play or sing the selected note into your microphone</li>
            <li>Watch the real-time detection and tuning indicator</li>
            <li>Check if detected note matches expected note</li>
            <li>If accuracy is low, check microphone and environment</li>
            <li>Test multiple notes for comprehensive calibration</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
