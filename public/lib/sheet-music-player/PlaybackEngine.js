/**
 * PlaybackEngine.js
 *
 * Manages Tone.js audio playback for both Normal and Wait modes.
 * All audio timing goes through Tone.Transport for precise scheduling.
 * Emits events for UI subscription: checkpointPassed, cursorMoved, songEnded, wrongNote
 */

export class PlaybackEngine {
  constructor(timeline, options = {}) {
    this.timeline = timeline;
    this.mode = options.mode ?? 'normal'; // 'normal' or 'wait'
    this.baseTempoPercent = options.tempoPercent ?? 100; // 50-120%
    this.playMelody = options.playMelody ?? false; // Play student part audio

    this.isPlaying = false;
    this.currentCheckpointIndex = 0;
    this.currentTime = 0;

    // Tone.js setup
    this.sampler = null;
    this.backingTrackNodes = [];

    // Event emitter pattern
    this.listeners = {};

    // Initialize Tone.Transport
    this._initToneTransport();
  }

  /**
   * Initialize Tone.js Transport
   */
  async _initToneTransport() {
    try {
      await Tone.start();

      // Load piano sampler (Salamander samples)
      this.sampler = new Tone.Sampler({
        urls: {
          A0: "A0.[mp3|ogg]",
          C1: "C1.[mp3|ogg]",
          "D#1": "Ds1.[mp3|ogg]",
          "F#1": "Fs1.[mp3|ogg]",
          B1: "B1.[mp3|ogg]",
          "D#2": "Ds2.[mp3|ogg]",
          "F#2": "Fs2.[mp3|ogg]",
          B2: "B2.[mp3|ogg]",
          "D#3": "Ds3.[mp3|ogg]",
          "F#3": "Fs3.[mp3|ogg]",
          B3: "B3.[mp3|ogg]",
          "D#4": "Ds4.[mp3|ogg]",
          "F#4": "Fs4.[mp3|ogg]",
          B4: "B4.[mp3|ogg]",
          "D#5": "Ds5.[mp3|ogg]",
          "F#5": "Fs5.[mp3|ogg]",
          B5: "B5.[mp3|ogg]",
          "D#6": "Ds6.[mp3|ogg]",
          "F#6": "Fs6.[mp3|ogg]",
          B6: "B6.[mp3|ogg]",
          "D#7": "Ds7.[mp3|ogg]",
          "F#7": "Fs7.[mp3|ogg]",
          C8: "C8.[mp3|ogg]"
        },
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        onload: () => console.log('[PlaybackEngine] Piano samples loaded')
      }).toDestination();

      console.log('[PlaybackEngine] Tone.js initialized');
    } catch (error) {
      console.error('[PlaybackEngine] Failed to initialize Tone.js:', error);
    }
  }

  /**
   * Play a song (Normal mode: continuous playback)
   */
  playNormal() {
    if (this.isPlaying) return;

    this.mode = 'normal';
    this.isPlaying = true;
    this.currentCheckpointIndex = 0;
    this.currentTime = 0;

    // Start transport
    Tone.Transport.bpm.value = this._getAdjustedBpm();
    Tone.Transport.start();

    // Schedule checkpoint callbacks
    this._scheduleNormalMode();

    // Schedule cursor updates via Tone.Draw for sync
    this._scheduleCursorUpdates();

    this._emit('playStarted', { mode: 'normal' });
  }

  /**
   * Play in Wait mode (pause at each checkpoint, advance on correct input)
   */
  async playWait() {
    if (this.isPlaying) return;

    this.mode = 'wait';
    this.isPlaying = true;
    this.currentCheckpointIndex = 0;

    Tone.Transport.bpm.value = this._getAdjustedBpm();
    Tone.Transport.start();

    // In wait mode, we process checkpoints sequentially
    await this._processWaitMode();
  }

  /**
   * Pause playback
   */
  pause() {
    this.isPlaying = false;
    Tone.Transport.pause();
    this._emit('paused');
  }

  /**
   * Resume playback
   */
  resume() {
    if (this.mode === 'normal') {
      this.playNormal();
    } else {
      this.playWait();
    }
  }

  /**
   * Stop and reset to start
   */
  stop() {
    this.isPlaying = false;
    Tone.Transport.stop();
    Tone.Transport.cancel(); // Clear all scheduled events
    this.currentCheckpointIndex = 0;
    this.currentTime = 0;
    this._emit('stopped');
  }

  /**
   * Set tempo as percentage (50-120%)
   */
  setTempo(percent) {
    this.baseTempoPercent = Math.max(50, Math.min(120, percent));
    Tone.Transport.bpm.value = this._getAdjustedBpm();
  }

  /**
   * Get adjusted BPM based on tempo percent
   */
  _getAdjustedBpm() {
    const baseBpm = this.timeline.baseBpm || 120;
    return (baseBpm * this.baseTempoPercent) / 100;
  }

