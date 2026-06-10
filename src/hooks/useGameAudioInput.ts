import { useEffect, useState, useCallback } from "react";
import { useAudioInput } from "./useAudioInput";
import { audioBridge } from "@/lib/audioBridge";
import { DetectedNote } from "@/lib/audioProcessor";

interface UseGameAudioInputOptions {
  enabled?: boolean;
  gameWindowRef?: React.RefObject<HTMLIFrameElement>;
}

/**
 * Custom hook that bridges audio input to Piano Hero game
 * Automatically sends detected notes to the game
 */
export function useGameAudioInput(options: UseGameAudioInputOptions = {}) {
  const { enabled = true, gameWindowRef } = options;
  const { isListening, hasPermission, error, currentNote, start, stop } =
    useAudioInput({
      onNoteDetected: (note) => {
        if (note) {
          // Send the detected note to the game
          audioBridge.sendNoteToGame({
            midiNote: note.midiNote,
            noteName: note.noteName,
            frequency: note.frequency,
            cents: note.cents,
            confidence: note.confidence,
          });
        } else {
          // Note off
          audioBridge.clearNotes();
        }
      },
    });

  // Set game window when ref is available
  useEffect(() => {
    if (gameWindowRef?.current?.contentWindow) {
      audioBridge.setGameWindow(gameWindowRef.current.contentWindow);
    }
  }, [gameWindowRef]);

  // Update bridge active state
  useEffect(() => {
    audioBridge.setActive(isListening);
  }, [isListening]);

  const startAudioInput = useCallback(async () => {
    await start();
  }, [start]);

  const stopAudioInput = useCallback(async () => {
    await stop();
    audioBridge.setActive(false);
  }, [stop]);

  return {
    isListening,
    hasPermission,
    error,
    currentNote,
    startAudioInput,
    stopAudioInput,
  };
}
