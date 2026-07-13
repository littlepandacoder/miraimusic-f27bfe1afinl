# Sheet Music Admin Upload Dashboard

A built-in dashboard for admins and teachers to upload sheet music directly from the Piano Hero app without using the Supabase dashboard.

## Features

✅ **Role-based access** — Only admins and teachers see the upload button  
✅ **Two-file upload** — MusicXML + MIDI files in one form  
✅ **Metadata entry** — Title, composer, difficulty, tempo, public/private  
✅ **Automatic storage** — Files saved to Supabase, database entry created  
✅ **Instant availability** — Song appears in dropdown immediately after upload  
✅ **Error handling** — Clear feedback if upload fails  
✅ **File validation** — Rejects wrong file types

## How It Works

### User Flow (for admins/teachers)

1. **Go to Sheet Music tab**
   - Navigate to Piano Hero → "🎼 Sheet Music" tab

2. **Click the upload button** (bottom-right corner, pink circle with ⬆️)
   - Panel appears with upload form

3. **Fill in song details:**
   - **Title** (required) — e.g., "Twinkle Twinkle Little Star"
   - **Composer** (optional) — e.g., "Traditional"
   - **Tempo** (default 120) — BPM for the piece
   - **Difficulty** (1-10, default 5) — For student reference
   - **Files:**
     - **MusicXML** — Score file (.musicxml or .xml)
     - **MIDI** — Backing track (.mid or .midi)
   - **Make public** — Check to let students see it

4. **Click Upload**
   - Files are validated
   - Uploaded to Supabase Storage at `sheet-music/songs/{songId}/`
   - Database entry created in `sheet_music_songs`
   - Success message shown

5. **Song is immediately available**
   - Reload song dropdown (or it auto-updates)
   - Song appears in student list

## Setup

### 1. Deploy Edge Function

```bash
supabase functions deploy sheet-music-upload --use-api
```

This creates the `/sheet-music-upload` endpoint that:
- Validates user is admin or teacher
- Uploads files to Supabase Storage
- Creates database entry
- Cleans up files if database insert fails

### 2. Verify Supabase Bucket Exists

**Supabase Dashboard → Storage:**
- Bucket name: `sheet-music`
- Public: **Yes**
- Policies: Default (public read enabled by RLS)

### 3. Ensure Database Tables Exist

If you haven't run the migration yet:
```bash
supabase db push
```

This creates:
- `sheet_music_songs` — metadata table
- `sheet_music_progress` — student progress tracking

### 4. Verify User Roles

The upload function checks `user_roles` table:
```sql
SELECT user_id, role FROM user_roles 
WHERE role IN ('admin', 'teacher');
```

Make sure admins/teachers have a role entry.

## Technical Details

### Upload Endpoint

**POST** `/functions/v1/sheet-music-upload`

**Request:**
```
Content-Type: multipart/form-data

- musicxmlFile: File (MusicXML)
- midiFile: File (MIDI)
- title: string (required)
- composer: string (optional)
- difficulty: number (1-10)
- base_bpm: number (>0)
- isPublic: boolean
```

**Response (success):**
```json
{
  "success": true,
  "song": {
    "id": "uuid",
    "title": "Song Name",
    "base_bpm": 120,
    "musicxml_path": "songs/{id}/score.musicxml",
    "midi_path": "songs/{id}/backing.mid",
    "is_public": true,
    "created_by": "user-uuid",
    "created_at": "2026-07-03T..."
  },
  "message": "Song uploaded successfully!"
}
```

**Response (error):**
```json
{
  "error": "Error description",
  "message": "Details..."
}
```

### File Validation

- **MusicXML**: Must have `.musicxml` or `.xml` extension
- **MIDI**: Must have `.mid` or `.midi` extension
- **Size**: No hard limit (Supabase storage default is 100GB)

### Storage Path Structure

```
sheet-music/
└── songs/
    └── {songId}/
        ├── score.musicxml
        └── backing.mid
```

Example:
```
sheet-music/songs/twinkle-twinkle-little-star-1688395200000/
├── score.musicxml
└── backing.mid
```

## UI Location

### Upload Button
- **Location**: Bottom-right corner of Sheet Music screen (floating pink circle)
- **Visibility**: Only shown to admins and teachers
- **Label**: ⬆️ (upload emoji)

### Upload Form
- **Triggers**: Click the upload button
- **Position**: Fixed panel (bottom-left to avoid blocking transport controls)
- **Size**: Max 500px wide, responsive

## Error Handling

### Common Errors

**"Not authenticated"**
→ User is not logged in. Log in to Musicable first.

**"Only admins and teachers can upload"**
→ User doesn't have admin or teacher role. Contact admin to assign role.

**"Missing required fields"**
→ Title, MusicXML file, and MIDI file are all required.

**"musicxmlFile must be a MusicXML file"**
→ File extension must be `.musicxml` or `.xml`.

