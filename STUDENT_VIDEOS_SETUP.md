# Student Videos Feature Setup

This guide walks through setting up the student testimonial videos feature.

## 1. Database Setup

The migration file `migrations/20260602_create_student_testimonials.sql` creates the required table:

```sql
-- Run this migration in your Supabase project:
psql -h [host] -U postgres -d [database] -f migrations/20260602_create_student_testimonials.sql
```

Or via Supabase dashboard:
1. Go to SQL Editor
2. Create a new query
3. Paste the contents of `migrations/20260602_create_student_testimonials.sql`
4. Execute

The table includes:
- `id` - UUID primary key
- `name` - Student name
- `age` - Student age
- `achievement` - Achievement/certification (e.g., "Trinity Grade 1 — Distinction")
- `quote` - Student testimonial quote
- `icon` - Emoji icon (default: 🎹)
- `video_url` - URL to uploaded video
- `thumbnail_url` - URL to video thumbnail
- `sort_order` - Display order on "Our Students" page
- `created_at`, `updated_at` - Timestamps

## 2. Storage Bucket Setup

Create a new public storage bucket in Supabase:

1. Go to Storage → Buckets
2. Create a new bucket named `student-videos`
3. Make it **Public** so videos can be accessed
4. (Optional) Set upload size limits in bucket configuration

## 3. Using the Feature

### Admin Dashboard

1. Go to Admin Dashboard → "Our Students Videos" (in the sidebar)
2. Click "Add Student" to create a new student entry
3. Fill in:
   - Name (e.g., "Emma")
   - Age
   - Achievement (e.g., "Trinity Grade 1 — Distinction")
   - Quote (student testimonial)
   - Icon emoji
4. Click "Add"
5. Upload video and thumbnail files for each student

### Public Display

The "OUR STUDENTS" section on the homepage will automatically:
- Fetch student data from the database
- Display student cards with testimonials
- Play videos when clicked
- Show thumbnails as backgrounds

## 4. Video Specifications

**Video Files:**
- Format: MP4, WebM, or other HTML5 video formats
- Maximum size: (Set in Supabase bucket settings, typically 100MB)
- Aspect ratio: 16:9 recommended
- Duration: 30 seconds to 2 minutes ideal

**Thumbnail Images:**
- Format: JPG, PNG
- Maximum size: 5MB
- Aspect ratio: 16:10 (to match card design)
- Dimensions: 1024x640px or similar

## 5. Troubleshooting

**Storage bucket not found:**
- Ensure you created the `student-videos` bucket in Supabase
- Verify it's set to Public

**Uploads failing:**
- Check Supabase storage settings and RLS policies
- Verify file size is within limits
- Check browser console for detailed error messages

**Videos not appearing on homepage:**
- Ensure `sort_order` is set correctly (0 for first, 1 for second, etc.)
- Check that `video_url` and `thumbnail_url` are populated
- Clear browser cache and reload

## 6. Database Structure Reference

View current students:
```sql
SELECT * FROM student_testimonials ORDER BY sort_order;
```

Update student order:
```sql
UPDATE student_testimonials 
SET sort_order = 1 
WHERE id = '[student_id]';
```

Delete a student:
```sql
DELETE FROM student_testimonials 
WHERE id = '[student_id]';
```
