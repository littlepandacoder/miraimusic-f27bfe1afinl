# Pause Membership Feature - Implementation Guide

## Overview
The pause membership feature allows admins to pause and resume student memberships directly from the admin panel. This is useful for students who need temporary breaks from their subscription without cancelling.

## What's New

### 1. Database Changes (`supabase/migrations/20260610_add_membership_pause.sql`)

Two new columns added to `user_subscriptions` table:
- `paused_at` (timestamptz): Timestamp when membership was paused; NULL if active
- `pause_reason` (text): Optional reason for pause set by admin

New RPC function:
- `admin_pause_membership(_user_id uuid, _pause boolean, _reason text)`: Toggles pause status for a user's subscription

### 2. Admin Interface Updates (`src/components/dashboard/admin/ManageUsers.tsx`)

#### New Column: Membership Status
Shows the current status of each student's membership:
- **Active** (green badge with play icon): Membership is active
- **Paused** (yellow badge with pause icon): Membership is currently paused
- **No subscription**: Student hasn't purchased a subscription yet

#### New Action Button: Pause/Resume
- **Pause icon** (yellow): Click to pause an active membership
- **Play icon** (green): Click to resume a paused membership
- Only available for students with active subscriptions

#### Pause Dialog
When clicking the pause/resume button:
1. For pausing: Can enter an optional reason (e.g., "Student requested", "Temporary freeze")
2. For resuming: Simple confirmation to reactivate membership
3. Dialog shows which action will be performed

## How to Use

### From the Admin Dashboard

1. Navigate to **Admin Dashboard → User Management**
2. Find the student in the user list
3. Check the "Membership" column to see current status
4. Click the pause icon (yellow) to pause or play icon (green) to resume
5. In the dialog:
   - **To pause**: Optionally add a reason, then click "Pause Membership"
   - **To resume**: Click "Resume Membership"

### Database Details

The pause is tracked with:
- `paused_at`: Contains the timestamp of when it was paused (NULL when active)
- `pause_reason`: Contains optional admin notes
- `updated_at`: Updated to current time when pause/resume occurs

## Student Impact

When a membership is paused:
- Access to courses is restricted until resumed
- Subscription remains in database (not cancelled)
- Can be resumed at any time without creating a new subscription
- No additional charge when resumed

## Technical Implementation

### RPC Function: `admin_pause_membership`

```sql
admin_pause_membership(_user_id uuid, _pause boolean, _reason text)
```

Parameters:
- `_user_id`: UUID of the student
- `_pause`: true to pause, false to resume
- `_reason`: Optional pause reason (only used when pausing)

Returns:
```json
{
  "success": true,
  "paused": true/false,
  "message": "Membership paused" or "Membership resumed"
}
```

Error handling:
- Returns error if user is not admin
- Returns error if subscription not found

### Component State

The ManageUsers component now tracks:
- `subscriptions`: Map of user_id → subscription data
- `pauseTarget`: Currently selected user for pause/resume
- `pauseReason`: Optional reason input
- `isPauseLoading`: Loading state during pause operation

## Testing

To test the feature:

1. **Create a test student** with an active subscription
2. **Pause the membership**:
   - Click pause button
   - Optionally add a reason
   - Confirm pause
   - Verify status changes to "Paused"
3. **Resume the membership**:
   - Click resume button
   - Confirm
   - Verify status changes back to "Active"
4. **Check database**:
   ```sql
   SELECT user_id, status, paused_at, pause_reason 
   FROM public.user_subscriptions 
   WHERE user_id = '<student_uuid>';
   ```

## Future Enhancements

Potential improvements:
- Pause duration limits
- Automatic resume after set period
- Student self-service pause requests
- Pause history/audit log
- Email notifications when paused/resumed
- Pause limit per subscription period

## Files Changed

- `supabase/migrations/20260610_add_membership_pause.sql` - Database migration
- `src/components/dashboard/admin/ManageUsers.tsx` - Admin UI component
