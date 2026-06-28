# Resource Library Setup Guide

This guide helps you set up the Resource Library feature for your application.

## Features

✅ **For Students:**
- Browse resources by category
- Search resources by title, description, or tags
- Download PDF and ZIP files
- Track download history

✅ **For Teachers & Admins:**
- Upload PDF and ZIP files (up to 100MB)
- Organize resources by category and tags
- Control access levels (Public, Students Only, Premium)
- Monitor download statistics
- Edit and delete resources

✅ **Categories Included:**
- Theory
- Technique
- Sheet Music
- Exercises
- Compositions
- Reference
- Other

## Database Setup

### Step 1: Create Storage Bucket

In Supabase console:

1. Go to **Storage** → **Buckets**
2. Click **New Bucket**
3. Name: `library-resources`
4. Make it **Public** (for downloads)
5. Click **Create**

### Step 2: Run Migration SQL

Copy and run this SQL in your Supabase SQL editor:

```sql
-- Create library_resources table
CREATE TABLE IF NOT EXISTS library_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('pdf', 'zip', 'document', 'video', 'audio')),
  access_level TEXT NOT NULL DEFAULT 'students' CHECK (access_level IN ('public', 'students', 'premium')),
  category TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_by_name TEXT,
  tags TEXT[] DEFAULT '{}',
  download_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_library_resources_category ON library_resources(category);
CREATE INDEX idx_library_resources_access_level ON library_resources(access_level);
CREATE INDEX idx_library_resources_uploaded_by ON library_resources(uploaded_by);
CREATE INDEX idx_library_resources_is_active ON library_resources(is_active);
CREATE INDEX idx_library_resources_created_at ON library_resources(created_at DESC);

-- Create function to increment download count
CREATE OR REPLACE FUNCTION increment_download_count(resource_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE library_resources
  SET download_count = download_count + 1
  WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security)
ALTER TABLE library_resources ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active resources based on access level
CREATE POLICY "Public resources are readable by everyone"
  ON library_resources FOR SELECT
  USING (is_active = true AND access_level = 'public');

CREATE POLICY "Students can read student resources"
  ON library_resources FOR SELECT
  USING (is_active = true AND access_level IN ('public', 'students'));

CREATE POLICY "Premium users can read premium resources"
  ON library_resources FOR SELECT
  USING (is_active = true);

-- Policy: Only admins and resource owner can insert/update/delete
CREATE POLICY "Admins can manage all resources"
  ON library_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Teachers and admins can insert resources"
  ON library_resources FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (raw_user_meta_data->>'role' IN ('admin', 'teacher'))
      )
    )
  );

CREATE POLICY "Teachers can manage their own resources"
  ON library_resources FOR UPDATE
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Teachers can delete their own resources"
  ON library_resources FOR DELETE
  USING (auth.uid() = uploaded_by);
```

### Step 3: Set Storage Policies

In Supabase Storage Settings for `library-resources` bucket:

```sql
-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated users to read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'library-resources' AND auth.role() = 'authenticated');

-- Allow admins and teachers to upload
CREATE POLICY "Allow admins and teachers to upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'library-resources'
    AND (
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' IN ('admin', 'teacher')
      )
    )
  );

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'library-resources'
    AND (
      SELECT uploaded_by FROM library_resources
      WHERE file_url = storage.objects.name
    ) = auth.uid()
  );
```

## Component Usage

### For Students - Display Library

```tsx
import { StudentLibrary } from "@/components/StudentLibrary";

export default function Page() {
  return <StudentLibrary />;
}
```

### For Admin/Teachers - Upload Manager

```tsx
import { ResourceUploadManager } from "@/components/ResourceUploadManager";

export default function Page() {
  return <ResourceUploadManager />;
}
```

## API Functions

### Get Available Resources

```typescript
import { getAvailableResources } from "@/lib/libraryService";

// Get all resources (students only & public)
const resources = await getAvailableResources();

// Get resources by access level
const premiumResources = await getAvailableResources("premium");
```

### Get Resources by Category

