import { useEffect, useRef, useCallback, useState } from "react";

interface UseMetronomeOptions {
  enabled: boolean;
  bpm: number;
  isNormalMode?: boolean;
  countoffBars?: number;
  onCountoffComplete?: () => void;
}

export const useMetronomeWithCountoff = ({
  enabled,
  bpm,
  isNormalMode = true,
  countoffBars = 8,
  onCountoffComplete,
}: UseMetronomeOptions) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const nextNoteTimeRef = useRef(0);
  const scheduleAheadTimeRef = useRef(0.1);
  const lookAheadTimeRef = useRef(25.0);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const currentBeatRef = useRef(0);
  const totalBeatsRef = useRef(countoffBars * 4); // 4 beats per bar
  const isCountoffRef = useRef(true);
  const [currentBar, setCurrentBar] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);

  const playBeep = useCallback((time: number, frequency: number = 1000, duration: number = 0.1) => {
    if (!audioContextRef.current || !oscillatorRef.current || !gainRef.current) return;

    oscillatorRef.current.frequency.setTargetAtTime(frequency, time, 0.01);
    gainRef.current.gain.setTargetAtTime(0.3, time, 0.01);
    gainRef.current.gain.setTargetAtTime(0, time + duration, 0.01);
  }, []);

  const scheduleNote = useCallback((time: number, beatInBar: number) => {
    if (!audioContextRef.current || !enabled || !isNormalMode) return;

    // Bar beat (1st beat) - higher pitch, longer duration
    if (beatInBar === 0) {
      playBeep(time, 1200, 0.15);
    } else {
      // Regular beats - standard pitch
      playBeep(time, 1000, 0.1);
    }

    // Update visual progress
    const barNumber = Math.floor(currentBeatRef.current / 4);
    const beatInCurrentBar = currentBeatRef.current % 4;
    setCurrentBar(barNumber + 1); // 1-indexed for display
    setCurrentBeat(beatInCurrentBar + 1);

    currentBeatRef.current++;

    // Check if count-off is complete
    if (currentBeatRef.current >= totalBeatsRef.current && isCountoffRef.current) {
      isCountoffRef.current = false;
      onCountoffComplete?.();
      console.log("[Metronome] Count-off complete, game can start");
    }
  }, [enabled, isNormalMode, playBeep, onCountoffComplete]);

  const scheduler = useCallback(() => {
    if (!audioContextRef.current || !enabled || !isNormalMode) return;

    const audioContext = audioContextRef.current;
    const now = audioContext.currentTime;

    while (nextNoteTimeRef.current < now + scheduleAheadTimeRef.current) {
      const beatInBar = (currentBeatRef.current % 4);
      scheduleNote(nextNoteTimeRef.current, beatInBar);
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

    // Resume context if suspended
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    // Create oscillator and gain nodes if not exists
    if (!oscillatorRef.current) {
      oscillatorRef.current = audioContext.createOscillator();
      oscillatorRef.current.frequency.value = 1000;
      gainRef.current = audioContext.createGain();
      gainRef.current.gain.setValueAtTime(0, audioContext.currentTime);

      oscillatorRef.current.connect(gainRef.current);
      gainRef.current.connect(audioContext.destination);
      oscillatorRef.current.start();
    }

    // Reset for new count-off
    currentBeatRef.current = 0;
    isCountoffRef.current = true;
    nextNoteTimeRef.current = audioContext.currentTime;

    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
    }
    timerIdRef.current = setInterval(scheduler, lookAheadTimeRef.current);

    return () => {
      // Cleanup happens in next effect when enabled/isNormalMode changes
    };
  }, [enabled, isNormalMode, countoffBars, scheduler]);

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

  return { currentBar, currentBeat, isCountingOff: isCountoffRef.current };
};
