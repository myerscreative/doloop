-- DIAGNOSTIC CHECKS FOR ADMIN SYSTEM
-- Run these queries in your Supabase SQL Editor to diagnose issues

-- ============================================
-- STEP 1: Check if admin migration was applied
-- ============================================
-- This should show a column called 'is_admin'
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'is_admin';

-- Expected: One row with column_name = 'is_admin', data_type = 'boolean'
-- If empty: The migration hasn't been applied yet!


-- ============================================
-- STEP 2: Check if you're logged in and admin
-- ============================================
-- This shows your current user and admin status
SELECT
  up.id,
  up.email,
  up.is_admin,
  up.created_at
FROM user_profiles up
WHERE up.email = 'dev@dev.com';

-- Expected: One row with is_admin = true
-- If is_admin = false or null: You need to set yourself as admin!
-- If no rows: You need to log into the app first to create your profile!


-- ============================================
-- STEP 3: Check if loop_templates table exists
-- ============================================
SELECT COUNT(*) as template_count
FROM loop_templates;

-- Expected: A number (0 or more)
-- If error: The loop_templates table doesn't exist!


-- ============================================
-- STEP 4: Check if template_creators exists
-- ============================================
SELECT id, name, bio
FROM template_creators
LIMIT 5;

-- Expected: At least one creator row
-- If empty: You need to create a creator first!


-- ============================================
-- STEP 5: List all existing templates
-- ============================================
SELECT
  lt.id,
  lt.title,
  lt.category,
  lt.is_featured,
  tc.name as creator_name
FROM loop_templates lt
LEFT JOIN template_creators tc ON lt.creator_id = tc.id
ORDER BY lt.created_at DESC;

-- Expected: List of templates (might be empty if none created yet)
