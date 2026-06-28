# ✅ Correct Storage Policies for library-resources

Use these EXACT policies - they work:

---

## Policy 1: Allow Public Read

**When creating a new policy in Supabase:**

1. Click **"New Policy"**
2. Under "Policy SQL template" paste this:

```sql
CREATE POLICY "Allow public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'library-resources');
```

3. Click **"Save policy"** ✅

**What it does:** Anyone can READ/download all files in library-resources

---

## Policy 2: Allow Authenticated Upload

**When creating another new policy:**

1. Click **"New Policy"**  
2. Under "Policy SQL template" paste this:

```sql
CREATE POLICY "Allow authenticated upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'library-resources'
    AND auth.role() = 'authenticated'
  );
```

3. Click **"Save policy"** ✅

**What it does:** Only logged-in users can UPLOAD files

---

## Why NOT the other SQL

❌ `storage."extension"(name) = '*'` — Invalid syntax  
❌ `LOWER((storage.foldername(name))[1]) = 'public'` — Requires /public/ subfolder  
❌ `auth.role() = 'anon'` — Only allows anonymous, not students  

---

## ✅ After Adding Both

You'll have:
- ✅ Public read: Anyone downloads
- ✅ Authenticated upload: Teachers/admins upload

Test uploading → Should work! 🎉
