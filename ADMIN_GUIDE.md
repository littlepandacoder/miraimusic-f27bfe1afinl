# Admin Guide: Managing Student Memberships

## Quick Start

### Accessing the Feature

1. Log in as admin
2. Go to **Dashboard → User Management**
3. You'll see all students with their membership status

## Understanding the Status Column

```
┌─────────────────┬──────────────┐
│ Membership      │ What it means │
├─────────────────┼──────────────┤
│ ● Active        │ Student can access courses and materials │
│ ⏸ Paused        │ Student blocked from accessing content  │
│ No subscription │ Student hasn't purchased yet            │
└─────────────────┴──────────────┘
```

## Pausing a Membership

### Step 1: Find the Student
- Scroll through the user list
- Look for the yellow **⏸ Paused** or green **● Active** badge

### Step 2: Click the Pause Button
- Find the student's row
- Click the **yellow pause icon** (⏸) in the Actions column
- The pause dialog will appear

### Step 3: Add a Reason (Optional)
- In the dialog, you can add a reason for pausing:
  - "Student requested break"
  - "Payment issue needs resolution"
  - "Disciplinary action"
  - Any other custom reason
- Reason is optional but helpful for record-keeping

### Step 4: Confirm
- Click **"Pause Membership"**
- The system will process immediately
- Student's status will change to **Paused**

## Resuming a Membership

### Step 1: Find the Paused Student
- Look for students with the yellow **⏸ Paused** badge

### Step 2: Click the Resume Button
- Click the **green play icon** (▶) in the Actions column
- Confirmation dialog appears

### Step 3: Confirm
- Click **"Resume Membership"**
- Student's status will change back to **Active**
- Student gains access to courses immediately

## What Happens When You Pause

### Immediate Actions
- Student login is allowed
- Dashboard shows "Membership Paused" message
- Student cannot access any courses or learning materials
- All other account features remain available

### In the Database
- `paused_at` column gets timestamp of pause
- `pause_reason` column stores your optional reason
- `updated_at` column updates to current time
- `status` column remains "active" (pause is separate)

### Student Experience
```
┌─────────────────────────────────────────┐
│  🔒 Membership Paused                   │
│                                         │
│  Your membership has been paused by     │
│  the admin. Please contact support      │
│  to resume your access.                 │
│                                         │
│  [Contact Support]                      │
└─────────────────────────────────────────┘
```

## Common Scenarios

### Scenario 1: Student Requests Break
**Action**: Pause with reason "Student requested break"
- Preserves their data and progress
- Easy to resume when they're ready
- No need to create new subscription

### Scenario 2: Payment Issue
**Action**: Pause with reason "Payment failed"
- Prevents further billing issues
- Student knows why they lost access
- Can resume once payment is resolved

### Scenario 3: Temporary Suspension
**Action**: Pause with reason "Temporary suspension"
- Clear audit trail of when/why paused
- Can quickly resume when justified
- All student data remains intact

## Best Practices

✅ **DO:**
- Add a reason when pausing (helps later)
- Notify students via email when pausing
- Document any policies in your pause reason
- Resume promptly when issue is resolved

❌ **DON'T:**
- Pause as a deletion method (use delete instead)
- Forget to communicate with student
- Leave students paused indefinitely
- Use pause for active management (use roles for that)

## Troubleshooting

### I don't see the Pause button
- **Possible reason**: Student has no subscription
- **Solution**: Only students with subscriptions show pause buttons

### The pause didn't work
- **Possible reason**: You're not admin
- **Solution**: Check your admin status in User Management
- **Note**: Only admins can pause memberships

### Student still has access after pause
- **Possible reason**: Cache issue
- **Solution**: Ask student to clear browser cache and refresh
- **Or**: Log out and log back in

## Technical Details for Support

### How to Verify Pause Status

Use Supabase SQL Editor:
```sql
SELECT 
  u.email,
  s.status,
  s.paused_at,
  s.pause_reason,
  s.updated_at
FROM user_subscriptions s
JOIN profiles u ON u.user_id = s.user_id
WHERE s.user_id = '[student-uuid]'
```

### To Manually Pause/Resume (Emergency)

```sql
-- Pause
UPDATE user_subscriptions
SET paused_at = now(), 
    pause_reason = 'Manual pause'
WHERE user_id = '[student-uuid]';

-- Resume
UPDATE user_subscriptions
SET paused_at = NULL, 
    pause_reason = NULL
WHERE user_id = '[student-uuid]';
```

## Audit Log

All pauses are tracked with:
- **Who**: Current admin (via auth)
- **When**: `paused_at` timestamp
- **Why**: `pause_reason` text field
- **How**: Always via admin_pause_membership function

Review the database to see:
- When each pause occurred
- Why each pause was applied
- When they were resumed

---

## Need Help?

- Check the feature documentation: `PAUSE_MEMBERSHIP_FEATURE.md`
- View implementation details: `IMPLEMENTATION_SUMMARY.md`
- Contact development team for technical issues