```typescript
import { getResourcesByCategory } from "@/lib/libraryService";

const theoryResources = await getResourcesByCategory("Theory");
```

### Search Resources

```typescript
import { searchResources } from "@/lib/libraryService";

const results = await searchResources("scales");
```

### Upload Resource

```typescript
import { uploadResource } from "@/lib/libraryService";

const file = new File([...], "scales.pdf", { type: "application/pdf" });

const resource = await uploadResource(file, {
  title: "Major and Minor Scales",
  description: "Complete guide to building scales",
  category: "Theory",
  accessLevel: "students",
  tags: ["scales", "theory", "practice"],
});
```

### Record Download

```typescript
import { recordDownload } from "@/lib/libraryService";

await recordDownload(resourceId);
```

### Get Upload History

```typescript
import { getUploadHistory } from "@/lib/libraryService";

// Get all uploads (for admins)
const allUploads = await getUploadHistory();

// Get specific user's uploads
const userUploads = await getUploadHistory(userId);
```

### Get Statistics

```typescript
import { getResourceStats } from "@/lib/libraryService";

const stats = await getResourceStats();
// Returns: {
//   totalResources: number,
//   byType: { pdf: 10, zip: 5 },
//   byCategory: { Theory: 8, Exercises: 7 },
//   totalDownloads: 150
// }
```

## File Upload Limits

- **Maximum file size**: 100 MB
- **Allowed formats**: PDF, ZIP
- **Storage**: Supabase Storage (unlimited with your plan)

## Access Levels

| Level | Who Can See | Use Case |
|-------|-----------|----------|
| Public | Everyone | Free resources |
| Students | Enrolled students + public | Course materials |
| Premium | Premium subscribers + admins | Exclusive content |

## Best Practices

### For Admins/Teachers

1. **Organize with categories** - Use consistent category names
2. **Add descriptive tags** - Help students find resources easily
3. **Set proper access levels** - Control who can access content
4. **Monitor downloads** - Check which resources are popular
5. **Keep descriptions clear** - Tell students what's in the file

### File Naming

Use descriptive names:
- ✅ `Major-Minor-Scales-Guide.pdf`
- ✅ `Piano-Exercises-Week-1.zip`
- ❌ `Document.pdf`
- ❌ `file.zip`

### Storage Optimization

For large collections:
- Compress multiple files into ZIP archives
- Delete unused resources periodically
- Check download count to identify underused materials

## Troubleshooting

### Upload Fails with "403 Forbidden"
- Ensure your user role is "admin" or "teacher"
- Check storage bucket policies are set correctly
- Verify file type is PDF or ZIP

### Files Not Downloading
- Check storage bucket is set to "Public"
- Verify file_url is valid
- Clear browser cache and try again

### Search Not Working
- Ensure tags are properly formatted (comma-separated)
- Check PostgreSQL full-text search is enabled
- Try searching by title or category instead

### Performance Issues (Many Resources)
- Add indexes (already in migration SQL)
- Archive old resources (set `is_active = false`)
- Use pagination when fetching results

## Monitoring & Analytics

Track resource usage:

```typescript
// Get resource with download stats
const resource = await getResourceById(id);
console.log(`Downloads: ${resource.download_count}`);

// Get all stats
const stats = await getResourceStats();
console.log(`Most used category: ${Object.keys(stats.byCategory)[0]}`);
```

## Rate Limiting

API requests are rate-limited to prevent abuse:
- Standard endpoints: 30 requests/minute
- Upload endpoint: Included in standard limits

See `/api/RATE_LIMITING_AND_CACHING.md` for details.

## Next Steps

1. ✅ Run the migration SQL
2. ✅ Create the storage bucket
3. ✅ Set up RLS policies
4. ✅ Integrate components into your app
5. 📋 Test uploading and downloading
6. 📋 Add resources for students
7. 📋 Monitor usage and gather feedback

## Support

For issues:
- Check Supabase logs for error details
- Verify table structure with `SELECT * FROM library_resources LIMIT 1`
- Review RLS policies in Supabase dashboard
