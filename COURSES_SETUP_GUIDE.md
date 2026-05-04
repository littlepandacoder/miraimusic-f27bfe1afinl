# 🎵 Musicable Courses System - Setup Guide

## Overview
You now have a complete **Skool-like course management system** with:
- ✅ Course creation and management (add/delete videos and notes)
- ✅ PayPal subscription integration
- ✅ Student enrollment system
- ✅ Instructor dashboard
- ✅ Musicable branding throughout

## 🚀 Quick Start

### 1. **Run Database Migration**

Push the new course tables to your Supabase database:

```bash
# Using Supabase CLI
supabase db push

# Or manually:
# Go to Supabase Dashboard → SQL Editor → Run the migration file:
# migrations/20260502_create_courses_system.sql
```

### 2. **Create PayPal App (if not done)**

Your PayPal code is already integrated! The subscription plan ID is:
- **Plan ID**: `P-17K32045868578318NHXU6LA`

The payment flow is:
1. User clicks "Subscribe" on `/courses`
2. PayPal modal appears
3. On approval, subscription saved to `user_subscriptions` table
4. User gains access to courses

### 3. **Access the Courses Page**

Routes available:
- **Students/Subscribers**: `/courses` - View and enroll in courses
- **Create New Course**: Click "Create Course" button (instructors only)
- **View Course**: Click any course card to see videos and notes

---

## 📊 Database Schema

### Tables Created

#### `courses`
- Instructor-created courses
- Fields: title, description, thumbnail, level, price
- Relationships: Many videos, many notes

#### `course_videos`
- Video lessons within courses
- Supports: YouTube, Vimeo, direct MP4/HLS links
- Fields: title, description, video_url, duration

#### `course_notes`
- Study notes with Markdown support
- Fields: title, content (markdown)

#### `course_enrollments`
- Track which students are enrolled in which courses
- Auto-links to courses and users

#### `user_subscriptions`
- Track active PayPal subscriptions
- Fields: subscription_id, plan_id, status

---

## 👥 User Roles & Permissions

### Students
- ✅ Must have active PayPal subscription to access courses
- ✅ Can view all courses and their content
- ✅ Can track enrollment status

### Teachers/Instructors
- ✅ Bypass subscription gate (full access)
- ✅ Can create unlimited courses
- ✅ Can add/edit/delete videos in their courses
- ✅ Can add/edit/delete notes in their courses
- ✅ Can see course statistics

