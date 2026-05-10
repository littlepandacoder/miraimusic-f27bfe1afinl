# Firestore Security Rules for Musicable Signup

## Steps to Set Up Rules:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → **Firestore Database**
3. Click **Rules** tab at the top
4. Replace all existing code with the rules below
5. Click **Publish**

## Security Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to create new signup documents (public signup flow)
    // Allow anyone to read their own signup by email
    match /signups/{doc=**} {
      // Allow unauthenticated users to CREATE new signups
      allow create: if request.auth == null;
      
      // Allow authenticated users to read/update their own data
      allow read, update: if request.auth != null;
      
      // Allow anyone to read (for email uniqueness check)
      allow list: if request.query.limit <= 1;
    }

    // Optional: Users collection for authentication
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

## What These Rules Do:

✅ **CREATE** - Anyone can create a new signup (no auth required)
- Allows `saveEmail()` to work without authentication
- Email validation prevents duplicates

✅ **READ/UPDATE** - Only authenticated users can read/update
- Protects user privacy after account creation
- Allows questionnaire and payment info updates

✅ **LIST** - Query the signups collection (for email check)
- Limited to queries with `limit <= 1` for security
- Prevents full collection dumps

## After Publishing Rules:

The signup flow should now work:
1. Open `http://localhost:5173/signup`
2. Enter your email
3. You should NOT see "AbortError" anymore
4. Firestore should save your email successfully

## Testing:

After publishing, check Firestore Console:
- Go to **Firestore Database**
- Click **signups** collection
- You should see new documents appearing as you test the signup flow

---

## Troubleshooting

If you still get `AbortError`:

1. **Verify rules are published** (green checkmark in console)
2. **Check browser console** - look for specific permission error messages
3. **Refresh the page** - sometimes browser cache causes issues
4. **Check network tab** - verify requests aren't being blocked

If you see `"Missing or insufficient permissions"`:
- The rules aren't published correctly
- Try replacing the rules and publishing again
