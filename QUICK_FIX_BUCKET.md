# 🚀 Quick Fix: Create Storage Bucket NOW

## Bucket Error: "bucket not found"

The `library-resources` storage bucket doesn't exist. Create it now:

---

## ⚡ Quick Setup (3 minutes)

### Step 1: Go to Supabase Storage

1. Open https://supabase.com
2. Login and select your project
3. Click **"Storage"** in left sidebar

### Step 2: Create Bucket

1. Click **"New Bucket"** (top right)
2. **Bucket name**: `library-resources`
3. Check ✅ **"Public bucket"**
4. Click **"Create bucket"**

### Step 3: Set Policies

Click the bucket you just created, then click **"Policies"** tab

#### Policy 1: Allow Public Read
- Click **"New Policy"**
- Choose template: **"Allow public read access"**
- Click **"Use this template"**
- Click **"Review"**
- Click **"Save policy"**

#### Policy 2: Allow Authenticated Upload
- Click **"New Policy"**
- Choose template: **"Allow authenticated users to upload files"**
- Click **"Use this template"**
- Click **"Review"**
- Click **"Save policy"**

---

## ✅ Done!

Now try uploading again. The bucket error should be gone.

---

## Other Errors (Optional Fixes)

### CORS Error on check-subscription-details
This is a separate issue. If subscription checking is critical:
- See CONSOLE_ERRORS_FIXES.md for the fix

### Service Worker Error
May clear on page refresh. If not:
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)

---

## Test Upload

After creating the bucket:
1. Go to Resource Library
2. Try uploading a PDF
3. Should work now ✅

If still failing, check:
- Bucket is public ✅
- Policies are set ✅
- Browser cache cleared ✅
