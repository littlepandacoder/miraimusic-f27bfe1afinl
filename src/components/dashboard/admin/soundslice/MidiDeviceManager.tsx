import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Music, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

interface MidiNote {
  number: number;
  name: string;
  octave: number;
}

interface MidiDeviceManagerProps {
  onNoteDetected?: (note: MidiNote) => void;
}

export const MidiDeviceManager = ({ onNoteDetected }: MidiDeviceManagerProps) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<WebMidi.MIDIInput[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<WebMidi.MIDIInput | null>(null);
  const [lastNote, setLastNote] = useState<MidiNote | null>(null);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const midiAccessRef = useRef<WebMidi.MIDIAccess | null>(null);

  // Check for Web MIDI support
  useEffect(() => {
    const checkWebMidiSupport = async () => {
      if (!navigator.requestMIDIAccess) {
        setIsSupported(false);
        setError(
          "Web MIDI API is not supported in your browser. Try Chrome, Edge, or Opera."
        );
        return;
      }
      setIsSupported(true);
    };

    checkWebMidiSupport();
  }, []);

  // Request MIDI access
  const handleConnectMidi = useCallback(async () => {
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      midiAccessRef.current = midiAccess;
      setError(null);

      // Get input devices
      const inputs = Array.from(midiAccess.inputs.values());
      setDevices(inputs);

      if (inputs.length === 0) {
        setError("No MIDI input devices found. Connect a MIDI keyboard and try again.");
        return;
      }

      // Auto-select first device
      if (inputs.length > 0) {
        selectDevice(inputs[0]);
      }

      toast({ title: "MIDI Access granted", description: `Found ${inputs.length} device(s)` });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Permission denied";
      setError(`MIDI access denied: ${errorMsg}`);
      setIsConnected(false);
    }
  }, []);

  // Select a MIDI device
  const selectDevice = useCallback((device: WebMidi.MIDIInput) => {
    // Remove old listener
    if (selectedDevice) {
      selectedDevice.onmidimessage = null;
    }

    // Add listener to new device
    device.onmidimessage = (msg: WebMidi.MIDIMessageEvent) => {
      const [status, note, velocity] = msg.data;

      // Note On (0x90) or Note Off (0x80)
      const isNoteOn = (status & 0xf0) === 0x90 && velocity > 0;
      const isNoteOff = (status & 0xf0) === 0x80 || ((status & 0xf0) === 0x90 && velocity === 0);

      if (isNoteOn) {
        const midiNote: MidiNote = {
          number: note,
          name: NOTE_NAMES[note % 12],
          octave: Math.floor(note / 12) - 1,
        };

        setLastNote(midiNote);
        setActiveNotes(prev => new Set(prev).add(note));

        if (onNoteDetected) {
          onNoteDetected(midiNote);
        }
      }

      if (isNoteOff) {
        setActiveNotes(prev => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
      }
    };

    setSelectedDevice(device);
    setIsConnected(true);
    setError(null);
    toast({ title: "MIDI device connected", description: device.name });
  }, [selectedDevice, onNoteDetected]);

  const getMidiNoteName = (note: MidiNote) => `${note.name}${note.octave}`;

  if (!isSupported) {
    return (
      <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            MIDI Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-800 dark:text-red-300">
            {error || "Web MIDI API is not supported in your browser."}
          </p>
          <p className="text-xs text-red-700 dark:text-red-400 mt-2">
            Supported browsers: Google Chrome, Microsoft Edge, Opera
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            MIDI Keyboard
          </span>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                  Connected
                </Badge>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <Badge variant="outline">Disconnected</Badge>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-xs text-muted-foreground mb-1">Connection Status</p>
            <p className="font-semibold">{isConnected ? "✓ Connected" : "✗ Disconnected"}</p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-xs text-muted-foreground mb-1">Devices Found</p>
            <p className="font-semibold">{devices.length}</p>
          </div>
        </div>

        {/* Connect Button */}
        <Button
          onClick={handleConnectMidi}
          disabled={!isSupported || isConnected}
          className="w-full"
        >
          {isConnected ? "✓ MIDI Connected" : "Connect MIDI Keyboard"}
        </Button>

        {/* Device Selection */}
        {devices.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Device</label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {devices.map((device, idx) => (
                <button
                  key={idx}
                  onClick={() => selectDevice(device)}
                  className={`w-full px-3 py-2 text-xs text-left rounded border transition-colors ${
                    selectedDevice?.id === device.id
                      ? "bg-primary border-primary text-white"
                      : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {device.name || `Device ${idx + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Last Note */}
        {lastNote && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <p className="text-xs text-muted-foreground mb-2">Last Note Detected</p>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-blue-900 dark:text-blue-400">
                {getMidiNoteName(lastNote)}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                MIDI #{lastNote.number}
              </span>
            </div>
          </div>
        )}

        {/* Active Notes Visualization */}
        {activeNotes.size > 0 && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
            <p className="text-xs text-muted-foreground mb-2">Active Keys</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(activeNotes)
                .sort()
                .map((noteNum) => {
                  const name = NOTE_NAMES[noteNum % 12];
                  const octave = Math.floor(noteNum / 12) - 1;
                  return (
                    <Badge key={noteNum} className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                      {name}{octave}
                    </Badge>
                  );
                })}
            </div>
          </div>
        )}

        {/* Piano Keyboard Visualization */}
        <div className="space-y-2">
          <p className="text-xs font-medium">Piano Keyboard (C3-B5)</p>
          <div className="bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto">
            <div className="flex gap-0.5 min-w-fit">
              {Array.from({ length: 36 }).map((_, i) => {
                const noteNum = 48 + i; // C3 to B5
                const noteName = NOTE_NAMES[noteNum % 12];
                const isBlack = [1, 3, 6, 8, 10].includes(noteNum % 12);
                const isActive = activeNotes.has(noteNum);

                return (
                  <div
                    key={noteNum}
                    className={`transition-colors ${
                      isBlack
                        ? `w-3 h-12 rounded-b border border-gray-400 ${
                            isActive ? "bg-purple-600" : "bg-black"
                          }`
                        : `w-4 h-16 rounded-b border border-gray-400 ${
                            isActive ? "bg-purple-400" : "bg-white"
                          }`
                    }`}
                    title={`${noteName}${Math.floor(noteNum / 12) - 1}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-300">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
