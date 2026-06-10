import { useEffect, useState, useCallback } from "react";
import { audioProcessor, DetectedNote } from "@/lib/audioProcessor";

interface UseAudioInputOptions {
  onNoteDetected?: (note: DetectedNote | null) => void;
  autoStart?: boolean;
}

export function useAudioInput(options: UseAudioInputOptions = {}) {
  const { onNoteDetected, autoStart = false } = options;
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<DetectedNote | null>(null);

  const start = useCallback(async () => {
    try {
      setError(null);
      const hasPermission = await audioProcessor.requestMicrophonePermission();

      if (!hasPermission) {
        setError("Microphone permission denied");
        return;
      }

      setHasPermission(true);

      await audioProcessor.start((note) => {
        setCurrentNote(note);
        onNoteDetected?.(note);
      });

      setIsListening(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("Failed to start audio input:", err);
    }
  }, [onNoteDetected]);

  const stop = useCallback(async () => {
    try {
      await audioProcessor.stop();
      setIsListening(false);
      setCurrentNote(null);
    } catch (err) {
      console.error("Failed to stop audio input:", err);
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      start();
      return () => {
        stop();
      };
    }
  }, [autoStart, start, stop]);

  return {
    isListening,
    hasPermission,
    error,
    currentNote,
    start,
    stop,
  };
}
