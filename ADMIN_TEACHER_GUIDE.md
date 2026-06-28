# 🔐 Admin & Teacher Resource Management Guide

## Overview

Only **Admins** and **Teachers** can upload and manage resources in the Resource Library. This guide explains how to set up and use the feature.

---

## ✅ Role Permissions

| Action | Admin | Teacher | Student |
|--------|-------|---------|---------|
| View Resources | ✅ All | ✅ All | ✅ Public/Student |
| Upload Resources | ✅ Yes | ✅ Yes | ❌ No |
| Edit Resources | ✅ All | ✅ Own | ❌ No |
| Delete Resources | ✅ All | ✅ Own | ❌ No |
| View Statistics | ✅ Yes | ✅ Own | ❌ No |
| Manage Users | ✅ Yes | ❌ No | ❌ No |

---

## 🚀 Getting Started

### Access the Resource Manager

1. **Login** to your dashboard
2. Click **Resource Library** in the left sidebar
3. If you're admin/teacher → You'll see the upload manager
4. If you're a student → You'll see the student library

### Accessing as Admin

```
Dashboard → Resource Library
↓
Shows: Resource Upload Manager (Admin)
Features: Upload, Edit, Delete, View All
```

### Accessing as Teacher

```
Dashboard → Resource Library
↓
Shows: Resource Upload Manager (Teacher)
Features: Upload, Edit Own, Delete Own, View Own
```

---

## 📤 Uploading Resources

### Step-by-Step Upload Process

#### 1. Click "Upload New Resource"
You'll see the upload form with:
- File upload area (drag & drop or click)
- Title field
- Description field
- Category dropdown
- Access level selector
- Tags field

#### 2. Select File
- Formats: PDF or ZIP only
- Max Size: 100 MB
- Drag file over upload area or click to browse

#### 3. Fill in Metadata

**Title** (Required)
- Clear, descriptive name
- Example: "Major and Minor Scales Guide"

**Description**
- Explain what's in the file
- Include difficulty level if applicable
- Example: "Complete guide to building and understanding major and minor scales with practice exercises"

**Category** (Required)
- Choose from predefined categories:
  - Theory
  - Technique
  - Sheet Music
  - Exercises
  - Compositions
  - Reference
  - Other

**Access Level** (Required)
- **Public**: Available to everyone
- **Students Only**: Only for enrolled students (default)
- **Premium**: Only for premium members

**Tags** (Optional)
- Comma-separated keywords
- Makes resources searchable
- Example: "scales,theory,practice,beginner"

#### 4. Click "Upload Resource"
- Progress indicator shows upload status
- Success message appears when complete
- Resource added to upload history

---

## 📋 Upload History & Management

### View Your Uploads

In the "Upload History" section, you'll see:

| Column | Shows |
|--------|-------|
| File Name | Resource title with icon |
| Size | File size in MB/KB |
| Category | Resource category |
| Access Level | public/students/premium |
| Downloads | How many times downloaded |
| Actions | Edit/Delete buttons |

### Edit Resource Metadata

1. Find resource in upload history
2. Click **Edit** icon (pencil)
3. Update:
   - Title
   - Description
   - Category
   - Access Level
   - Tags
4. Save changes
5. Changes apply immediately

### Delete Resource

1. Find resource in upload history
2. Click **Delete** icon (trash)
3. Confirm deletion
4. Resource removed from library
5. File deleted from storage

---

## 🔐 Access Level Guidelines

### Public Resources
**Use for:**
- Free introductory materials
- Sample files
- Open-source content
- Promotional materials

**Visible to:** Everyone (no login required)

**Example:**
- "Piano Learning Basics" (free sample)

---

### Students Only (Default)
**Use for:**
- Course materials
- Practice exercises
- Lesson worksheets
- Intermediate content

**Visible to:**
- Enrolled students
- Teachers
- Admins

**Example:**
- "Week 1 - Scales Practice Exercises"

---

### Premium
**Use for:**
- Exclusive content
- Advanced materials
- Premium subscriber content
- Proprietary resources