### Admins
- ✅ Same as teachers
- ✅ Can manage all courses (including others')

---

## 📝 How to Create a Course

### For Instructors:

1. Go to `/courses`
2. Click **"Create Course"** button (top right)
3. Fill in:
   - **Title**: Course name
   - **Description**: What students will learn
   - **Thumbnail**: Image URL (optional)
   - **Level**: Beginner/Intermediate/Advanced
   - **Price**: Display price (included in subscription)
4. Click **"Create Course"**

### Add Videos to Course:

1. Click your course to open it
2. On the right sidebar, click **"+"** in Videos section
3. Fill in:
   - **Title**: Lesson name
   - **Description**: What this video covers
   - **Video URL**: 
     - YouTube: `https://www.youtube.com/watch?v=VIDEO_ID`
     - Vimeo: `https://vimeo.com/VIDEO_ID`
     - Direct: `https://example.com/video.mp4`
   - **Duration**: Minutes
4. Click **"Add Video"**

### Add Notes to Course:

1. Same course, click **"+"** in Notes section
2. Fill in:
   - **Title**: Note title
   - **Content**: Write in Markdown format
     - Use `# Headers`, `**bold**`, `- lists`, etc.
3. Click **"Add Note"**

### Delete Content:

- Click the **trash icon** on any video or note
- Confirm deletion

---

## 💳 PayPal Subscription Flow

### For Students:

1. Unsubscribed users see the PayPal subscription gate at `/courses`
2. They see all course benefits + FAQ
3. Click **"Subscribe"** button
4. PayPal modal appears
5. On successful payment:
   - Subscription saved to database
   - User redirected to courses
   - Full access to all courses granted

### Manual Testing:

```javascript
// In browser console to test PayPal button rendering:
console.log(window.paypal) // Should show PayPal SDK loaded

// To reset subscription status (test unenrolled):
await supabase
  .from('user_subscriptions')
  .delete()
  .eq('user_id', YOUR_USER_ID)
```

---

## 🎨 Branding & Styling

All components use **Musicable branding**:
- 🎹 Musicable logo in nav
- 💗 Pink accent color (#ec4899)
- 🌙 Dark mode support
- 📱 Mobile responsive
- Consistent with your existing app

---

## 🔐 Security Features

### Row Level Security (RLS) Enabled:
- ✅ Users can only see their own subscriptions
- ✅ Instructors can only edit their own courses
- ✅ Students can only enroll themselves
- ✅ All enforced at database level

### Course Access Control:
1. Check `user_subscriptions` table for active status
2. If active: Grant access to courses
3. If inactive: Show PayPal subscription gate

---

## 🛠 Advanced: Custom Modifications

### Change PayPal Plan ID:

1. Edit `/src/components/courses/PayPalSubscriptionGate.tsx`:
```typescript
plan_id: "YOUR_NEW_PLAN_ID"  // Line ~48
```

2. Update migration if needed

### Add Course Categories:

Add to `courses` table:
```sql
ALTER TABLE courses ADD COLUMN category TEXT;
```

Then filter by category:
```typescript
const { data } = await supabase
  .from("courses")
  .select("*")
  .eq("category", "piano-basics");
```

### Track Course Progress:

Add progress table:
```sql
CREATE TABLE course_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  course_id UUID REFERENCES courses(id),
  videos_watched INTEGER DEFAULT 0,
  percentage_complete INTEGER DEFAULT 0
);
```

---

## 🐛 Troubleshooting

### Issue: PayPal button not showing
**Solution**: 
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`
- Check browser console for PayPal SDK errors
- Ensure PayPal script loads before component renders

### Issue: Videos not loading
**Solution**:
- For YouTube: Use full URL with `watch?v=` or `youtu.be/` format
- For Vimeo: Use full `vimeo.com/` URL
- For direct links: Ensure CORS headers allow embedding

### Issue: Courses not showing
**Solution**:
- Verify migration ran: `supabase status`
- Check RLS policies are enabled
- Ensure user has active subscription or is instructor

### Issue: Can't delete videos/notes
**Solution**:
- Verify you're the course instructor
- Check database RLS policies
- Use browser console to check auth user ID

---

## 📚 File Structure

```
/src/pages/Courses.tsx                 # Main courses page
/src/components/courses/
  ├── CourseCard.tsx                   # Course listing card
  ├── CourseDetail.tsx                 # Full course view
  ├── CourseEditor.tsx                 # Create/edit courses
  ├── VideoPlayer.tsx                  # Embedded video player
  ├── VideoForm.tsx                    # Add/edit videos
  ├── NoteViewer.tsx                   # Display notes
  ├── NoteForm.tsx                     # Add/edit notes
  └── PayPalSubscriptionGate.tsx        # Subscription page

/migrations/20260502_create_courses_system.sql  # DB schema
```

---

## ✅ Checklist Before Launch

- [ ] Run database migration
- [ ] Test PayPal subscription (use sandbox first)
- [ ] Create test course as instructor
- [ ] Add test videos and notes
- [ ] Subscribe as student (use PayPal test account)
- [ ] Verify course access after subscription
- [ ] Test video playback (YouTube, Vimeo, direct)
- [ ] Test note viewing and Markdown rendering
- [ ] Test delete functionality
- [ ] Test mobile responsiveness
- [ ] Update navigation to link to `/courses`
- [ ] Test with real PayPal account

---

## 📞 Support

Need help? Check:
1. Browser console for errors
2. Supabase logs for database issues
3. Network tab for API calls
4. PayPal sandbox account for testing

---

**Your course system is ready! 🚀**

Start by visiting `/courses` and creating your first course!
