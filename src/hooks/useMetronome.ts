import { useEffect, useRef, useCallback } from "react";

interface UseMetronomeOptions {
  enabled: boolean;
  bpm: number;
  isNormalMode?: boolean;
}

export const useMetronome = ({ enabled, bpm, isNormalMode = true }: UseMetronomeOptions) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const nextNoteTimeRef = useRef(0);
  const scheduleAheadTimeRef = useRef(0.1); // How far ahead to schedule audio
  const lookAheadTimeRef = useRef(25.0); // How frequently to call scheduling function (ms)
  const lastScheduledTimeRef = useRef(0);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleNote = useCallback((time: number) => {
    if (!audioContextRef.current || !oscillatorRef.current || !gainRef.current) return;

    const audioContext = audioContextRef.current;

    // Create a short beep
    gainRef.current.gain.setTargetAtTime(0.3, time, 0.01);
    gainRef.current.gain.setTargetAtTime(0, time + 0.1, 0.01);
  }, []);

  const scheduler = useCallback(() => {
    if (!audioContextRef.current || !enabled || !isNormalMode) return;

    const audioContext = audioContextRef.current;
    const now = audioContext.currentTime;

    while (nextNoteTimeRef.current < now + scheduleAheadTimeRef.current) {
      scheduleNote(nextNoteTimeRef.current);
      nextNoteTimeRef.current += 60.0 / bpm; // Add one beat
    }
  }, [enabled, bpm, isNormalMode, scheduleNote]);

  // Initialize Web Audio API
  useEffect(() => {
    if (!enabled || !isNormalMode) {
      // Stop metronome
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch (e) {
          // Already stopped
        }
        oscillatorRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.gain.setTargetAtTime(0, audioContextRef.current?.currentTime || 0, 0.01);
      }
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      return;
    }

    // Create audio context if not exists
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.warn("Web Audio API not supported");
        return;
      }
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;

    // Resume context if suspended (required by browsers)
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    // Create oscillator and gain nodes if not exists
    if (!oscillatorRef.current) {
      oscillatorRef.current = audioContext.createOscillator();
      oscillatorRef.current.frequency.value = 1000; // 1kHz beep
      gainRef.current = audioContext.createGain();
      gainRef.current.gain.setValueAtTime(0, audioContext.currentTime);

      oscillatorRef.current.connect(gainRef.current);
      gainRef.current.connect(audioContext.destination);
      oscillatorRef.current.start();
    }

    // Start scheduler
    nextNoteTimeRef.current = audioContext.currentTime;
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
    }
    timerIdRef.current = setInterval(scheduler, lookAheadTimeRef.current);

    return () => {
      // Cleanup happens in next effect when enabled/isNormalMode changes
    };
  }, [enabled, isNormalMode, scheduler]);

  // Stop on unmount
  useEffect(() => {
    return () => {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
      }
    };
  }, []);
};
