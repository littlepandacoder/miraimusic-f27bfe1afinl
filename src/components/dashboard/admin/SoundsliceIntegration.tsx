import { useState, useRef, useEffect } from "react";
import { SoundslicePlayer } from "./soundslice/SoundslicePlayer";
import { PlayerControls } from "./soundslice/PlayerControls";
import { MidiDeviceManager } from "./soundslice/MidiDeviceManager";
import { CheckpointEditor, Checkpoint } from "./soundslice/CheckpointEditor";
import { CheckpointEngine } from "./soundslice/CheckpointEngine";
import { IntegrationDiagnostics } from "./soundslice/IntegrationDiagnostics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music } from "lucide-react";

interface MidiNote {
  number: number;
  name: string;
  octave: number;
}

const SoundsliceIntegration = () => {
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([
    { id: "cp-demo-1", timestamp: 5, requiredNoteNumber: 60, label: "Demo: C4" },
    { id: "cp-demo-2", timestamp: 10, requiredNoteNumber: 62, label: "Demo: D4" },
    { id: "cp-demo-3", timestamp: 15, requiredNoteNumber: 64, label: "Demo: E4" },
  ]);
  const [checkpointsEnabled, setCheckpointsEnabled] = useState(false);
  const [lastDetectedNote, setLastDetectedNote] = useState<MidiNote | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [midiSupported, setMidiSupported] = useState(false);
  const [midiConnected, setMidiConnected] = useState(false);

  const currentTimeRef = useRef(0);

  // Monitor iframe API connection
  useEffect(() => {
    if (!iframe) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.soundslice.com") return;
      if (event.source !== iframe.contentWindow) return;

      const data = event.data;

      if (data.method === "player.readyState" && data.value === "ready") {
        setApiConnected(true);
      }

      if (data.method === "player.currentTimeInSeconds") {
        currentTimeRef.current = data.value;
        setCurrentTime(data.value);
      }

      if (data.method === "player.isPlaying") {
        setIsPlaying(data.value);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [iframe]);

  // Periodically query playback position for checkpoint monitoring
  useEffect(() => {
    if (!iframe?.contentWindow || !checkpointsEnabled) return;

    const interval = setInterval(() => {
      iframe.contentWindow.postMessage(
        { command: "player.getCurrentTimeInSeconds" },
        "https://www.soundslice.com"
      );
    }, 200); // 200ms for responsive checkpoint detection

    return () => clearInterval(interval);
  }, [iframe, checkpointsEnabled]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2 mb-2">
          <Music className="w-8 h-8 text-primary" />
          Soundslice Integration
        </h2>
        <p className="text-muted-foreground">
          Embed and test interactive piano lessons with MIDI keyboard integration and checkpoint-based learning.
        </p>
      </div>

      {/* Section 1: Soundslice Player */}
      <SoundslicePlayer
        sliceId="yLjwc"
        onPlayerReady={(frame) => {
          setIframe(frame);
          setIframeLoaded(true);
        }}
        onError={() => setIframeLoaded(false)}
      />

      {/* Section 2: Player Controls */}
      {iframeLoaded && <PlayerControls iframe={iframe} />}

      {/* Section 3: Two-column layout for MIDI and Checkpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MIDI Keyboard */}
        <MidiDeviceManager
          onNoteDetected={(note) => {
            setLastDetectedNote(note);
            setMidiConnected(true);
            setMidiSupported(true);
          }}
        />

        {/* Checkpoint Configuration */}
        <CheckpointEditor
          checkpoints={checkpoints}
          onCheckpointsChange={setCheckpoints}
          isEnabled={checkpointsEnabled}
          onEnabledChange={setCheckpointsEnabled}
        />
      </div>

      {/* Section 4: Checkpoint Engine Status */}
      {checkpointsEnabled && (
        <CheckpointEngine
          checkpoints={checkpoints}
          isEnabled={checkpointsEnabled}
          currentTime={currentTime}
          isPlaying={isPlaying}
          lastDetectedNote={lastDetectedNote}
          iframe={iframe}
          onPause={() => {
            setIsPlaying(false);
          }}
        />
      )}

      {/* Section 5: Integration Diagnostics */}
      <IntegrationDiagnostics
        iframeLoaded={iframeLoaded}
        apiConnected={apiConnected}
        midiSupported={midiSupported}
        midiConnected={midiConnected}
        checkpointsEnabled={checkpointsEnabled}
        checkpointCount={checkpoints.length}
      />

      {/* Documentation Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <p className="font-medium">1. Load the Lesson</p>
            <p className="text-muted-foreground">
              The Soundslice embedded player above displays your lesson (Slice ID: yLjwc).
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-medium">2. Connect Your MIDI Keyboard</p>
            <p className="text-muted-foreground">
              Click "Connect MIDI Keyboard" in the MIDI Keyboard section. Your browser will request permission.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-medium">3. Configure Checkpoints (Optional)</p>
            <p className="text-muted-foreground">
              We've pre-loaded three demo checkpoints. You can edit or add your own by specifying a timestamp and required MIDI note.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-medium">4. Enable Checkpoint Testing</p>
            <p className="text-muted-foreground">
              Toggle the "Enabled" button on the Checkpoint Editor to activate MIDI-gated playback.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-medium">5. Play the Lesson</p>
            <p className="text-muted-foreground">
              Press Play in the Player Controls. When playback reaches a checkpoint, it will automatically pause.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-medium">6. Play the Required Note</p>
            <p className="text-muted-foreground">
              Press the required MIDI key on your keyboard. If correct, playback resumes automatically. Wrong notes are ignored.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Limitations & Notes */}
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-400">
            ⚠️ Prototype Limitations & Implementation Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-amber-800 dark:text-amber-300">
          <div>
            <p className="font-medium mb-1">Checkpoint Triggering:</p>
            <p className="text-xs">
              Uses a 500ms time tolerance window to detect when playback reaches a checkpoint. Checkpoints are tracked to prevent duplicate triggering.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">MIDI Detection:</p>
            <p className="text-xs">
              Uses the Web MIDI API to detect note-on/note-off events. Note-on with velocity 0 is treated as note-off. Web MIDI is supported in Chrome, Edge, and Opera.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">Single-Note Matching:</p>
            <p className="text-xs">
              Currently supports single MIDI notes only. Chord detection, sequences, and rhythm validation are not yet implemented.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">Soundslice Controls:</p>
            <p className="text-xs">
              Users can bypass checkpoints using Soundslice's native play/pause controls. This is a documented limitation of using the embedded player API.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">Seeking Behavior:</p>
            <p className="text-xs">
              When seeking beyond a checkpoint, the checkpoint state resets. Seeking backwards may cause unpredictable behavior with checkpoint tracking.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">API Communication:</p>
            <p className="text-xs">
              Communication with Soundslice uses window.postMessage with origin validation. API calls are asynchronous; timing assumptions are avoided.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SoundsliceIntegration;