**Visible to:**
- Premium members
- Teachers
- Admins

**Example:**
- "Advanced Composition Techniques"

---

## 📊 Monitoring Downloads

### Download Tracking

The system automatically tracks:
- How many times each resource was downloaded
- Date uploaded
- File size
- Resource category

### View Statistics

In upload history:
```
Resource Name     | Downloads | Category
===============|============|==========
Scales Guide    | 247       | Theory
Exercises Week1 | 156       | Exercises
Sheet Music     | 89        | Sheet Music
```

### Use Statistics To:
- Identify popular resources
- Find underutilized materials
- Plan future content
- Measure student engagement

---

## 🎯 Best Practices

### Naming Conventions

✅ **Good Names:**
```
Major-Minor-Scales-Guide.pdf
Piano-Exercises-Week-1.zip
Rhythm-Patterns-Intermediate.pdf
Chord-Progressions-Examples.zip
```

❌ **Bad Names:**
```
File.pdf
Document.pdf
NewFile.zip
tmp.pdf
```

### File Organization

**Keep file sizes manageable:**
- Single PDFs: 5-20 MB each
- Collections: Use ZIP format
- Very large files: Split into parts

**Example Structure:**
```
Theory/
  ├── Scales-Theory.pdf
  ├── Intervals-Guide.pdf
  └── Chord-Construction.pdf

Exercises/
  ├── Week-1-Exercises.zip
  ├── Week-2-Exercises.zip
  └── Week-3-Exercises.zip
```

### Description Tips

Write descriptions that help students:
- What the resource covers
- Recommended level (beginner/intermediate/advanced)
- How long it takes to complete
- Any prerequisites
- Connection to lessons

**Example:**
```
Title: "Major Scale Construction"
Description: "Complete guide to building major scales from any starting note. 
Includes step-by-step formulas, 20+ practice exercises, and answer key. 
Best used after completing Scale Formulas lesson.
Level: Intermediate
Time: 30-45 minutes"
```

### Tags for Discoverability

Use consistent tags:
- Topic: `scales`, `chords`, `rhythm`, `sight-reading`
- Level: `beginner`, `intermediate`, `advanced`
- Type: `exercise`, `theory`, `reference`, `sheet-music`
- Week: `week-1`, `week-2`, etc.

**Example Tags:**
```
scales, theory, practice, intermediate, week-1, homework
```

---

## 🔍 Student Access

### Students See

When students visit Resource Library:

1. **Browse by Category**
   - See all categories
   - Filter by one category at a time
   - Count of resources per category

2. **Search**
   - By title: "scales"
   - By description content
   - By tags: "practice", "week-1"

3. **Download**
   - Click download button
   - File downloads automatically
   - Download count increments

4. **Filter Access**
   - Public: Everyone
   - Students Only: Enrolled students see
   - Premium: Premium members see

---

## 🛡️ Security Features

### Your Uploads Are Protected

✅ **File Validation**
- Only PDF and ZIP allowed
- Size limited to 100MB
- Type checked before upload

✅ **Access Control**
- Only authorized users can upload
- Teachers can only manage own uploads
- Admins can manage all uploads

✅ **Storage Security**
- Files stored in secure Supabase Storage
- Public files available via secure URLs
- Private access enforcement

✅ **Audit Trail**
- Upload history shows when/who uploaded
- Download count tracked
- Deletion is permanent

---

## 🐛 Troubleshooting

### Upload Issues

**Problem:** "Only PDF and ZIP files are allowed"
- **Solution:** Check file extension
- Verify file type (not just extension)
- Try exporting as PDF if needed

**Problem:** "File must be smaller than 100MB"
- **Solution:** Compress large files
- Split into multiple files
- Use ZIP format for multiple files

**Problem:** "Upload button is disabled"
- **Solution:** Select a file first
- Check file is PDF or ZIP
- Verify file size under 100MB

**Problem:** Upload progress stuck
- **Solution:** Refresh the page
- Try different file
- Check internet connection

