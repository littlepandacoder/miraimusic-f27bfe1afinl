/**
 * MidiPlayer.js
 * Standalone MIDI player with piano roll visualization, playback, and wait mode.
 * Uses Tone.js for audio playback and Web MIDI API for input.
 */

export class MidiPlayer {
  constructor(options = {}) {
    this.container = options.container || '#midiVisualization';
    this.baseBpm = options.baseBpm || 120;

    // State
    this.midiData = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.waitMode = false;
    this.tempoPercent = 100;
    this.currentTime = 0;
    this.duration = 0;
    this.currentCheckpoint = -1;

    // Audio
    this.synth = null;
    this.transport = null;
    this.backingNotes = new Map();

    // MIDI Input
    this.midiInput = null;
    this.selectedDevice = null;
    this.currentNotes = new Set();

    // Events
    this.eventListeners = {};

    // Timeline (parsed from MIDI)
    this.timeline = [];
    this.checkpoints = [];

    // Canvas
    this.canvas = null;
    this.canvasCtx = null;
    this.scrollX = 0;

    this._initAudio();
    this._initMidi();
  }

  async _initAudio() {
    try {
      if (typeof Tone === 'undefined') {
        console.warn('[MidiPlayer] Tone.js not available');
        return;
      }
      // Don't start audio context yet - wait for user interaction
      this.synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
      }).toDestination();
      console.log('[MidiPlayer] Audio ready (not started)');
    } catch (e) {
      console.error('[MidiPlayer] Audio init failed:', e);
    }
  }

  async _initMidi() {
    try {
      if (!navigator.requestMIDIAccess) {
        console.warn('[MidiPlayer] Web MIDI not supported');
        return;
      }
      const access = await navigator.requestMIDIAccess();
      this._updateMidiDevices(access);
      access.onstatechange = (e) => this._updateMidiDevices(access);
      console.log('[MidiPlayer] MIDI initialized');
    } catch (e) {
      console.warn('[MidiPlayer] MIDI access denied:', e);
    }
  }

  _updateMidiDevices(access) {
    const inputs = Array.from(access.inputs.values());
    this.emit('midiDevicesUpdated', inputs);

    inputs.forEach(input => {
      input.onmidimessage = (e) => this._onMidiMessage(e);
    });
  }

  setMidiDevice(deviceId) {
    if (!deviceId) {
      this.selectedDevice = null;
      return;
    }

    try {
      const access = navigator.requestMIDIAccess?.();
      if (access && access.inputs) {
        this.selectedDevice = access.inputs.get(deviceId);
      }
    } catch (e) {
      console.error('[MidiPlayer] Failed to set device:', e);
    }
  }

  _onMidiMessage(e) {
    const [cmd, note, vel] = e.data;
    if (!this.waitMode || !this.isPlaying) return;

    if ((cmd & 0xF0) === 0x90 && vel > 0) {
      this.currentNotes.add(note);
      this.emit('noteOn', { note, velocity: vel });
      this._checkCheckpoint();
    } else if ((cmd & 0xF0) === 0x80 || ((cmd & 0xF0) === 0x90 && vel === 0)) {
      this.currentNotes.delete(note);
      this.emit('noteOff', { note });
    }
  }

  async loadMidi(file) {
    try {
      const buffer = await file.arrayBuffer();
      this.midiData = this._parseMidi(buffer);
      this._buildTimeline();
      this._createCheckpoints();
      this._renderCanvas();
      this.emit('midiLoaded', { title: file.name, duration: this.duration });
      this._updatePlayback();
      return true;
    } catch (e) {
      console.error('[MidiPlayer] Failed to load MIDI:', e);
      this.emit('error', e.message);
      return false;
    }
  }

  _parseMidi(buffer) {
    const view = new Uint8Array(buffer);
    const header = this._parseHeader(view);
    const tracks = this._parseTracks(view, header);
    return { header, tracks };
  }

  _parseHeader(view) {
    const headerChunk = this._readChunk(view, 0);
    const format = this._read16(view, 8);
    const numTracks = this._read16(view, 10);
    const division = this._read16(view, 12);

    return {
      format,
      numTracks,
      division,
      ticksPerBeat: division & 0x7FFF,
      smpteFormat: (division >> 8) & 0xFF,
      ticksPerFrame: division & 0xFF
    };
  }

  _parseTracks(view, header) {
    const tracks = [];
    let pos = 14;

    for (let t = 0; t < header.numTracks; t++) {
      const trackStart = pos;
      pos += 4; // Skip "MTrk"
      const trackLen = this._read32(view, pos);
      pos += 4;
      const trackEnd = pos + trackLen;

      const events = [];
      let time = 0;

      while (pos < trackEnd) {
        const [deltaTime, newPos] = this._readVarLen(view, pos);
        time += deltaTime;
        pos = newPos;

        const status = view[pos++];
        const isMetaEvent = status === 0xFF;
        const isSystemEvent = status === 0xF0 || status === 0xF7;

        if (isMetaEvent) {
          const type = view[pos++];
          const [len, newPos2] = this._readVarLen(view, pos);
          pos = newPos2;

          if (type === 0x51) { // Set Tempo
            const tempo = (view[pos] << 16) | (view[pos + 1] << 8) | view[pos + 2];
            events.push({ type: 'setTempo', time, tempo, microsecondsPerBeat: tempo });
          } else if (type === 0x09) { // Device Name
            const name = new TextDecoder().decode(view.slice(pos, pos + len));
            events.push({ type: 'deviceName', time, name });
          } else if (type === 0x04) { // Instrument Name
            const name = new TextDecoder().decode(view.slice(pos, pos + len));
            events.push({ type: 'instrumentName', time, name });
          }
          pos += len;
        } else if (isSystemEvent) {
          const [len, newPos2] = this._readVarLen(view, pos);
          pos = newPos2 + len;
        } else {
          const channel = status & 0x0F;
          const cmd = status & 0xF0;

          if (cmd === 0x90 || cmd === 0x80) {
            const note = view[pos++];
            const velocity = view[pos++];
            events.push({
              type: cmd === 0x90 ? 'noteOn' : 'noteOff',
              time,
              channel,
              note,
              velocity
            });
          } else if (cmd === 0xB0) {
            pos += 2; // Skip CC
          } else if (cmd === 0xC0) {
            pos += 1; // Skip PC
          } else if (cmd === 0xE0) {
            pos += 2; // Skip PW
          } else {
            pos += 2;
          }
        }
      }

      tracks.push(events);
    }

    return tracks;
  }

  _readChunk(view, pos) {
    const name = String.fromCharCode(view[pos], view[pos + 1], view[pos + 2], view[pos + 3]);
    const len = this._read32(view, pos + 4);
    return { name, len };
  }

  _read16(view, pos) {
    return (view[pos] << 8) | view[pos + 1];
  }

  _read32(view, pos) {
    return (view[pos] << 24) | (view[pos + 1] << 16) | (view[pos + 2] << 8) | view[pos + 3];
  }

  _readVarLen(view, pos) {
    let value = 0;
    let byte;
    do {
      byte = view[pos++];
      value = (value << 7) | (byte & 0x7F);
    } while (byte & 0x80);
    return [value, pos];
  }

  _buildTimeline() {
    if (!this.midiData) return;

    const tracks = this.midiData.tracks;
    const header = this.midiData.header;

    let baseBpm = 120;
    const noteEvents = [];

    // Extract tempo and notes from all tracks
    tracks.forEach((track, trackIdx) => {
      track.forEach(event => {
        if (event.type === 'setTempo') {
          baseBpm = Math.round(60000000 / event.tempo);
        }
        if (event.type === 'noteOn' && event.velocity > 0) {
          const endEvent = track.find(e =>
            e.type === 'noteOff' &&
            e.note === event.note &&
            e.time > event.time
          );
          if (endEvent) {
            noteEvents.push({
              trackIdx,
              note: event.note,
              velocity: event.velocity,
              startTime: event.time,
              endTime: endEvent.time,
              duration: endEvent.time - event.time
            });
          }
        }
      });
    });

    this.baseBpm = baseBpm;
    this.timeline = noteEvents.sort((a, b) => a.startTime - b.startTime);

    // Calculate duration
    if (noteEvents.length > 0) {
      const lastNote = noteEvents[noteEvents.length - 1];
      const durationTicks = lastNote.endTime;
      this.duration = this._ticksToSeconds(durationTicks);
    }

    console.log(`[MidiPlayer] Timeline built: ${this.timeline.length} notes, ${this.baseBpm}BPM, ${this.duration.toFixed(2)}s`);
  }

  _ticksToSeconds(ticks) {
    const ticksPerBeat = this.midiData.header.ticksPerBeat;
    const beats = ticks / ticksPerBeat;
    return (beats * 60) / this.baseBpm;
  }

  _secondsToTicks(seconds) {
    const beats = (seconds * this.baseBpm) / 60;
    return beats * this.midiData.header.ticksPerBeat;
  }

  _createCheckpoints() {
    const trackNotes = new Map();
    const studentTrack = 0; // Assume first track is melody

    // Group notes by start time
    this.timeline.forEach(note => {
      if (!trackNotes.has(note.startTime)) {
        trackNotes.set(note.startTime, []);
      }
      trackNotes.get(note.startTime).push(note);
    });

    // Create checkpoints from sorted unique times
    const times = Array.from(trackNotes.keys()).sort((a, b) => a - b);
    this.checkpoints = times.map((time, idx) => ({
      id: `cp-${idx}`,
      index: idx,
      time: this._ticksToSeconds(time),
      ticks: time,
      notes: trackNotes.get(time),
      expectedNotes: trackNotes.get(time)
        .filter(n => n.trackIdx === studentTrack)
        .map(n => n.note)
    }));

    console.log(`[MidiPlayer] ${this.checkpoints.length} checkpoints created`);
  }

  _renderCanvas() {
    const container = document.querySelector(this.container);
    if (!container) return;

    container.innerHTML = '';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'midi-roll-canvas';
    this.canvas.width = container.offsetWidth;
    this.canvas.height = container.offsetHeight;
    container.appendChild(this.canvas);

    this.canvasCtx = this.canvas.getContext('2d');
    this._drawPianoTiles();
  }

  _drawPianoTiles() {
    if (!this.canvas || !this.timeline.length) return;

    const ctx = this.canvasCtx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const pianoKeys = 88;
    const keyWidth = w / pianoKeys;
    const pixelsPerSecond = 150;
    const noteHitLine = h - 80; // Where keyboard is

    // Background: black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // Draw falling notes
    this.timeline.forEach(note => {
      const noteIndex = note.note - 21; // A0 = 21
      if (noteIndex < 0 || noteIndex >= pianoKeys) return;

      // Calculate vertical position
      const noteSecs = note.startTime / this.midiData.header.ticksPerBeat * (60 / this.baseBpm);
      const durationSecs = note.duration / this.midiData.header.ticksPerBeat * (60 / this.baseBpm);

      const noteStartY = noteHitLine - (noteSecs - this.currentTime) * pixelsPerSecond;
      const noteEndY = noteStartY - durationSecs * pixelsPerSecond;

      // Only draw if visible
      if (noteEndY < 0 || noteStartY > h) return;

      const noteX = noteIndex * keyWidth;
      const noteHeight = Math.max(2, durationSecs * pixelsPerSecond);

      // Determine color: white or black key
      const keyName = this._midiToNoteName(note.note);
      const isWhiteKey = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].includes(keyName[0]);

      // Color based on track and key type
      const isExpected = note.trackIdx === 0;
      if (isExpected) {
        ctx.fillStyle = isWhiteKey ? '#FFFFFF' : '#333333';
      } else {
        ctx.fillStyle = isWhiteKey ? '#CCCCCC' : '#666666';
      }

      ctx.fillRect(noteX, Math.max(0, noteEndY), keyWidth - 1, Math.min(noteHeight, h));

      // Border
      ctx.strokeStyle = isExpected ? '#FF2D78' : '#999999';
      ctx.lineWidth = isExpected ? 2 : 1;
      ctx.strokeRect(noteX, Math.max(0, noteEndY), keyWidth - 1, Math.min(noteHeight, h));
    });

    // Draw playback line (hit zone)
    ctx.strokeStyle = '#FF2D78';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, noteHitLine);
    ctx.lineTo(w, noteHitLine);
    ctx.stroke();

    // Hit zone glow
    ctx.fillStyle = 'rgba(255, 45, 120, 0.1)';
    ctx.fillRect(0, noteHitLine - 20, w, 40);

    // Draw keyboard keys at bottom
    for (let i = 0; i < pianoKeys; i++) {
      const x = i * keyWidth;
      const keyName = this._midiToNoteName(21 + i);
      const isWhiteKey = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].includes(keyName[0]);
      const isActive = this.currentNotes.has(21 + i);

      // Key background
      ctx.fillStyle = isWhiteKey ? '#FFFFFF' : '#000000';
      ctx.fillRect(x, h - 80, keyWidth - 1, 80);

      // Key border
      ctx.strokeStyle = isActive ? '#FF2D78' : '#666666';
      ctx.lineWidth = isActive ? 3 : 1;
      ctx.strokeRect(x, h - 80, keyWidth - 1, 80);

      // Octave marker every 12 keys (C)
      if (i % 12 === 0) {
        ctx.fillStyle = '#FF2D78';
        ctx.font = '10px DM Mono';
        ctx.textAlign = 'center';
        ctx.fillText('C' + Math.floor(i / 12), x + keyWidth / 2, h - 10);
      }
    }
  }

  _updatePlayback() {
    const btns = {
      play: document.getElementById('midiPlayBtn'),
      pause: document.getElementById('midiPauseBtn'),
      stop: document.getElementById('midiStopBtn')
    };

    if (this.midiData) {
      btns.play.disabled = false;
      btns.stop.disabled = false;
    } else {
      btns.play.disabled = true;
      btns.pause.disabled = true;
      btns.stop.disabled = true;
    }
  }

  async play() {
    if (!this.midiData) return;
    if (this.isPlaying && !this.isPaused) return;

    try {
      if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
        await Tone.start();
      }
    } catch (e) {
      console.warn('[MidiPlayer] Audio start failed:', e);
    }

    this.isPlaying = true;
    this.isPaused = false;

    if (typeof Tone !== 'undefined') {
      Tone.Transport.bpm.value = this.baseBpm * (this.tempoPercent / 100);
      Tone.Transport.start();
    }

    const startTime = this.currentTime;
    this._scheduleNotes(startTime);
    this._updatePlaybackLoop();

    this.emit('playbackStarted');
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPaused = true;
    if (typeof Tone !== 'undefined') {
      try {
        Tone.Transport.pause();
      } catch (e) {
        console.warn('[MidiPlayer] Transport pause failed:', e);
      }
    }
    this.emit('playbackPaused');
  }

  stop() {
    if (typeof Tone !== 'undefined') {
      try {
        Tone.Transport.stop();
        Tone.Transport.cancel();
      } catch (e) {
        console.warn('[MidiPlayer] Transport stop failed:', e);
      }
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTime = 0;
    this.currentCheckpoint = -1;
    this.currentNotes.clear();
    this._drawPianoTiles();
    document.getElementById('midiTimeDisplay').textContent = '0:00';
    this.emit('playbackStopped');
  }

  _scheduleNotes(startTime) {
    if (typeof Tone === 'undefined') return;

    this.timeline.forEach(note => {
      const noteSecs = note.startTime / this.midiData.header.ticksPerBeat * (60 / this.baseBpm);
      if (noteSecs >= startTime) {
        const offsetTime = noteSecs - startTime;
        const freq = 440 * Math.pow(2, (note.note - 69) / 12);

        if (!this.waitMode && this.synth) {
          try {
            Tone.Transport.schedule(() => {
              this.synth.triggerAttackRelease(freq, '16n');
              this.emit('notePlayback', note);
            }, `+${offsetTime}`);
          } catch (e) {
            console.warn('[MidiPlayer] Schedule failed:', e);
          }
        }
      }
    });
  }

  _updatePlaybackLoop() {
    if (!this.isPlaying) return;

    this.currentTime += 0.016; // ~60fps

    // Update checkpoint
    const currentCp = this.checkpoints.findIndex(cp => cp.time <= this.currentTime);
    if (currentCp !== this.currentCheckpoint) {
      this.currentCheckpoint = currentCp;
      this.emit('checkpointReached', { checkpoint: this.checkpoints[currentCp], index: currentCp });
    }

    if (this.currentTime >= this.duration) {
      this.stop();
      this.emit('playbackEnded');
      return;
    }

    // Update UI
    const mins = Math.floor(this.currentTime / 60);
    const secs = Math.floor(this.currentTime % 60);
    const timeDisplay = document.getElementById('midiTimeDisplay');
    if (timeDisplay) {
      timeDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Update expected notes display
    if (this.currentCheckpoint >= 0 && this.checkpoints[this.currentCheckpoint]) {
      const expected = this.checkpoints[this.currentCheckpoint].expectedNotes;
      const names = expected.map(n => this._midiToNoteName(n)).join(', ');
      const expectedDisplay = document.getElementById('midiExpectedDisplay');
      if (expectedDisplay) {
        expectedDisplay.textContent = names || '—';
      }
    }

    // Update canvas
    this._drawPianoTiles();

    if (this.isPlaying && !this.isPaused) {
      requestAnimationFrame(() => this._updatePlaybackLoop());
    }
  }

  _checkCheckpoint() {
    if (this.currentCheckpoint < 0) return;

    const cp = this.checkpoints[this.currentCheckpoint];
    const hasAll = cp.expectedNotes.every(note => this.currentNotes.has(note));

    if (hasAll && cp.expectedNotes.length > 0) {
      this.emit('checkpointPassed', cp);
      this.currentCheckpoint++;
      this._updatePlaybackLoop();
    }
  }

  toggleWaitMode() {
    this.waitMode = !this.waitMode;
    const btn = document.getElementById('midiModeBtn');
    btn.textContent = this.waitMode ? 'Wait' : 'Normal';
    btn.classList.toggle('active', this.waitMode);
    this.emit('modeChanged', { mode: this.waitMode ? 'wait' : 'normal' });
  }

  setTempo(percent) {
    this.tempoPercent = Math.max(50, Math.min(150, parseInt(percent)));
    if (typeof Tone !== 'undefined') {
      try {
        Tone.Transport.bpm.value = this.baseBpm * (this.tempoPercent / 100);
      } catch (e) {
        console.warn('[MidiPlayer] Tempo change failed:', e);
      }
    }
    const tempoDisplay = document.getElementById('midiTempoValue');
    if (tempoDisplay) {
      tempoDisplay.textContent = this.tempoPercent + '%';
    }
    this.emit('tempoChanged', this.tempoPercent);
  }

  _midiToNoteName(midi) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const oct = Math.floor(midi / 12) - 1;
    return notes[midi % 12] + oct;
  }

  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach(cb => cb(data));
  }

  destroy() {
    try {
      this.stop();
      if (this.synth) {
        this.synth.dispose?.();
      }
    } catch (e) {
      console.warn('[MidiPlayer] Cleanup failed:', e);
    }
    this.eventListeners = {};
  }
}
