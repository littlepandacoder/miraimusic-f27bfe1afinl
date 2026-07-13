# Sheet Music Player — Architecture & Setup Guide

## Overview

The Sheet Music Player is a music practice tool that renders musical notation alongside audio playback and MIDI input. Students can play along with backing tracks in two modes:

- **Normal Mode**: Continuous playback with real-time cursor tracking
- **Wait Mode**: Pauses at each melody note and only advances when the student plays the correct note(s) on their MIDI keyboard

## Architecture

### File Structure

```
public/lib/sheet-music-player/
├── ScoreRenderer.js          # OSMD wrapper: MusicXML rendering & cursor
├── Timeline.js               # Builds checkpoint array from MIDI + score
├── PlaybackEngine.js         # Tone.js audio engine (both modes)
├── MidiInput.js              # Web MIDI device handling
├── SheetMusicPlayer.js       # Main orchestrator & UI state manager
└── SHEET_MUSIC_README.md     # This file
```

### Core Data Model: Timeline & Checkpoints

**Checkpoint** = A single point in the score where the student is expected to play note(s).

```javascript
{
  id: "cp-5",                          // Unique identifier
  index: 5,                            // Sequential index
  time: 2.5,                           // Seconds from song start (at base tempo)
  ticks: 1200,                         // MIDI ticks from song start
  expectedNotes: [60, 64, 67],         // MIDI note numbers (C4, E4, G4) = C major chord
  isRest: false,                       // True if student part is silent here
  isBackingOnly: false,                // True if only backing tracks play (no melody)
  cursorStep: 5,                       // Index for OSMD cursor positioning
  backingEvents: [                     // MIDI events to play between this checkpoint & next
    {
      type: "noteOn",
      midi: 43,                        // G2
      velocity: 80,
      time: 2.5,
      deltaFromCheckpoint: 0.0         // Time offset from this checkpoint
    },
    {
      type: "noteOff",
      midi: 43,
      velocity: 0,
      time: 3.0,
      deltaFromCheckpoint: 0.5
    }
  ]
}
```

**Timeline** = Sorted array of Checkpoints, built from:
1. **MusicXML file** (via OpenSheetMusicDisplay) → extracts student part notes & rests
2. **MIDI file** → provides precise timing and backing track events

### Module Responsibilities

| Module | Role |
|--------|------|
| **ScoreRenderer** | Loads MusicXML via OSMD, renders to canvas, manages cursor position & auto-scroll |
| **Timeline** | Parses MIDI, aligns with OSMD, builds checkpoint array, handles tempo scaling |
| **PlaybackEngine** | Schedules audio via `Tone.Transport`, implements Normal & Wait mode logic |
| **MidiInput** | Web MIDI device detection, connection, note parsing |
| **SheetMusicPlayer** | Orchestrates all modules, manages UI state, subscribes to events |

### Audio Flow

**Tone.js Setup:**
- Uses `Tone.Sampler` with Salamander piano samples
- All timing via `Tone.Transport` (no `setInterval`)
- Cursor updates via `Tone.Draw` for visual sync
- Backing tracks scheduled relative to checkpoints

