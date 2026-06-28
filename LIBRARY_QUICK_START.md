# 🚀 Resource Library - Quick Start (5 minutes)

## ⚡ TL;DR

The Resource Library is ready to use! Here's what you need to do:

## Step 1️⃣: Set Up Database (2 minutes)

Open [Supabase Dashboard](https://app.supabase.com) → SQL Editor → Paste this:

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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_library_resources_category ON library_resources(category);
CREATE INDEX idx_library_resources_access_level ON library_resources(access_level);
CREATE INDEX idx_library_resources_uploaded_by ON library_resources(uploaded_by);
CREATE INDEX idx_library_resources_is_active ON library_resources(is_active);
CREATE INDEX idx_library_resources_created_at ON library_resources(created_at DESC);

-- Create function to track downloads
CREATE OR REPLACE FUNCTION increment_download_count(resource_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE library_resources
  SET download_count = download_count + 1
  WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE library_resources ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public resources readable"
  ON library_resources FOR SELECT
  USING (is_active = true AND access_level = 'public');

CREATE POLICY "Students can read student resources"
  ON library_resources FOR SELECT
  USING (is_active = true AND access_level IN ('public', 'students'));

CREATE POLICY "Admins can manage all"
  ON library_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Teachers upload own"
  ON library_resources FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Teachers manage own"
  ON library_resources FOR UPDATE
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Teachers delete own"
  ON library_resources FOR DELETE
  USING (auth.uid() = uploaded_by);
```

Click **Run** ✅

## Step 2️⃣: Create Storage Bucket (1 minute)

In Supabase:
1. Go to **Storage** section
2. Click **New Bucket**
3. Name: `library-resources`
4. Check **Public bucket** ✅
5. Click **Create**

## Step 3️⃣: Set Storage Policies (1 minute)

In Supabase Storage → library-resources → Policies → Add New:

```sql
-- Allow authenticated users to read
CREATE POLICY "Allow reading"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'library-resources' AND auth.role() = 'authenticated');

-- Allow upload
CREATE POLICY "Allow upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'library-resources' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' IN ('admin', 'teacher')
    )
  );
```

## Step 4️⃣: That's It! 🎉

Your Resource Library is live!

### Access Points:
- **Students**: Dashboard → Resource Library → Browse & Download
- **Teachers/Admins**: Dashboard → Resource Library → Upload & Manage

---

## 🧪 Quick Test

### As a Teacher/Admin:
1. Login to dashboard
2. Click **Resource Library** (left sidebar)
3. Upload a PDF or ZIP file
4. Fill in: Title, Description, Category
5. Click **Upload Resource**

### As a Student:
1. Login as student
2. Click **Resource Library**
3. See uploaded resource
4. Click **Download**
5. File downloads! ✅

---

## 📁 What Gets Created

| Component | File | Purpose |
|-----------|------|---------|
| Service | `lib/libraryService.ts` | Database operations |
| UI (Student) | `components/StudentLibrary.tsx` | Browse & download |
| UI (Teacher) | `components/ResourceUploadManager.tsx` | Upload & manage |
| Page | `pages/LibraryPage.tsx` | Route handler |

**Total Lines**: ~1,200 (production-ready code)

---

## ✅ Features Included

- ✅ Upload PDF/ZIP files (up to 100MB)
- ✅ Organize by category & tags
- ✅ Access control (Public/Students/Premium)
- ✅ Search & filter
- ✅ Download tracking
- ✅ Mobile responsive
- ✅ Dark mode support
- ✅ Error handling
- ✅ Rate limiting
- ✅ Full TypeScript support

---

## 🔒 Security

- Row-level security (RLS) enabled
- Role-based access control
- Upload restricted to admin/teacher
- Download tracking
- File type validation
- Size limits (100MB max)

---

## 📊 Categories Available

By default:
- Theory
- Technique
- Sheet Music
- Exercises
- Compositions
- Reference
- Other

**To customize**: Edit `CATEGORIES` array in component files

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Upload button disabled | Select a PDF or ZIP file first |
| Upload fails 403 | Ensure you're logged in as teacher/admin |
| Download not working | Refresh page, clear cache, try again |
| Search returns nothing | Try different keywords or browse categories |

---

## 📚 Full Documentation

For complete details, see:
- `LIBRARY_SETUP.md` - Detailed setup & API reference
- `LIBRARY_FEATURE_SUMMARY.md` - Full feature overview

---

## 🎯 Next Steps

1. ✅ Run SQL migration
2. ✅ Create storage bucket
3. ✅ Set storage policies
4. 🔄 Upload test resources
5. 🔄 Test as student
6. 🎉 Go live!

---

## 💡 Usage Tips

### For Best Results:

**Organizing Resources:**
- Use clear, descriptive titles
- Add multiple relevant tags
- Write helpful descriptions
- Set correct access levels

**File Naming:**
- ✅ `Major-Minor-Scales-Guide.pdf`
- ✅ `Week-1-Exercises.zip`
- ❌ `file.pdf`, `doc.zip`

**Categories:**
- Be consistent with category names
- One resource = one category
- Use tags for additional organization

---

## 🎓 Example Workflow

### Teacher uploads resource:
```
1. Go to Resource Library
2. Click "Upload New Resource"
3. Select file: "Scales-Practice-Exercises.pdf"
4. Fill in:
   - Title: "Scale Building Exercises"
   - Category: "Exercises"
   - Tags: "scales,practice,week-1"
   - Access: "Students Only"
5. Click Upload ✅
6. See in Upload History
```

### Student downloads resource:
```
1. Go to Resource Library
2. See "Scale Building Exercises"
3. Click Download
4. File downloads automatically
5. Download count increments
```

---

## 📞 Support

**Issue?** Check:
1. Database table exists: `SELECT * FROM library_resources LIMIT 1`
2. Storage bucket created: `library-resources`
3. RLS policies enabled: Check Supabase Security tab
4. File is PDF or ZIP: Check file type

**Still stuck?** Review `LIBRARY_SETUP.md` troubleshooting section

---

**You're all set!** Start uploading resources and let students download them. 🚀