### Permission Issues

**Problem:** "Access Restricted - Only admins and teachers..."
- **Solution:** Check your user role
- Contact admin to update your role
- Use admin/teacher account instead

**Problem:** Can't edit/delete another teacher's resource
- **Solution:** Teachers can only manage own uploads
- Ask teacher who uploaded or admin

**Problem:** Can't see resource after uploading
- **Solution:** Refresh page
- Check access level (students might not see private)
- Verify resource is_active = true

### Download Issues (Student-facing)

**Problem:** Resource won't download
- **Solution:** Clear browser cache
- Try different browser
- Check download folder permissions

**Problem:** Download count not incrementing
- **Solution:** It may take a moment to update
- Refresh the page
- Try downloading again

---

## 📞 Advanced Administration

### For Admins Only

#### View All Resources
```
Resource Manager → Upload History
Shows: All resources from all teachers
Allows: Edit/delete any resource
```

#### Analytics
- Total resources uploaded
- Most downloaded resources
- Resource distribution by category
- Storage usage

#### User Management
- Assign teacher/admin roles
- Monitor teacher uploads
- Remove inappropriate content

---

## 🎓 Usage Examples

### Example 1: Theory Lesson Resources

**Upload:**
```
Title: Major Scale Theory
Description: Comprehensive guide to major scales including interval patterns, 
construction from any root note, and historical context. Perfect for theory 
students level 2+
Category: Theory
Tags: scales, theory, intermediate, week-3
Access: Students Only
File: Major-Scale-Theory.pdf (8.2 MB)
```

**Result:**
- Students in category see resource
- Can search "scales" or "theory"
- Download count tracked
- Accessible until teacher deletes

### Example 2: Practice Exercise Collection

**Upload:**
```
Title: Weekly Practice Exercises - Week 1
Description: Collection of 50 practice exercises covering scales, arpeggios, 
and rhythm patterns. Includes answer key. Difficulty: Beginner to Intermediate
Category: Exercises
Tags: practice, exercises, beginner, week-1, homework
Access: Students Only
File: Week-1-Exercises.zip (15.5 MB)
```

**Result:**
- All students can download
- Multiple files in one ZIP
- Easy to distribute weekly
- Students get complete set

### Example 3: Exclusive Premium Content

**Upload:**
```
Title: Advanced Composition Techniques
Description: In-depth guide to modern composition strategies. Exclusive premium 
content with 100+ examples and professional analysis.
Category: Compositions
Tags: composition, advanced, premium, professional
Access: Premium
File: Advanced-Composition.pdf (25.0 MB)
```

**Result:**
- Only premium members see
- Reinforces premium value
- Track premium engagement
- Exclusive differentiation

---

## 📈 Performance Tips

### For Teachers

1. **Regular Uploads**
   - Add new resources weekly
   - Students expect fresh content

2. **Monitor Downloads**
   - Check popular resources
   - Create more similar content
   - Remove unpopular ones

3. **Organize Well**
   - Consistent naming
   - Clear categories
   - Relevant tags

4. **Keep It Current**
   - Update outdated materials
   - Remove duplicates
   - Archive old versions

### For Admins

1. **Oversee Quality**
   - Review teacher uploads
   - Ensure consistent standards
   - Remove inappropriate content

2. **Provide Guidelines**
   - Share naming conventions
   - Suggest categories
   - Define quality standards

3. **Promote Usage**
   - Highlight popular resources
   - Email students about new content
   - Integrate into curriculum

---

## 📋 Checklist

- [ ] User role set to Admin or Teacher
- [ ] Can access Resource Manager
- [ ] Uploaded test resource successfully
- [ ] Resource visible in upload history
- [ ] Login as student and find resource
- [ ] Download works correctly
- [ ] Download count incremented
- [ ] Tested search functionality
- [ ] Tested category filtering
- [ ] Created library organization plan

---

## 🎉 You're Ready!

You now have full control over student resources. Start uploading materials to help your students succeed! 🚀