**"midiFile must be a MIDI file"**
→ File extension must be `.mid` or `.midi`.

**"Failed to upload MusicXML"**
→ Check Supabase Storage permissions. Make bucket public and check RLS.

**"Failed to create database entry"**
→ Check `sheet_music_songs` table exists and has correct schema.

## Testing the Feature

### Test as Admin/Teacher

1. Set your user's role to `admin` or `teacher` in Supabase:
   ```sql
   INSERT INTO user_roles (user_id, role) 
   VALUES ('YOUR_USER_ID', 'admin');
   ```

2. Go to Piano Hero → Sheet Music tab

3. You should see the pink ⬆️ button in bottom-right corner

4. Click it to open the upload form

5. Test upload with a demo song:
   - Create in MuseScore (or any notation software)
   - Export as MusicXML and MIDI
   - Upload through the dashboard

### Test as Student

If you have a non-admin test account:
1. Log in as that student
2. The ⬆️ button should **not** appear
3. Songs uploaded by admins should appear in the dropdown

## File Structure

### Code Files

- **Edge Function**: `supabase/functions/sheet-music-upload/index.ts`
- **UI (piano_hero.html)**:
  - Admin panel HTML (lines ~2970–3070)
  - Upload handler functions (lines ~11360–11480)
  - Admin visibility check (line ~11360)

### Related Files

- **Database schema**: `supabase/migrations/20260703_sheet_music_songs.sql`
- **Sheet Music Player**: `public/lib/sheet-music-player/`
- **Documentation**: `SHEET_MUSIC_SETUP.md`, `SHEET_MUSIC_README.md`

## Monitoring

### Check Uploads

**In Supabase Dashboard:**

1. **Storage → sheet-music → songs**
   - Browse uploaded files
   - Verify folder structure

2. **SQL Editor**
   ```sql
   SELECT id, title, composer, created_by, created_at 
   FROM sheet_music_songs
   ORDER BY created_at DESC;
   ```

3. **Edge Functions → Logs**
   - Check `sheet-music-upload` function logs for errors

### Common Issues

**Songs not appearing in dropdown**
→ Check that songs were inserted into database (query above)  
→ Verify `is_public = true` if testing as student

**Files not in storage**
→ Check edge function logs for upload errors  
→ Verify bucket is public and RLS allows uploads

**Slow uploads**
→ Check file size (MusicXML should be <1MB, MIDI <500KB)  
→ Check network connection

## Future Enhancements

- [ ] Drag-and-drop file upload
- [ ] MusicXML preview before upload
- [ ] Batch upload (multiple songs)
- [ ] Edit/update existing songs
- [ ] Delete songs (with confirmation)
- [ ] Import from MuseScore Online directly
- [ ] Auto-detect tempo from MIDI file
- [ ] Duplicate song (clone with new title)

## Security

### Current Implementation

- ✅ **Authentication required** — Only logged-in users can upload
- ✅ **Role check** — Admin/teacher roles verified server-side
- ✅ **File type validation** — Extension checked
- ✅ **RLS enforced** — Database policies restrict access

### RLS Policies

From `20260703_sheet_music_songs.sql`:

```sql
-- Public read
CREATE POLICY "sheet_music_songs_public_read" ON sheet_music_songs
  FOR SELECT USING (is_public = true);

-- Admin/author write
CREATE POLICY "sheet_music_songs_admin_write" ON sheet_music_songs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin')
  );
```

### Potential Improvements

- Add file size limits
- Scan for malicious files before storage
- Rate limit uploads (e.g., 10 per day per user)
- Audit log of all uploads
- Virus scanning integration

## FAQ

**Q: Can students upload songs?**  
A: No, only admins and teachers. Students see the dropdown but no upload button.

**Q: Can I upload the same song twice?**  
A: Yes, but it creates a duplicate entry. Recommend adding unique suffixes to titles if versioning.

**Q: What if upload fails halfway?**  
A: Edge function cleans up partially uploaded files. No orphaned files left.

**Q: How long does upload take?**  
A: Typically 2–5 seconds for small files. Large MusicXML (>5MB) may take longer.

**Q: Can I make a song private?**  
A: Yes, uncheck "Make public" in the form. Only that teacher/admin can see it.

**Q: Do I need to manually create folders in Storage?**  
A: No, edge function creates folder structure automatically.

**Q: Can I edit a song's metadata after upload?**  
A: Currently no. Workaround: delete via SQL and re-upload.

**Q: What's the maximum file size?**  
A: Supabase default is 100GB per file, but practically MusicXML should be <10MB and MIDI <5MB.

## Contact & Support

For issues:
1. Check the error message shown in the upload form
2. Review edge function logs: Supabase Dashboard → Edge Functions
3. Verify database and storage setup with the checklist above
4. Check browser DevTools Console for JavaScript errors
