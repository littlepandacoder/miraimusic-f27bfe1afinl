# 🔧 Console Errors - Fixes

Three main console errors need to be addressed:

---

## Error 1: Service Worker Response Clone Issue

**Error**: `Failed to execute 'clone' on 'Response': Response body is already used`

**Location**: `sw.js:27`

**Cause**: Service worker is trying to clone a Response body that's already been consumed

**Fix**: Update service worker to handle response cloning properly

```javascript
// In sw.js or your service worker file
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Clone BEFORE consuming
        if (response) {
          return response.clone();
        }

        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }

            // Clone before caching
            const responseToCache = response.clone();
            caches.open('v1').then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          });
      })
      .catch(() => {
        // Return offline page
        return new Response('Offline', { status: 503 });
      })
  );
});
```

---

## Error 2: CORS Policy Blocked Supabase Function

**Error**: `Access to fetch at 'supabase...functions/v1/check-subscription-details' blocked by CORS policy`

**Location**: Dashboard, Scale Builder, Profile pages

**Cause**: Supabase Edge Functions don't have CORS headers configured

**Fix Option A**: Update Supabase Edge Function CORS headers

```typescript
// In your check-subscription-details edge function
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Your function logic
    const response = { subscriptionStatus: 'active' };
    
    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
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

**Fix Option B**: Create CORS helper (reusable)

```typescript
// _shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

---

## Error 3: Failed Profile Data Load (404)

**Error**: `Failed to load resource: the server responded with a status of 404`

**Location**: Payments table query: `payments?select=*&user_id=eq.{id}`

**Cause**: `payments` table doesn't exist or RLS policy blocks access

**Fix**: Create payments table in Supabase

```sql
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  stripe_payment_id TEXT UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can read own payments
CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert
CREATE POLICY "Service role can insert payments"
  ON payments FOR INSERT
  WITH CHECK (CURRENT_USER = 'service_role');

-- Index for performance
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
```

---

## Summary of Fixes

| Error | Root Cause | Fix |
|-------|-----------|-----|
| Response clone | SW consuming body twice | Update service worker logic |
| CORS blocked | No CORS headers on functions | Add CORS headers to edge functions |
| 404 payments | Table missing | Create payments table with RLS |

---

## Quick Implementation Checklist

- [ ] Update service worker at `/public/sw.js` or wherever it's located
- [ ] Add CORS headers to Supabase Edge Functions:
  - `check-subscription-details`
  - Any other functions called from frontend
- [ ] Create `payments` table in Supabase
- [ ] Test profile page loading
- [ ] Check browser console - errors should clear

---

## Testing After Fixes

```bash
# Test 1: Open browser DevTools Console
# Navigate to Profile page
# Should show no CORS errors

# Test 2: Check Network tab
# fetch calls to Supabase functions should return 200

# Test 3: Verify profile data loads
# User profile should display correctly
```

---

## Prevention

1. **Service Workers**: Always clone responses BEFORE consuming
2. **Edge Functions**: Always include CORS headers
3. **Database Tables**: Create all schema tables before deployment
4. **Testing**: Test on actual domain, not localhost (CORS differs)

---

All errors are fixable without code changes to the main app. They're infrastructure/configuration issues, not application bugs.
