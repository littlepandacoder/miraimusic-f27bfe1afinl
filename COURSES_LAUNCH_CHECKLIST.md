# 🎵 Musicable Courses - Quick Start Checklist

## ✅ Pre-Launch Checklist

### 1. Database Setup
- [ ] Run migration: `supabase db push`
- [ ] Verify tables created in Supabase dashboard
- [ ] Check RLS policies are enabled
- [ ] Test database queries work

### 2. Environment Setup
- [ ] Verify `.env` has `VITE_SUPABASE_URL`
- [ ] Verify `.env` has `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] Restart dev server: `npm run dev`

### 3. Test Basic Functionality
- [ ] Visit `/courses` in browser
- [ ] See subscription gate (not logged in)
- [ ] Log in as instructor/admin
- [ ] See "Create Course" button
- [ ] Click create and fill form
- [ ] Save course successfully

### 4. Test Course Content
- [ ] Add a test video with YouTube URL
- [ ] Verify video player shows and plays
- [ ] Add a test note with markdown
- [ ] Verify markdown renders correctly
- [ ] Test delete video button
- [ ] Test delete note button

### 5. Test PayPal Integration
- [ ] Log out (or use incognito)
- [ ] Visit `/courses` as non-subscriber
- [ ] See PayPal subscription gate page
- [ ] See subscription benefits listed
- [ ] See FAQ section
- [ ] **Using PayPal Sandbox (if testing):**
  - [ ] Click subscribe button
  - [ ] See PayPal modal appear
  - [ ] Complete sandbox payment
  - [ ] Verify subscription saved to DB

### 6. Test Access Control
- [ ] Subscriber can see all courses
- [ ] Non-subscriber sees only paywall
- [ ] Instructor can edit their own courses
- [ ] Instructor cannot edit other instructor's courses
- [ ] Admin can edit any course

### 7. Mobile Testing
- [ ] Test on mobile device or responsive view
- [ ] Course cards display correctly
- [ ] Video player works on mobile
- [ ] Forms are usable on mobile
- [ ] PayPal modal works on mobile

### 8. Performance Testing
- [ ] Load `/courses` with multiple courses
- [ ] Verify no console errors
- [ ] Check page load time (target: < 2s)
- [ ] Verify images load correctly
- [ ] Check for any broken links

### 9. Security Testing
- [ ] Test RLS by querying Supabase directly
- [ ] Verify users can't access others' subscriptions
- [ ] Verify instructors can't delete others' courses
- [ ] Verify non-instructors can't create courses

### 10. Browser Compatibility
- [ ] Test in Chrome/Safari/Firefox
- [ ] Test with JavaScript disabled (graceful fallback)
- [ ] Test with different internet speeds
- [ ] Test video playback on all browsers

---

## 🚀 Launch Steps

### Step 1: Final Migration
```bash
supabase db push
```

### Step 2: Build the App
```bash
npm run build
```
- [ ] Build completes without errors
- [ ] No TypeScript errors

### Step 3: Deploy
```bash
# Your deployment command here (Vercel, etc.)
```

### Step 4: Post-Deployment
- [ ] Visit production `/courses`
- [ ] Test all functionality on live site
- [ ] Verify PayPal button initializes
- [ ] Test with real PayPal account (if ready)
- [ ] Monitor error logs

---

## 🎓 Training Users

### For Instructors:
1. [ ] Show them how to create a course
2. [ ] Show them how to add videos
3. [ ] Show them how to add notes
4. [ ] Show them how to delete content
5. [ ] Show them how to view course statistics

### For Students:
1. [ ] Show them subscription paywall
2. [ ] Walk through PayPal subscription
3. [ ] Show them course browsing
4. [ ] Show them video watching
5. [ ] Show them note taking features

### For Admins:
1. [ ] Show them management dashboard
2. [ ] Show them how to manage all courses
3. [ ] Show them how to view analytics

---

## 📊 Post-Launch Monitoring

### Daily Checks:
- [ ] Monitor error logs
- [ ] Check PayPal transactions
- [ ] Verify courses are accessible
- [ ] Monitor page performance

### Weekly Checks:
- [ ] Review usage analytics
- [ ] Check for bugs reported
- [ ] Verify database backups
- [ ] Review student engagement

### Monthly Checks:
- [ ] Analyze course completion rates
- [ ] Review student feedback
- [ ] Plan new courses
- [ ] Optimize performance

---

## 🔧 Common First-Time Setup Issues

### Issue: "Supabase tables don't exist"
**Fix:**
1. Run: `supabase db push`
2. Verify in Supabase dashboard → Tables
3. Reload page

### Issue: "PayPal button not showing"
**Fix:**
1. Check `.env` variables
2. Restart dev server: `npm run dev`
3. Clear browser cache
4. Check browser console for errors

### Issue: "Can't create course"
**Fix:**
1. Verify you're logged in as instructor
2. Check auth token in localStorage
3. Verify RLS policies in Supabase
4. Check browser console for errors

### Issue: "Videos won't play"
**Fix:**
1. Use full YouTube URL: `youtube.com/watch?v=...`
2. Use full Vimeo URL: `vimeo.com/...`
3. For direct links: Verify CORS headers
4. Check video URL is accessible

---

## 📈 Success Metrics

After launch, track:
- ✅ Number of courses created
- ✅ Number of student subscriptions
- ✅ Number of videos watched
- ✅ Course completion rate
- ✅ Page load time
- ✅ Error rate
- ✅ User satisfaction

---

## 🎯 Phase 2 Enhancements (Future)

After launch success, consider adding:
- [ ] Student progress tracking
- [ ] Course completion certificates
- [ ] Student ratings and reviews
- [ ] Discussion forums
- [ ] Live Q&A sessions
- [ ] Quizzes and assignments
- [ ] Course bundles
- [ ] Affiliate referral program
- [ ] Student testimonials
- [ ] Course analytics dashboard

---

## ✨ Quick Reference

| What | Where | Who |
|------|-------|-----|
| Browse courses | `/courses` | Students & Instructors |
| Create course | `/courses` → "Create Course" | Instructors only |
| Add video | Course detail → Videos "+" | Instructors only |
| Add note | Course detail → Notes "+" | Instructors only |
| Subscribe | `/courses` paywall | Students only |
| View dashboard | `/dashboard` | Students & Instructors |

---

## 🆘 Support Resources

- Full setup guide: `COURSES_SETUP_GUIDE.md`
- Implementation details: `COURSES_IMPLEMENTATION.md`
- Database schema: `migrations/20260502_create_courses_system.sql`
- Code: `/src/pages/Courses.tsx` and `/src/components/courses/`

---

## ✅ Ready to Launch?

Once you've completed this checklist:
1. ✅ Database is set up
2. ✅ PayPal is configured
3. ✅ All tests pass
4. ✅ Performance is good
5. ✅ Security is verified

**You're ready to go live! 🚀**

---

**Last Updated**: May 2, 2026

For questions or issues, refer to `COURSES_SETUP_GUIDE.md`
