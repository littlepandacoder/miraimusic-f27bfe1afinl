# Row Level Security (RLS) Implementation Guide

## Overview

Row Level Security (RLS) is a security feature in Supabase/PostgreSQL that restricts data access at the row level based on user roles and permissions. This ensures that users can only see and modify data they're authorized to access.

## Current Status

✅ **Most tables already have RLS enabled**, including:
- User roles and profiles
- Lessons and lesson plans
- Classes and students
- Districts and schools
- Subscriptions and payments
- Courses and progress
- Foundation content
- Sheet music
- Bookings and availability
- Affiliate system
- Music theory quizzes

## To Enable RLS Policies

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to `SQL Editor`
3. Copy the entire contents of `/supabase/migrations/20260714_comprehensive_rls_policies.sql`
4. Paste and run the SQL

### Option 2: Via Supabase CLI

```bash
supabase db push
```

This will automatically run all pending migrations, including the RLS setup.

## What Each Policy Does

### Authentication-Based Access
- **Users can view their own profile**: Only authenticated users can see their own profile data
- **Users can update their own profile**: Users can only modify their own information

### Role-Based Access
- **Admins**: Can view and manage all data across the system
- **Teachers**: Can view and manage their own lessons, classes, and student data
- **Students**: Can view their own progress, bookings, and course enrollments

### Data Isolation
- **Personal Data**: Users can only see their own subscriptions, payments, and quiz results
- **Class Data**: Teachers can only see their own classes and assigned students
- **District Data**: District members can only see their own district information
- **Course Data**: Users can only access courses they're enrolled in (unless public)

## Security Best Practices

1. **Always Enable RLS**: Never leave a table without RLS if it contains sensitive data
2. **Use Role-Based Policies**: Define policies based on user roles, not individual users
3. **Test Policies**: Use `SELECT * FROM table_name` with different user roles to verify access
4. **Regular Audits**: Periodically review policies to ensure they match your access requirements

## Verifying RLS is Enabled

### Check RLS Status
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Check Policies on a Table
```sql
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';
```

## Common Issues & Solutions

### Issue: "permission denied" error
**Solution**: Check that the user has the required role in `user_roles` table

### Issue: Admin can't see all data
**Solution**: Ensure the admin user has `role = 'admin'` in the `user_roles` table

### Issue: Teachers can't see student data
**Solution**: Verify that the student-teacher relationship is established in `teacher_students` or `class_students` tables

## Next Steps

1. **Run the migration** to apply all RLS policies
2. **Test access** with different user roles (student, teacher, admin)
3. **Monitor** for access-denied errors and adjust policies as needed
4. **Document** any custom policies specific to your business logic

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Security Best Practices](https://supabase.com/docs/guides/platform/security)
