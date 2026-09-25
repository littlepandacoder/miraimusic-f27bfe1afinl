import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Music, Play, Pause, Download, Trash2, Undo2 } from "lucide-react";

interface Note {
  pitch: string;
  duration: number;
  startTime: number;
}

interface NotationEditorProps {
  onSave: (musicxml: string) => void;
  onCancel: () => void;
}

const NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"];
const OCTAVES = [2, 3, 4, 5, 6];
const DURATIONS = [
  { label: "Whole", value: 4, symbol: "𝅗𝅥" },
  { label: "Half", value: 2, symbol: "𝅗𝅥" },
  { label: "Quarter", value: 1, symbol: "♩" },
  { label: "Eighth", value: 0.5, symbol: "♪" },
  { label: "Sixteenth", value: 0.25, symbol: "𝅘𝅥𝅮" },
];

const PIANO_KEYS = [
  ...OCTAVES.flatMap((octave) =>
    NOTE_NAMES.map((note) => `${note}${octave}`)
  ),
];

export const NotationEditor = ({ onSave, onCancel }: NotationEditorProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelinePosition, setTimelinePosition] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const noteToFrequency = (noteName: string): number => {
    const noteMap: Record<string, number> = {
      C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
    };
    const match = noteName.match(/([A-G])(\d)/);
    if (!match) return 440;
    const note = match[1];
    const octave = parseInt(match[2]);
    const semitone = noteMap[note] + (octave - 4) * 12;
    return 440 * Math.pow(2, semitone / 12);
  };

  const addNote = (noteName: string) => {
    const startTime = notes.reduce((sum, n) => sum + n.duration, 0);
    const newNote: Note = {
      pitch: noteName,
      duration: selectedDuration,
      startTime,
    };
    setNotes([...notes, newNote]);
    toast({
      title: "Note added",
      description: `${noteName} (${selectedDuration})`
    });
    playNoteSound(noteName, 0.3);
  };

  const playNoteSound = (noteName: string, duration: number) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = noteToFrequency(noteName);
    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  };

  const playComposition = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    setIsPlaying(true);
    const ctx = audioContextRef.current;
    const startTime = ctx.currentTime;

    for (const note of notes) {
      const noteStartTime = startTime + note.startTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.value = noteToFrequency(note.pitch);
      osc.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0.15, noteStartTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteStartTime + note.duration);

      osc.start(noteStartTime);
      osc.stop(noteStartTime + note.duration);
    }

    const totalDuration = notes.reduce((sum, n) => sum + n.duration, 0);
    setTimeout(() => setIsPlaying(false), totalDuration * 1000);
  };

  const generateMusicXML = (): string => {
    if (notes.length === 0) {
      toast({ title: "Error", description: "Add notes before saving", variant: "destructive" });
      return "";
    }

    const divisions = 4;
    const notesXml = notes
      .map((note) => {
        const match = note.pitch.match(/([A-G])(#?)(\d)/);
        if (!match) return "";
        const [, pitch, accidental, octave] = match;
        const duration = Math.round(note.duration * divisions);

        return `
      <note>
        <pitch>
          <step>${pitch}</step>
          ${accidental === "#" ? "<alter>1</alter>" : ""}
          <octave>${octave}</octave>
        </pitch>
        <duration>${duration}</duration>
        <type>${getDurationType(note.duration)}</type>
      </note>`;
      })
      .join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
      <score-instrument id="P1-I1">
        <instr-name>Piano</instr-name>
      </score-instrument>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      ${notesXml}
    </measure>
  </part>
</score-partwise>`;
  };

  const getDurationType = (duration: number): string => {
    const types: Record<number, string> = {
      4: "whole",
      2: "half",
      1: "quarter",
      0.5: "eighth",
      0.25: "sixteenth",
    };
    return types[duration] || "quarter";
  };

  const handleSave = () => {
    const musicxml = generateMusicXML();
    if (musicxml) {
      onSave(musicxml);
    }
  };

  const removeNote = (index: number) => {
    setNotes(notes.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setNotes([]);
    toast({ title: "Cleared", description: "All notes removed" });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Music Notation Editor
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Create sheet music by selecting notes and durations
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Duration Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Note Duration</label>
            <div className="grid grid-cols-5 gap-2">
              {DURATIONS.map((dur) => (
                <Button
                  key={dur.value}
                  variant={selectedDuration === dur.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDuration(dur.value)}
                  className="flex flex-col items-center"
                >
                  <span className="text-lg">{dur.symbol}</span>
                  <span className="text-xs">{dur.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Piano Keyboard */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Note</label>
            <div className="grid grid-cols-7 gap-1 p-3 bg-secondary rounded-lg">
              {PIANO_KEYS.map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant="outline"
                  onClick={() => addNote(key)}
                  className="h-10 text-xs font-semibold"
                >
                  {key}
                </Button>
              ))}
            </div>
          </div>

          {/* Staff Display (Simple representation) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sheet Music</label>
            <div className="p-4 bg-secondary rounded-lg border border-border min-h-32">
              {notes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Add notes from the piano keyboard above to see them here
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {notes.map((note, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 bg-primary/10 border border-primary rounded-lg flex items-center gap-2"
                      >
                        <span className="font-semibold">{note.pitch}</span>
                        <span className="text-xs text-muted-foreground">
                          {DURATIONS.find((d) => d.value === note.duration)?.label}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNote(idx)}
                          className="h-5 w-5 p-0"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Total duration: {notes.reduce((sum, n) => sum + n.duration, 0)} beats
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex gap-2">
            <Button
              onClick={playComposition}
              disabled={notes.length === 0 || isPlaying}
              className="flex-1"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Playing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Play Composition
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={clearAll}
              disabled={notes.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={notes.length === 0}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Save as MusicXML
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
