/**
 * SheetMusicPlayer.js
 *
 * Main orchestrator for the Sheet Music Player feature.
 * Integrates: ScoreRenderer, Timeline, PlaybackEngine, MidiInput
 * Manages UI state and event flow.
 */

import { ScoreRenderer } from './ScoreRenderer.js';
import { Timeline } from './Timeline.js';
import { PlaybackEngine } from './PlaybackEngine.js';
import { MidiInput } from './MidiInput.js';

export class SheetMusicPlayer {
  constructor(options = {}) {
    this.containerSelector = options.containerSelector ?? '#sheet-music-player';
    this.scoreContainer = options.scoreContainer ?? '#score-renderer';
    this.baseBpm = options.baseBpm ?? 120;

    // Components
    this.scoreRenderer = null;
    this.timeline = null;
    this.playbackEngine = null;
    this.midiInput = null;

    // State
    this.currentSong = null;
    this.isInitialized = false;
    this.mode = 'normal'; // or 'wait'
    this.tempo = 100;
    this.playMelody = false;
    this.selectedMidiDevice = null;

    // UI elements
    this.playBtn = null;
    this.pauseBtn = null;
    this.stopBtn = null;
    this.tempoSlider = null;
    this.modeToggle = null;
    this.midiSelector = null;
    this.midiStatus = null;
    this.accuracyDisplay = null;

    this._bindElements();
  }

  /**
   * Initialize the player
   */
  async initialize() {
    try {
      // Initialize MIDI input
      this.midiInput = new MidiInput();
      if (MidiInput.isSupported()) {
        await this.midiInput.initialize();
        this._setupMidiListeners();
        this._updateMidiStatus();
      } else {
        this._showBrowserWarning();
      }

      this.isInitialized = true;
      console.log('[SheetMusicPlayer] Initialized');
    } catch (error) {
      console.error('[SheetMusicPlayer] Initialization failed:', error);
    }
  }

  /**
   * Load and play a song
   */
  async loadSong(songData) {
    try {
      // songData should contain: { title, musicxmlUrl, midiUrl, baseBpm }
      this.currentSong = songData;
      this.baseBpm = songData.baseBpm || 120;

      // Start audio context
      await Tone.start();

      // Load score with OSMD
      this.scoreRenderer = new ScoreRenderer(this.scoreContainer);
      await this.scoreRenderer.loadScore(songData.musicxmlUrl);

      // Load MIDI file
      const midiData = await this._loadMidiFile(songData.midiUrl);

      // Build timeline
      this.timeline = new Timeline(
        this.scoreRenderer.getOsmd(),
        midiData,
        { baseBpm: this.baseBpm }
      );
      this.timeline.build();

      // Create playback engine
      this.playbackEngine = new PlaybackEngine(this.timeline, {
        mode: this.mode,
        tempoPercent: this.tempo,
        playMelody: this.playMelody
      });

      this._setupPlaybackListeners();

      // Update UI
      this._updateSongDisplay();

      console.log('[SheetMusicPlayer] Song loaded:', songData.title);
    } catch (error) {
      console.error('[SheetMusicPlayer] Failed to load song:', error);
      this._showError(error.message);
    }
  }

  /**
   * Bind UI element references
   */
  _bindElements() {
    const container = document.querySelector(this.containerSelector);
    if (!container) {
      console.error('[SheetMusicPlayer] Container not found:', this.containerSelector);
      return;
    }

    this.playBtn = container.querySelector('[data-action="play"]');
    this.pauseBtn = container.querySelector('[data-action="pause"]');
    this.stopBtn = container.querySelector('[data-action="stop"]');
    this.tempoSlider = container.querySelector('[data-control="tempo"]');
    this.modeToggle = container.querySelector('[data-control="mode"]');
    this.midiSelector = container.querySelector('[data-control="midi-device"]');
    this.midiStatus = container.querySelector('[data-status="midi"]');
    this.accuracyDisplay = container.querySelector('[data-display="accuracy"]');

    // Bind event listeners
    if (this.playBtn) this.playBtn.addEventListener('click', () => this.play());
    if (this.pauseBtn) this.pauseBtn.addEventListener('click', () => this.pause());
    if (this.stopBtn) this.stopBtn.addEventListener('click', () => this.stop());

    if (this.tempoSlider) {
      this.tempoSlider.addEventListener('change', (e) => {
        this.tempo = parseInt(e.target.value);
        if (this.playbackEngine) {
          this.playbackEngine.setTempo(this.tempo);
        }
      });
    }

    if (this.modeToggle) {
      this.modeToggle.addEventListener('change', (e) => {
        this.mode = e.target.checked ? 'wait' : 'normal';
        this._updateModeDisplay();
      });
    }

    if (this.midiSelector) {
      this.midiSelector.addEventListener('change', (e) => {
        this.selectedMidiDevice = e.target.value;
        if (this.midiInput) {
          this.midiInput.selectDevice(this.selectedMidiDevice);
        }
      });
    }
  }

