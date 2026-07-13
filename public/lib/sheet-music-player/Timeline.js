/**
 * Timeline.js
 *
 * Builds a timeline of checkpoints from MusicXML (via OSMD) + MIDI file.
 * Each checkpoint represents a point where the student must play notes.
 *
 * Architecture:
 * - Parse MIDI to get note timings
 * - Iterate OSMD cursor to match score positions
 * - Collect expected notes per checkpoint
 * - Identify rests and backing-only passages
 * - Build backing track events between checkpoints
 */

export class Timeline {
  constructor(osmd, midi, options = {}) {
    this.osmd = osmd;
    this.midi = midi;
    this.checkpoints = [];
    this.totalTime = 0;

    // Config
    this.studentTrackIndex = options.studentTrackIndex ?? 0;
    this.baseBpm = options.baseBpm ?? 120;
    this.timeSignature = options.timeSignature ?? [4, 4];
  }

  /**
   * Build the timeline from MIDI and OSMD data
   */
  build() {
    if (!this.midi || !this.midi.tracks) {
      console.warn('[Timeline] No MIDI data provided');
      this.checkpoints = [];
      return this.checkpoints;
    }

    const studentTrack = this.midi.tracks[this.studentTrackIndex];
    if (!studentTrack) {
      console.warn(`[Timeline] Student track ${this.studentTrackIndex} not found`);
      this.checkpoints = [];
      return this.checkpoints;
    }

    // Extract note-on events from student track (velocity > 0)
    const studentNotes = this._extractNotes(studentTrack);

    // Build checkpoints from student notes
    this._buildCheckpoints(studentNotes);

    // Collect backing track events for each checkpoint
    this._collectBackingTracks();

    return this.checkpoints;
  }

  /**
   * Extract note-on events from a track
   */
  _extractNotes(track) {
    const notes = [];
    let currentTime = 0;

    for (const event of track) {
      currentTime += event.deltaTime ?? 0;

      if (event.type === 'noteOn' && event.velocity > 0) {
        notes.push({
          midi: event.noteNumber,
          time: currentTime,
          velocity: event.velocity
        });
      }
    }

    return notes;
  }

  /**
   * Build checkpoints from student notes
   * Group notes at the same time into chords
   */
  _buildCheckpoints(notes) {
    const byTime = new Map();

    // Group notes by time
    for (const note of notes) {
      const key = note.time;
      if (!byTime.has(key)) {
        byTime.set(key, []);
      }
      byTime.get(key).push(note.midi);
    }

    // Convert to sorted checkpoints
    const sortedTimes = Array.from(byTime.keys()).sort((a, b) => a - b);

    for (let i = 0; i < sortedTimes.length; i++) {
      const time = sortedTimes[i];
      const midiNotes = byTime.get(time);
      const expectedNotes = [...new Set(midiNotes)]; // Deduplicate

      const checkpoint = {
        id: `cp-${i}`,
        index: i,
        time: this._ticksToSeconds(time),
        ticks: time,
        expectedNotes: expectedNotes,
        isRest: false,
        isBackingOnly: false,
        cursorStep: i,
        backingEvents: []
      };

      this.checkpoints.push(checkpoint);
    }

    if (this.checkpoints.length > 0) {
      const lastCheckpoint = this.checkpoints[this.checkpoints.length - 1];
      this.totalTime = lastCheckpoint.time;
    }
  }

  /**
   * Collect backing track events between each checkpoint
   */
  _collectBackingTracks() {
    for (let cpIndex = 0; cpIndex < this.checkpoints.length; cpIndex++) {
      const cp = this.checkpoints[cpIndex];
      const nextCp = cpIndex + 1 < this.checkpoints.length
        ? this.checkpoints[cpIndex + 1]
        : null;

      const backingEvents = [];

      // Collect events from all non-student tracks
      for (let trackIdx = 0; trackIdx < this.midi.tracks.length; trackIdx++) {
        if (trackIdx === this.studentTrackIndex) continue; // Skip student track

        const track = this.midi.tracks[trackIdx];
        let trackTime = 0;

        for (const event of track) {
          trackTime += event.deltaTime ?? 0;

          const eventSeconds = this._ticksToSeconds(trackTime);

          // Include events between this checkpoint and next
          if (eventSeconds >= cp.time && (nextCp === null || eventSeconds < nextCp.time)) {
            if (event.type === 'noteOn' || event.type === 'noteOff') {
              backingEvents.push({
                type: event.type,
                midi: event.noteNumber,
                velocity: event.velocity ?? 0,
                time: eventSeconds,
                deltaFromCheckpoint: eventSeconds - cp.time
              });
            }
          }
        }
      }

      cp.backingEvents = backingEvents;
    }
  }

  /**
   * Convert MIDI ticks to seconds
   * Formula: ticks / (ppq * bpm / 60)
   * ppq = pulses per quarter note (typically 480)
   */
  _ticksToSeconds(ticks) {
    const ppq = this.midi.header.setTempo?.[0]?.microsecondsPerBeat
      ? (1000000 / this.midi.header.setTempo[0].microsecondsPerBeat) * 60
      : 500000; // Default microsecondsPerBeat = 500000 (120 BPM)

    const bpm = this.baseBpm;
    return ticks / (this.midi.header.ticksPerBeat * (bpm / 60));
  }

  /**
   * Get checkpoint at a given time (with tolerance for wait mode)
   */
  getCheckpointAtTime(time, tolerance = 0.15) {
    for (const cp of this.checkpoints) {
      if (Math.abs(cp.time - time) <= tolerance) {
        return cp;
      }
    }
    return null;
  }

  /**
   * Get the next checkpoint after a given index
   */
  getNextCheckpoint(index) {
    if (index + 1 < this.checkpoints.length) {
      return this.checkpoints[index + 1];
    }
    return null;
  }

  /**
   * Set base tempo (affects all time calculations)
   */
  setBaseBpm(bpm) {
    this.baseBpm = bpm;
    // Rebuild timeline with new BPM
    this.build();
  }
}
