# 🔧 Production Setup Guide - Fix Console Errors

## Console Errors Breakdown

You're seeing 3 main errors that need to be fixed in Supabase:

```
1. ❌ library_resources table missing (404)
2. ❌ CORS blocked on check-subscription-details function
3. ❌ payments table missing (404)
```

---

## Fix 1: Create library_resources Table

### Steps:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Paste this SQL:**

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

-- Create indexes for performance
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

-- Enable RLS
ALTER TABLE library_resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public resources readable"
  ON library_resources FOR SELECT
  USING (is_active = true AND access_level = 'public');

CREATE POLICY "Student resources readable"
  ON library_resources FOR SELECT
  USING (is_active = true AND access_level IN ('public', 'students'));

CREATE POLICY "Teachers can upload"
  ON library_resources FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teachers can update own"
  ON library_resources FOR UPDATE
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Teachers can delete own"
  ON library_resources FOR DELETE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins manage all"
  ON library_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );
```

4. **Click "Run"**
5. ✅ You should see: "Success. No rows returned"

---

## Fix 2: Create payments Table

### Steps:

1. **In SQL Editor, click "New Query"**

2. **Paste this SQL:**

```sql
-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  stripe_payment_id TEXT UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users read own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service insert payments"
  ON payments FOR INSERT
  WITH CHECK (CURRENT_USER = 'service_role');
```

3. **Click "Run"**
4. ✅ You should see: "Success. No rows returned"

---

## Fix 3: Create Storage Bucket for Library Resources

### Steps:

1. **Open Supabase Dashboard**
2. **Click "Storage" in left sidebar**
3. **Click "New Bucket"**
4. **Configure:**
   - Name: `library-resources`
   - Check "Public bucket" ✅
   - Click "Create Bucket"

### Set Storage Policies:

1. **Click the bucket "library-resources"**
2. **Click "Policies" tab**
3. **Click "New Policy"**
4. **For "Allow READ access":**
   - Template: "Allow public read access"
   - Click "Use this template"
   - Click "Review"
   - Click "Save policy"

5. **Click "New Policy" again**
6. **For "Allow INSERT for authenticated users":**
   - Template: "Allow authenticated users to upload files"
   - Click "Use this template"
   - Click "Review"
   - Click "Save policy"

---

## Fix 4: Configure CORS on Supabase Edge Functions

### Steps:

1. **Open your check-subscription-details function** (if you have one)
   - Go to "Edge Functions" in Supabase dashboard
   - Find and open the function

2. **Add CORS headers to the response:**

```typescript
// At the top of your function file
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// In your main handler
Deno.serve(async (req) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Your function logic here
    const response = { /* your data */ };
    
    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        headers: { ...corsHeaders },
        status: 500 
      },
    );
  }
});
```

3. **Deploy the function**

---

## Verification Checklist

After making these changes:

- [ ] Open browser DevTools (F12)
- [ ] Go to Console tab
- [ ] Navigate to `/library` page
- [ ] Should see NO 404 errors for library_resources
- [ ] Should see NO CORS errors
- [ ] Library loads with resources grid

---

## If You Don't Have check-subscription-details Function

If that function doesn't exist, you can ignore the CORS error for now. Create it only when you need subscription checking:

```typescript
// functions/check-subscription-details/index.ts
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
    );

    const { data, error } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ active: !!data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders }, status: 500 },
    );
  }
});
```

---

## Quick Summary

| Error | Fix | Time |
|-------|-----|------|
| library_resources 404 | Run SQL migration | 2 min |
| payments 404 | Run SQL migration | 1 min |
| CORS blocked | Add headers to function | 5 min |
| Missing storage bucket | Create bucket + policies | 3 min |

**Total: ~11 minutes to fully fix**

---

## After Fixes

✅ Library page loads correctly  
✅ No console errors  
✅ Teachers can upload resources  
✅ Students can download  
✅ Subscription checking works  

**All errors will disappear!** 🎉