  /**
   * Set up MIDI listeners
   */
  _setupMidiListeners() {
    if (!this.midiInput) return;

    this.midiInput.on('deviceConnected', (data) => {
      console.log('[SheetMusicPlayer] MIDI device connected:', data.device);
      this._updateMidiDeviceList();
      this._updateMidiStatus('connected');
    });

    this.midiInput.on('deviceDisconnected', (data) => {
      console.log('[SheetMusicPlayer] MIDI device disconnected:', data.device);
      this._updateMidiDeviceList();
      this._updateMidiStatus('disconnected');
    });

    this.midiInput.on('noteOn', (data) => {
      if (this.playbackEngine) {
        this.playbackEngine._emit('midiInput', {
          type: 'noteOn',
          midi: data.midi,
          velocity: data.velocity
        });
      }
    });

    this.midiInput.on('noteOff', (data) => {
      if (this.playbackEngine) {
        this.playbackEngine._emit('midiInput', {
          type: 'noteOff',
          midi: data.midi,
          velocity: data.velocity
        });
      }
    });

    this.midiInput.on('error', (data) => {
      this._showError('MIDI Error: ' + data.message);
    });

    this._updateMidiDeviceList();
  }

  /**
   * Set up playback event listeners
   */
  _setupPlaybackListeners() {
    if (!this.playbackEngine) return;

    this.playbackEngine.on('checkpointReached', (data) => {
      console.log('[SheetMusicPlayer] Checkpoint reached:', data.checkpoint.expectedNotes);
      this._updateExpectedNotes(data.checkpoint);
      this.scoreRenderer.setCursorToCheckpoint(data.checkpoint.cursorStep);
    });

    this.playbackEngine.on('cursorMoved', (data) => {
      // Update cursor position based on playback time
      this._updatePlaybackTime(data.time);
    });

    this.playbackEngine.on('wrongNote', (data) => {
      this._flashWrongNoteIndicator();
      console.warn('[SheetMusicPlayer] Wrong note played:', data.midi);
    });

    this.playbackEngine.on('checkpointPassed', (data) => {
      console.log('[SheetMusicPlayer] Checkpoint passed!');
      this._updateAccuracy(data);
    });

    this.playbackEngine.on('songEnded', () => {
      console.log('[SheetMusicPlayer] Song ended');
      this._showSummary();
    });
  }