  /**
   * Schedule callbacks for Normal mode
   */
  _scheduleNormalMode() {
    for (let i = 0; i < this.timeline.checkpoints.length; i++) {
      const cp = this.timeline.checkpoints[i];
      const delaySeconds = this._adjustTimeForTempo(cp.time);

      // Schedule checkpoint callback
      Tone.Transport.schedule((time) => {
        this.currentCheckpointIndex = i;
        this._emit('checkpointReached', { checkpoint: cp, index: i });

        // Play backing track events for this checkpoint
        if (cp.backingEvents.length > 0) {
          this._playBackingEvents(cp.backingEvents, time);
        }

        // Optionally play student part (melody)
        if (this.playMelody) {
          this._playMelodyNotes(cp.expectedNotes, time);
        }
      }, delaySeconds);
    }

    // Schedule song end
    const endTime = this._adjustTimeForTempo(this.timeline.totalTime);
    Tone.Transport.schedule(() => {
      this.isPlaying = false;
      this._emit('songEnded');
    }, endTime + 0.1);
  }

  /**
   * Process checkpoints sequentially in Wait mode
   */
  async _processWaitMode() {
    for (let i = 0; i < this.timeline.checkpoints.length; i++) {
      if (!this.isPlaying) break;

      const cp = this.timeline.checkpoints[i];
      this.currentCheckpointIndex = i;

      // Emit checkpoint reached
      this._emit('checkpointReached', { checkpoint: cp, index: i });

      // Wait for student input
      const studentPlayed = await this._waitForStudentInput(cp);

      if (studentPlayed) {
        // Play backing track events between this checkpoint and next
        if (cp.backingEvents.length > 0) {
          await this._playBackingEventsAsync(cp.backingEvents);
        }

        this._emit('checkpointPassed', { checkpoint: cp, index: i });
      } else {
        this._emit('checkpointFailed', { checkpoint: cp, index: i });
        // In wait mode, allow retry or skip
      }

      // Move to next checkpoint
      await this._delay(100);
    }

    this.isPlaying = false;
    this._emit('songEnded');
  }

  /**
   * Wait for student to play the expected notes
   */
  _waitForStudentInput(checkpoint) {
    return new Promise((resolve) => {
      const expectedSet = new Set(checkpoint.expectedNotes);
      const heldNotes = new Set();
      let timeout;

      const checkComplete = () => {
        const allHeld = Array.from(expectedSet).every(n => heldNotes.has(n));
        if (allHeld) {
          cleanup();
          resolve(true);
        }
      };

      const onMidiNote = (event) => {
        if (event.type === 'noteOn') {
          heldNotes.add(event.midi);
          checkComplete();
        } else if (event.type === 'noteOff') {
          heldNotes.delete(event.midi);
        } else if (event.type === 'wrongNote') {
          this._emit('wrongNote', event);
        }
      };

      const cleanup = () => {
        this.removeListener('midiInput', onMidiNote);
        clearTimeout(timeout);
      };

      // Set timeout for checkpoint (e.g., 30 seconds max)
      timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, 30000);

      this.on('midiInput', onMidiNote);
    });
  }

  /**
   * Play backing track events
   */
  _playBackingEvents(events, startTime) {
    for (const event of events) {
      const scheduleTime = startTime + event.deltaFromCheckpoint;

      if (event.type === 'noteOn' && event.velocity > 0) {
        this.sampler.triggerAttack(
          Tone.Midi(event.midi).toFrequency(),
          Tone.now()
        );
      } else if (event.type === 'noteOff' || event.velocity === 0) {
        this.sampler.triggerRelease(
          Tone.Midi(event.midi).toFrequency(),
          Tone.now()
        );
      }
    }
  }

  /**
   * Play backing events asynchronously (for Wait mode)
   */
  async _playBackingEventsAsync(events) {
    for (const event of events) {
      const delayMs = event.deltaFromCheckpoint * 1000;
      await this._delay(delayMs);

      if (event.type === 'noteOn' && event.velocity > 0) {
        this.sampler.triggerAttack(
          Tone.Midi(event.midi).toFrequency(),
          Tone.now()
        );
      } else if (event.type === 'noteOff' || event.velocity === 0) {
        this.sampler.triggerRelease(
          Tone.Midi(event.midi).toFrequency(),
          Tone.now()
        );
      }
    }
  }

  /**
   * Play melody notes (student part)
   */
  _playMelodyNotes(midiNotes, startTime) {
    for (const midi of midiNotes) {
      this.sampler.triggerAttackRelease(
        Tone.Midi(midi).toFrequency(),
        '0.5',
        startTime
      );
    }
  }

  /**
   * Schedule cursor updates via Tone.Draw for visual sync
   */
  _scheduleCursorUpdates() {
    Tone.Draw.on(() => {
      this.currentTime = Tone.Transport.seconds;

      // Find current checkpoint based on time
      for (let i = 0; i < this.timeline.checkpoints.length; i++) {
        const cp = this.timeline.checkpoints[i];
        const adjustedTime = this._adjustTimeForTempo(cp.time);
        if (adjustedTime <= this.currentTime) {
          this.currentCheckpointIndex = i;
        }
      }

      this._emit('cursorMoved', {
        time: this.currentTime,
        checkpointIndex: this.currentCheckpointIndex
      });
    });
  }

  /**
   * Adjust time based on current tempo
   */
  _adjustTimeForTempo(originalTime) {
    const tempoRatio = this.baseTempoPercent / 100;
    return originalTime / tempoRatio;
  }

  /**
   * Helper: delay promise
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeListener(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stop();
    if (this.sampler) {
      this.sampler.dispose();
    }
    Tone.Transport.dispose();
  }
}