**Normal Mode:**
1. Transport runs continuously at adjusted BPM
2. Checkpoint callbacks scheduled at precise times
3. Backing track events played between checkpoints
4. Cursor advances on schedule
5. MIDI input scored passively (hit/miss/wrong tracked but don't stop playback)

**Wait Mode:**
1. Transport paused at each checkpoint
2. UI highlights expected notes and waits for MIDI input
3. Student must hold all expected notes simultaneously (chord support)
4. Wrong notes flash red but don't block
5. When checkpoint passes, backing events scheduled for next segment
6. Auto-advance through rests and backing-only passages

## Adding New Songs

### Step 1: Create MusicXML File

Use a notation software (MuseScore, Finale, Dorico, Noteflight) to:
1. Compose or import the melody
2. Create a "Student Part" (track 1 in MIDI)
3. Add accompaniment/backing tracks (tracks 2+)
4. Set the tempo (BPM)
5. **Export as MusicXML** (File → Export → MusicXML)

### Step 2: Export MIDI File

From the same file, **Export as MIDI** with:
- Track 1 = Student melody (single notes or chords)
- Tracks 2+ = Backing/accompaniment
- Ensure timing/tempos match the MusicXML

**Important:** MIDI track 0 is assumed to be the student part. Adjust this in Timeline constructor if different:
```javascript
const timeline = new Timeline(osmd, midi, {
  studentTrackIndex: 0,  // Change if student part is on a different track
  baseBpm: 120
});
```

### Step 3: Upload to Supabase Storage

1. Open Supabase dashboard → Storage
2. Create bucket named `sheet-music` if it doesn't exist
3. Upload file to: `sheet-music/songs/{songId}/score.musicxml`
4. Upload file to: `sheet-music/songs/{songId}/backing.mid`

### Step 4: Create Metadata in Database

Insert into `sheet_music_songs` table:

```sql
INSERT INTO sheet_music_songs (
  title, composer, description, difficulty, base_bpm,
  musicxml_path, midi_path, is_public, created_by
) VALUES (
  'Twinkle Twinkle Little Star',
  'Traditional',
  'A simple melody for beginners',
  1,
  120,
  'songs/twinkle-001/score.musicxml',
  'songs/twinkle-001/backing.mid',
  true,
  'admin-user-id'
);
```

### Step 5: Test

Load the song in the Sheet Music Player:
```javascript
const player = new SheetMusicPlayer();
await player.initialize();
await player.loadSong({
  title: 'Twinkle Twinkle Little Star',
  musicxmlUrl: 'https://your-bucket.supabase.co/storage/v1/object/public/sheet-music/songs/twinkle-001/score.musicxml',
  midiUrl: 'https://your-bucket.supabase.co/storage/v1/object/public/sheet-music/songs/twinkle-001/backing.mid',
  baseBpm: 120
});
```

## Browser Support

| Browser | Web MIDI | Status |
|---------|----------|--------|
| Chrome | ✅ | Fully supported |
| Edge | ✅ | Fully supported |
| Firefox | ❌ | Not supported (as of 2026) |
| Safari | ❌ | Not supported |

The player shows a **"Web MIDI not supported"** message in unsupported browsers, but score rendering and audio playback still work.

## Dependencies

- **OpenSheetMusicDisplay** (`opensheetmusicdisplay`) — MusicXML rendering
- **Tone.js** (`tone@^15`) — Audio engine
- **@tonejs/midi** (optional) — MIDI file parsing (currently using placeholder)

### Installation

```bash
npm install opensheetmusicdisplay tone @tonejs/midi
```

## API Reference

### SheetMusicPlayer

```javascript
const player = new SheetMusicPlayer({
  containerSelector: '#sheet-music-player',
  scoreContainer: '#score-renderer',
  baseBpm: 120
});

// Initialize (request MIDI access, set up event listeners)
await player.initialize();

// Load a song
await player.loadSong({
  title: 'Song Name',
  musicxmlUrl: '...',
  midiUrl: '...',
  baseBpm: 120
});

// Playback controls
player.play();        // Start playback
player.pause();       // Pause
player.stop();        // Stop & reset cursor
player.setTempo(110); // Set tempo as % (50-120)

// Cleanup
player.destroy();
```

### PlaybackEngine Events

```javascript
playbackEngine.on('checkpointReached', ({ checkpoint, index }) => {
  // Student should play these notes now
  console.log('Expected notes:', checkpoint.expectedNotes);
});

playbackEngine.on('wrongNote', (midiNote) => {
  // Flash red or provide feedback
  console.log('Wrong note:', midiNote);
});

playbackEngine.on('checkpointPassed', ({ checkpoint, index }) => {
  // Student played correctly
});

playbackEngine.on('songEnded', () => {
  // Show completion summary
});
```

### MidiInput Events

```javascript
midiInput.on('noteOn', ({ midi, velocity }) => {
  // Note played with given velocity
});

midiInput.on('noteOff', ({ midi }) => {
  // Note released
});

midiInput.on('deviceConnected', ({ device }) => {
  // MIDI device plugged in
});

midiInput.on('deviceDisconnected', ({ device }) => {
  // MIDI device unplugged
});
```

## Configuration

### ScoreRenderer Options

```javascript
new ScoreRenderer('#score-container', {
  zoom: 1.0,                                    // Canvas zoom level
  autoScroll: true,                             // Follow cursor
  cursorColor: 'rgba(255, 45, 120, 0.5)',      // Pink with transparency
  cursorWidth: 3                                // Pixels
});
```

### PlaybackEngine Options

```javascript
new PlaybackEngine(timeline, {
  mode: 'normal',              // or 'wait'
  tempoPercent: 100,           // 50-120%
  playMelody: false            // Play student part audio
});
```

### Timeline Options

```javascript
new Timeline(osmd, midi, {
  studentTrackIndex: 0,        // Which MIDI track is the melody
  baseBpm: 120,                // Base tempo
  timeSignature: [4, 4]        // For future use
});
```

## Troubleshooting

### "OSMD cursor not available"
- Ensure MusicXML file is valid
- Check that OSMD has finished rendering before setting cursor
- Call `scoreRenderer.loadScore()` and wait for it to complete

### Tempo changes don't sync properly
- Verify all MIDI files have consistent `ticksPerBeat` header value
- Ensure tempo changes are applied via `Timeline.setBaseBpm()`

### MIDI notes not recognized
- Check browser console for "Web MIDI not supported" warning
- Try a Chrome/Edge browser
- Verify MIDI device is plugged in before page load
- Check that note velocities are > 0 (velocity 0 is treated as note-off)

### Audio cuts out in Wait mode
- Backing track events may be scheduled too close together
- Verify MIDI file doesn't have overlapping notes in backing tracks
- Increase `checkpointTimeout` in PlaybackEngine if students need more time

## Future Enhancements

- [ ] Stem separation for backing track volume control
- [ ] Metronome/click track option
- [ ] Recording student performance for playback
- [ ] Accuracy scoring with detailed feedback per measure
- [ ] Multiple student parts (ensemble mode)
- [ ] Customize which MIDI tracks to hear
- [ ] Sheet music animation synced to backing track
- [ ] Firefox/Safari support via alternative timing (AudioContext scheduling)

## License

Part of the Musicable platform. All code is proprietary.
