# Sheet Music Player — Setup Guide

This guide explains how to set up the Sheet Music Player feature and connect it to Supabase for song storage.

## Database Setup

### 1. Run the migration

The database schema is defined in:
```
supabase/migrations/20260703_sheet_music_songs.sql
```

Deploy it:
```bash
supabase db push
```

This creates:
- `sheet_music_songs` table — metadata for each song (title, composer, difficulty, file paths)
- `sheet_music_progress` table — tracks student progress per song (accuracy, time, completion status)
- RLS policies — public read, admin write/delete, users can see their own progress

### 2. Verify the tables exist

```bash
supabase db list
```

You should see `sheet_music_songs` and `sheet_music_progress`.

## Storage Setup

### 1. Create the storage bucket

In Supabase Dashboard → Storage:
- Click "Create bucket"
- Name: `sheet-music`
- Make public: **Yes** (students need to load files)

### 2. Set up folder structure

Inside the `sheet-music` bucket, create folders:
```
sheet-music/
├── songs/
│   └── {songId}/
│       ├── score.musicxml
│       └── backing.mid
└── demo/
    ├── twinkle-score.musicxml
    └── twinkle-backing.mid
```

## Adding Songs

### Option A: Upload MusicXML + MIDI manually

1. **Prepare files:**
   - Use MuseScore, Finale, Dorico, or Noteflight to create a score
   - Track 1 = Student melody (single notes or chords)
   - Tracks 2+ = Backing/accompaniment
   - Export as **MusicXML** and **MIDI**

2. **Upload to Supabase:**
   - Storage → sheet-music → songs → Create folder `{songId}` (e.g., `twinkle-001`)
   - Upload `score.musicxml` and `backing.mid`

3. **Create database entry:**
   ```sql
   INSERT INTO sheet_music_songs (
     title, composer, description, difficulty, base_bpm,
     musicxml_path, midi_path, is_public, created_by
   ) VALUES (
     'Twinkle Twinkle Little Star',
     'Traditional',
     'A simple 8-bar melody for beginners',
     1,
     120,
     'songs/twinkle-001/score.musicxml',
     'songs/twinkle-001/backing.mid',
     true,
     'YOUR_USER_ID'
   );
   ```

### Option B: Create an admin upload function (future)

For teachers/admins to upload directly:
```bash
supabase functions create sheet-music-upload
```

This would:
- Accept MusicXML + MIDI files
- Upload to Supabase Storage
- Create database entry
- Return public URLs

## Configuration in Code

### 1. Update song list in piano_hero.html

In the `<script type="module">` section for Sheet Music Player, update `loadSheetMusicSongs()`:

```javascript
async function loadSheetMusicSongs() {
  try {
    // Fetch from Supabase
    const { data, error } = await supabaseClient
      .from('sheet_music_songs')
      .select('id, title, base_bpm, musicxml_path, midi_path')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const selector = document.getElementById('smSongSelector');
    if (selector && data) {
      data.forEach(song => {
        const option = document.createElement('option');
        option.value = JSON.stringify({
          id: song.id,
          title: song.title,
          base_bpm: song.base_bpm,
          musicxml_url: `${SUPABASE_URL}/storage/v1/object/public/sheet-music/${song.musicxml_path}`,
          midi_url: `${SUPABASE_URL}/storage/v1/object/public/sheet-music/${song.midi_path}`
        });
        option.textContent = song.title;
        selector.appendChild(option);
      });
    }
  } catch (error) {
    console.error('[SheetMusic] Failed to load songs:', error);
  }
}
```

### 2. Install required packages

```bash
npm install opensheetmusicdisplay @tonejs/midi
```

Versions:
- `opensheetmusicdisplay@^0.7.0` — MusicXML rendering
- `@tonejs/midi@^2.0.27` — MIDI file parsing (already have `tone`)

## Browser Support

| Browser | Web MIDI | Score Rendering | Audio |
|---------|----------|-----------------|-------|
| Chrome 43+ | ✅ | ✅ | ✅ |
| Edge 79+ | ✅ | ✅ | ✅ |
| Firefox 25+ | ❌ | ✅ | ✅ |
| Safari 14+ | ❌ | ✅ | ✅ |

The player gracefully degrades—score rendering and audio work everywhere, but Web MIDI (keyboard input) only works in Chrome/Edge.

## Testing

### 1. Test locally without demo songs

```bash
npm run dev
```

Navigate to `/piano_hero.html#sheet-music` (or use the tab from Piano Hero).

You should see:
- "🎼 Sheet Music" tab in navigation
- Sheet Music Player screen with controls
- Song selector showing demo song (or empty if no songs added)
- Error messages for missing files

### 2. Test with a demo song

Create a simple MuseScore file:
1. New score → 4/4 time, C major
2. Add notes: C4, D4, E4, F4, G4, A4, B4, C5 (scale)
3. Export as MusicXML → save as `twinkle-score.musicxml`
4. Export as MIDI → save as `twinkle-backing.mid`
5. Upload both to `sheet-music/demo/`
6. Update the hardcoded demo song URLs in `piano_hero.html`

### 3. Test playback

- Click "Load" button
- Score should render in the display area
- Click Play (▶)
- In Normal mode: cursor should move smoothly
- In Wait mode: should highlight expected notes and wait for MIDI input (if keyboard connected)

## Troubleshooting

**"Web MIDI not supported"**
→ Use Chrome or Edge browser. Firefox and Safari don't support Web MIDI yet.

**Score doesn't render**
→ Check that MusicXML file is valid. Try opening it in MuseScore or Noteflight first.

**MIDI playback cuts out**
→ Verify `Tone.js` is loaded and the Salamander piano samples are accessible from `https://tonejs.github.io/audio/salamander/`

**"File not found" error**
→ Check that Supabase Storage URLs are correct. They should be:
```
https://{PROJECT_ID}.supabase.co/storage/v1/object/public/sheet-music/{path}
```

## Architecture Reference

For detailed info on the Sheet Music Player architecture, see:
```
public/lib/sheet-music-player/SHEET_MUSIC_README.md
```

## Files Modified

- `public/piano_hero.html` — Added Sheet Music tab, screen UI, and initialization code
- `supabase/migrations/20260703_sheet_music_songs.sql` — Database schema
- `public/lib/sheet-music-player/` — All player modules (ScoreRenderer, Timeline, PlaybackEngine, MidiInput, SheetMusicPlayer)

## Next Steps

1. ✅ Database schema created
2. ✅ UI and modules built
3. ⬜ Create demo song files (MusicXML + MIDI)
4. ⬜ Upload demo songs to Supabase Storage
5. ⬜ Update `loadSheetMusicSongs()` to fetch from Supabase (not hardcoded)
6. ⬜ Test with real MIDI keyboard
7. ⬜ Add admin upload UI for teachers
8. ⬜ Implement accuracy scoring and progress tracking
