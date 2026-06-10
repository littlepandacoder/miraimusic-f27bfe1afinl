import * as Tone from "tone";

export interface DetectedNote {
  frequency: number;
  midiNote: number;
  noteName: string;
  cents: number; // How many cents off from the correct note (-50 to +50)
  confidence: number; // 0-1 confidence level
}

class AudioProcessor {
  private microphone: Tone.Microphone | null = null;
  private pitchDetector: any = null;
  private isListening = false;
  private onNoteDetected: ((note: DetectedNote | null) => void) | null = null;
  private noteHistory: DetectedNote[] = [];
  private readonly HISTORY_SIZE = 3; // Smooth over 3 frames
  private audioContext: AudioContext | null = null;

  /**
   * Start listening to microphone input
   */
  async start(onNoteDetected: (note: DetectedNote | null) => void) {
    try {
      await Tone.start();
      this.onNoteDetected = onNoteDetected;

      // Create microphone input
      this.microphone = new Tone.Microphone();
      await this.microphone.open();

      this.audioContext = Tone.getContext().rawContext;

      // Create analyser for pitch detection
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 4096; // Good balance between latency and accuracy
      analyser.smoothingTimeConstant = 0.85;

      // Connect microphone to analyser
      const micNode = this.microphone.context.createMediaStreamSource(
        this.microphone.stream
      );
      micNode.connect(analyser);

      // Start detection loop
      this.isListening = true;
      this.detectPitch(analyser);
    } catch (error) {
      console.error("Failed to start audio processor:", error);
    }
  }

  /**
   * Stop listening to microphone
   */
  async stop() {
    this.isListening = false;
    if (this.microphone) {
      await this.microphone.close();
      this.microphone = null;
    }
  }

  /**
   * Core pitch detection loop using autocorrelation (YIN-like algorithm)
   */
  private detectPitch(analyser: AnalyserNode) {
    const bufferSize = analyser.fftSize;
    const buffer = new Uint8Array(bufferSize);

    const detect = () => {
      if (!this.isListening) return;

      analyser.getByteFrequencyData(buffer);

      // Convert to float and normalize
      const floatBuffer = new Float32Array(bufferSize);
      for (let i = 0; i < bufferSize; i++) {
        floatBuffer[i] = (buffer[i] - 128) / 128;
      }

      const frequency = this.autoCorrelate(floatBuffer, 44100);

      if (frequency > 0) {
        const note = this.frequencyToNote(frequency);
        this.noteHistory.push(note);

        // Keep only recent history
        if (this.noteHistory.length > this.HISTORY_SIZE) {
          this.noteHistory.shift();
        }

        // Use median for stability
        const smoothedNote = this.getSmoothedNote();
        if (this.onNoteDetected) {
          this.onNoteDetected(smoothedNote);
        }
      } else {
        if (this.onNoteDetected) {
          this.onNoteDetected(null);
        }
      }

      requestAnimationFrame(detect);
    };

    detect();
  }

  /**
   * Autocorrelation-based pitch detection (similar to YIN)
   * Returns frequency in Hz or -1 if no pitch detected
   */
  private autoCorrelate(buffer: Float32Array, sampleRate: number): number {
    const MAX_SAMPLES = Math.floor(buffer.length / 2);
    let best_offset = -1;
    let best_correlation = 0;
    let rms = 0;

    // Calculate RMS (root mean square) - noise floor
    for (let i = 0; i < MAX_SAMPLES; i++) {
      const val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / MAX_SAMPLES);

    // Not enough signal
    if (rms < 0.01) return -1;

    // Find the best correlation offset
    let lastCorrelation = 1;
    for (let offset = 1; offset < MAX_SAMPLES; offset++) {
      let correlation = 0;
      for (let i = 0; i < MAX_SAMPLES; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset]);
      }
      correlation = 1 - correlation / MAX_SAMPLES;
      if (
        correlation > 0.9 &&
        correlation > lastCorrelation &&
        correlation > best_correlation
      ) {
        best_correlation = correlation;
        best_offset = offset;
      }
      lastCorrelation = correlation;
    }

    if (best_correlation > 0.1) {
      return sampleRate / best_offset;
    }
    return -1;
  }

  /**
   * Convert frequency (Hz) to MIDI note with cents offset
   */
  private frequencyToNote(frequency: number): DetectedNote {
    const A4 = 440;
    const C0 = A4 * Math.pow(2, -4.75);

    const h = 12 * Math.log2(frequency / C0);
    const octave = Math.floor(h / 12);
    const cents = h % 12;
    const midiNote = Math.round(h) + 12;

    // Calculate how many cents off from perfect note
    const nearestMidiNote = Math.round(h);
    const nearestFreq = C0 * Math.pow(2, nearestMidiNote / 12);
    const centsDiff = 1200 * Math.log2(frequency / nearestFreq);

    const noteNames = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const noteName = noteNames[nearestMidiNote % 12] + Math.floor(nearestMidiNote / 12 - 1);

    return {
      frequency: Math.round(frequency * 100) / 100,
      midiNote: Math.max(0, Math.min(127, nearestMidiNote)),
      noteName,
      cents: Math.round(centsDiff),
      confidence: 0.8, // Simplified - could be enhanced with correlation
    };
  }

  /**
   * Get smoothed note from history (median filter)
   */
  private getSmoothedNote(): DetectedNote | null {
    if (this.noteHistory.length === 0) return null;

    // Use median MIDI note for stability
    const midiNotes = this.noteHistory.map((n) => n.midiNote).sort((a, b) => a - b);
    const medianMidiNote = midiNotes[Math.floor(midiNotes.length / 2)];

    // Find and return the note with closest MIDI value
    return this.noteHistory.reduce((closest, current) => {
      if (
        Math.abs(current.midiNote - medianMidiNote) <
        Math.abs(closest.midiNote - medianMidiNote)
      ) {
        return current;
      }
      return closest;
    });
  }

  /**
   * Get microphone permission status
   */
  static async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      // Close the stream immediately - we just need permission
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      return false;
    }
  }
}

export const audioProcessor = new AudioProcessor();