  /**
   * Play the song
   */
  async play() {
    if (!this.playbackEngine) {
      this._showError('No song loaded');
      return;
    }

    if (this.mode === 'normal') {
      this.playbackEngine.playNormal();
    } else {
      await this.playbackEngine.playWait();
    }

    this._updateTransportDisplay();
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.playbackEngine) {
      this.playbackEngine.pause();
    }
    this._updateTransportDisplay();
  }

  /**
   * Stop playback and reset
   */
  stop() {
    if (this.playbackEngine) {
      this.playbackEngine.stop();
    }
    if (this.scoreRenderer) {
      this.scoreRenderer.resetCursor();
    }
    this._updateTransportDisplay();
  }

  /**
   * Load MIDI file from URL
   */
  async _loadMidiFile(url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();

      // Parse MIDI using Tone.js MIDI parser (if available)
      // For now, we'll use a simple fetch; integration with @tonejs/midi would be:
      // const { Midi } = await import('@tonejs/midi');
      // return new Midi(arrayBuffer);

      // Placeholder: return parsed MIDI data
      return this._parseMidi(arrayBuffer);
    } catch (error) {
      console.error('[SheetMusicPlayer] Failed to load MIDI:', error);
      throw error;
    }
  }

  /**
   * Simple MIDI parser (basic implementation)
   * Production: use @tonejs/midi package
   */
  _parseMidi(arrayBuffer) {
    // This is a placeholder. In production, use:
    // import { Midi } from '@tonejs/midi';
    // return new Midi(arrayBuffer);

    return {
      header: {
        ticksPerBeat: 480,
        setTempo: [{ microsecondsPerBeat: 500000 }]
      },
      tracks: [
        { /* placeholder */ }
      ]
    };
  }

  /**
   * Update MIDI device list
   */
  _updateMidiDeviceList() {
    if (!this.midiSelector) return;

    const devices = this.midiInput ? this.midiInput.getInputDevices() : [];
    this.midiSelector.innerHTML = '';

    if (devices.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'No MIDI devices found';
      option.disabled = true;
      this.midiSelector.appendChild(option);
      return;
    }

    devices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.id;
      option.textContent = `${device.name} (${device.manufacturer || 'Unknown'})`;
      this.midiSelector.appendChild(option);
    });

    if (this.midiInput?.inputDevice) {
      this.midiSelector.value = this.midiInput.inputDevice.id;
    }
  }

  /**
   * Update MIDI connection status display
   */
  _updateMidiStatus(status) {
    if (!this.midiStatus) return;

    const connected = this.midiInput?.isConnected ?? false;
    const statusText = connected ? 'Connected' : 'No Device';
    const statusClass = connected ? 'connected' : 'disconnected';

    this.midiStatus.textContent = statusText;
    this.midiStatus.className = `midi-status ${statusClass}`;
  }

  /**
   * Update expected notes display (for Wait mode)
   */
  _updateExpectedNotes(checkpoint) {
    const display = document.querySelector('[data-display="expected-notes"]');
    if (!display) return;

    const noteNames = checkpoint.expectedNotes.map(midi => this._midiToNoteName(midi));
    display.textContent = noteNames.join(', ');
  }

  /**
   * MIDI number to note name
   */
  _midiToNoteName(midi) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const noteName = notes[midi % 12];
    return noteName + octave;
  }

  /**
   * Flash wrong note indicator
   */
  _flashWrongNoteIndicator() {
    const indicator = document.querySelector('[data-indicator="wrong-note"]');
    if (!indicator) return;

    indicator.style.opacity = '1';
    setTimeout(() => {
      indicator.style.opacity = '0';
    }, 200);
  }

  /**
   * Update accuracy display
   */
  _updateAccuracy(data) {
    if (this.accuracyDisplay) {
      const accuracy = Math.round(Math.random() * 100); // Placeholder
      this.accuracyDisplay.textContent = `${accuracy}%`;
    }
  }

  /**
   * Update playback time display
   */
  _updatePlaybackTime(seconds) {
    const display = document.querySelector('[data-display="time"]');
    if (display) {
      const mins = Math.floor(seconds / 60);
      const secs = (seconds % 60).toFixed(1);
      display.textContent = `${mins}:${secs.padStart(4, '0')}`;
    }
  }

  /**
   * Update transport display (play/pause/stop buttons)
   */
  _updateTransportDisplay() {
    const isPlaying = this.playbackEngine?.isPlaying ?? false;
    if (this.playBtn) this.playBtn.disabled = isPlaying;
    if (this.pauseBtn) this.pauseBtn.disabled = !isPlaying;
  }

  /**
   * Update song display
   */
  _updateSongDisplay() {
    if (this.currentSong) {
      const titleEl = document.querySelector('[data-display="song-title"]');
      if (titleEl) {
        titleEl.textContent = this.currentSong.title;
      }
    }
  }

  /**
   * Update mode display
   */
  _updateModeDisplay() {
    if (this.playbackEngine) {
      this.playbackEngine.mode = this.mode;
    }
    const modeLabel = document.querySelector('[data-display="mode"]');
    if (modeLabel) {
      modeLabel.textContent = this.mode === 'normal' ? 'Normal' : 'Wait';
    }
  }

  /**
   * Show completion summary
   */
  _showSummary() {
    const summary = document.querySelector('[data-modal="summary"]');
    if (summary) {
      summary.style.display = 'block';
    }
  }

  /**
   * Show error message
   */
  _showError(message) {
    const errorEl = document.querySelector('[data-error-display]');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      setTimeout(() => {
        errorEl.style.display = 'none';
      }, 5000);
    }
  }

  /**
   * Show browser warning for unsupported Web MIDI
   */
  _showBrowserWarning() {
    const warning = document.querySelector('[data-warning="browser"]');
    if (warning) {
      warning.style.display = 'block';
    }
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.playbackEngine) this.playbackEngine.destroy();
    if (this.scoreRenderer) this.scoreRenderer.destroy();
    if (this.midiInput) this.midiInput.destroy();
  }
}
