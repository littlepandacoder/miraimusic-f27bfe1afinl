# 📋 Storage Policies for library-resources Bucket

After creating the `library-resources` bucket, add these 2 policies:

---

## Policy 1: Allow Public Read (Everyone can download)

1. Click the **library-resources** bucket
2. Click **"Policies"** tab (right side)
3. Click **"New Policy"** button
4. Choose template: **"Allow public read access"**
5. Click **"Use this template"**
6. Click **"Review"** 
7. Click **"Save policy"** ✅

### What it does:
- Students can READ/download files
- Anyone can access files in this bucket

---

## Policy 2: Allow Authenticated Upload (Teachers/Admins can upload)

1. Click **"New Policy"** button again
2. Choose template: **"Allow authenticated users to upload files"**
3. Click **"Use this template"**
4. Click **"Review"**
5. Click **"Save policy"** ✅

### What it does:
- Teachers and Admins can UPLOAD new files
- Only authenticated users can upload
- Students cannot upload (read-only)

---

## ✅ After Adding Both Policies

You should see 2 policies listed:

| Policy | Effect |
|--------|--------|
| Public read | ✅ Anyone downloads files |
| Authenticated upload | ✅ Teachers/Admins upload files |

---

## Test It

1. Hard refresh browser (Ctrl+F5)
2. Go to Resource Library
3. Click "Upload Resource" (teacher/admin only)
4. Try uploading a PDF
5. Should work now! ✅

---

## If You Don't See Template Options

If Supabase shows "Custom" instead of templates, use this SQL:

```sql
-- Allow public read
CREATE POLICY "Allow public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'library-resources');

-- Allow authenticated upload
CREATE POLICY "Allow authenticated upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'library-resources'
    AND auth.role() = 'authenticated'
  );
```

Go to SQL Editor and run it.

---

## Summary

✅ Policy 1: Public can read  
✅ Policy 2: Authenticated users can upload  
✅ Done - uploads should work!
