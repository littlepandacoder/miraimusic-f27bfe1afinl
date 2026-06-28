# Student Profile Feature - Setup Guide

## Overview
I've created a complete student profile system with account settings, subscription management, and payment history. Here's what's been implemented:

## Files Created

### Database
- `supabase/migrations/20260627_add_payments_and_profile_fields.sql`
  - Adds `first_name` and `last_name` to profiles table
  - Creates `payments` table for transaction history
  - Adds cancellation tracking to `user_subscriptions`

### Frontend Pages
- `src/pages/StudentProfile.tsx` - Main profile page accessed from `/profile`

### Components
- `src/components/StudentProfileContent.tsx` - Tab container for profile sections
- `src/components/profile/AccountSettingsTab.tsx` - Edit name, password, email
- `src/components/profile/SubscriptionTab.tsx` - View subscription status, cancel
- `src/components/profile/PaymentHistoryTab.tsx` - View payments and download invoices
- `src/components/profile/CancellationDialog.tsx` - Cancellation survey dialog

### Services & Edge Functions
- `src/lib/profileService.ts` - All profile operations (read, update, password change, etc.)
- `supabase/functions/cancel-subscription/index.ts` - Cancels Stripe subscription

### UI Integration
- Updated `src/components/dashboard/DashboardLayout.tsx` to add "Profile Settings" button in sidebar (desktop & mobile)
- Updated `src/App.tsx` to add the `/profile` route

## Features Implemented

### ✅ Account Settings Tab
- **Edit Profile**: Update first name, last name
- **Email**: Display email (read-only, with note about contact support for changes)
- **Change Password**: 
  - Requires current password verification
  - Matches new password confirmation
  - Shows/hides password fields
  - Redirects to login after successful change

### ✅ Subscription Tab
- **Display Subscription Status**: Shows active or cancelled status
- **Subscription Details**: Plan, subscription ID, start date, status
- **Cancellation Flow**:
  - Two-step dialog with reasons survey
  - Cancel at end of billing period (keeps access until then)
  - Shows what happens when cancelled
  - Stores cancellation reason in database
- **Billing Portal Link**: Access Stripe customer portal for payment methods

### ✅ Payment History Tab
- **Transaction Table**: Date, description, amount, status, invoice link
- **Download Invoices**: Links to invoice PDFs/receipts
- **Status Indicators**: Paid (green), Pending (yellow), Failed (red)
- **Empty State**: Friendly message when no payments exist

### ✅ User Experience
- Accessible from navbar "Profile Settings" button (desktop & mobile)
- Back button to return to dashboard
- Toast notifications for success/error messages
- Loading states for async operations
- Responsive design (mobile-friendly)

## Setup Steps

### 1. Run Database Migration
```bash
# Run this in your Supabase CLI or dashboard
supabase migration up
```

Or manually execute the SQL in:
`supabase/migrations/20260627_add_payments_and_profile_fields.sql`

### 2. Deploy Edge Function
```bash
supabase functions deploy cancel-subscription
```

### 3. Set Environment Variables
The edge function needs your Stripe secret key (should already be set):
```
STRIPE_SECRET_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
```

### 4. Test the Feature
1. Log in to dashboard as student or teacher
2. Click "Profile Settings" in sidebar
3. Test each tab:
   - **Account**: Update name/password
   - **Subscription**: View subscription details, try cancellation flow
   - **Billing**: View payment history

## Database Schema

### Updated `profiles` table
```sql
-- New columns added
first_name: text (nullable)
last_name: text (nullable)
-- Existing: full_name, email, avatar_url
```

### New `payments` table
```sql
id: uuid (primary key)
user_id: uuid (references auth.users)
subscription_id: text
stripe_payment_intent_id: text (unique, nullable)
amount_cents: integer
currency: text (default: USD)
status: text (succeeded, pending, failed)
description: text (nullable)
invoice_url: text (nullable)
receipt_url: text (nullable)
created_at: timestamptz
updated_at: timestamptz
```

### Updated `user_subscriptions` table
```sql
-- New columns added
cancelled_at: timestamptz (nullable)
cancellation_reason: text (nullable)
cancel_at_period_end: boolean (default: false)
```

## Integration with Existing Services

### Stripe Integration
- Uses existing Stripe checkout flow
- Edge function communicates with Stripe API
- Cancellations update both Stripe and local database

### Supabase Auth
- Password change verified against current password
- Email updates trigger Supabase verification
- User ID from auth context used for all queries

### Row Level Security (RLS)
- Users can only view/edit their own profile
- Admins can view/manage all profiles
- Payment history protected by RLS

## API Endpoints Used

### Client-Side Functions (profileService.ts)
- `getProfile(userId)` - Fetch user profile
- `updateProfile(userId, updates)` - Update name, email
- `changePassword(current, new)` - Change password
- `getPaymentHistory(userId)` - Fetch payments
- `getSubscriptionInfo(userId)` - Get subscription details
- `cancelSubscription(userId, reason, cancelAtPeriodEnd)` - Cancel subscription

### Edge Functions Called
- `cancel-subscription` - Handles Stripe cancellation

## Styling

- Uses shadcn/ui components (Dialog, Tabs, Button, Input, Textarea, RadioGroup, Label)
- Tailwind CSS for responsive design
- Lucide React icons
- Dark mode support

## Notes & Future Enhancements

### Current Limitations
1. Email changes require contacting support (Supabase verification flow)
2. Invoice URLs must be populated by your Stripe webhook handler
3. Admin functionality not yet implemented in the UI

### Possible Future Enhancements
1. **Profile Picture**: Upload and store avatar
2. **Email Preferences**: Manage notification settings
3. **Session Management**: View active sessions, logout other devices
4. **Download Data**: GDPR data export
5. **Reactivation**: Allow users to reactivate cancelled subscriptions
6. **Admin Panel**: Admin view of all user profiles
7. **Audit Log**: Track changes to profile/subscription

## Troubleshooting

### "Unauthorized" errors
- Check that user is authenticated
- Verify RLS policies on tables
- Check that `user_id` matches authenticated user

### Stripe cancellation failing
- Verify `STRIPE_SECRET_KEY` is set in edge function secrets
- Check subscription exists in Stripe
- Verify subscription ID in database

### Password change redirects to login
- This is intentional - user needs to re-authenticate with new password
- Happens after ~1.5 second delay to show success message

### Missing invoices
- Ensure your Stripe webhook handler populates `invoice_url` in payments table
- Check webhook is properly configured

## Dependencies

Already installed - no additional packages needed:
- date-fns (^3.6.0) - Date formatting
- lucide-react - Icons
- shadcn/ui - UI components
- @supabase/supabase-js - Database client
- stripe - Edge function uses Stripe SDK

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Edge function deploys without errors
- [ ] Can navigate to /profile from dashboard
- [ ] Can view account settings
- [ ] Can update name and see changes saved
- [ ] Can view subscription status
- [ ] Can see cancellation dialog with reasons
- [ ] Can complete cancellation flow
- [ ] Can view payment history table
- [ ] Can view invoice links
- [ ] Mobile responsive layout works
- [ ] Dark mode works correctly
