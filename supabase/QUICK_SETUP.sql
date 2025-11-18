-- QUICK SETUP FOR ADMIN SYSTEM
-- Run this AFTER you've:
-- 1. Logged into the app with dev@dev.com
-- 2. Applied the main migration (20251118_add_admin_system.sql)

-- ============================================
-- STEP 1: Make dev@dev.com an admin
-- ============================================
UPDATE user_profiles
SET is_admin = true
WHERE email = 'dev@dev.com';

-- Verify it worked:
SELECT email, is_admin FROM user_profiles WHERE email = 'dev@dev.com';


-- ============================================
-- STEP 2: Create a sample template creator
-- ============================================
INSERT INTO template_creators (name, bio, website, instagram, x_twitter)
VALUES (
  'James Clear',
  'Author of Atomic Habits, an easy and proven way to build good habits and break bad ones.',
  'https://jamesclear.com',
  '@jamesclear',
  '@jamesclear'
)
ON CONFLICT (name) DO NOTHING
RETURNING id, name;

-- Save the ID from above to use in the next step!


-- ============================================
-- STEP 3: Create a sample loop template
-- ============================================
-- First, get the creator ID:
DO $$
DECLARE
  creator_id_var UUID;
  template_id_var UUID;
BEGIN
  -- Get or create James Clear
  SELECT id INTO creator_id_var
  FROM template_creators
  WHERE name = 'James Clear'
  LIMIT 1;

  -- Create the Atomic Habits template
  INSERT INTO loop_templates (
    creator_id,
    title,
    description,
    book_course_title,
    affiliate_link,
    color,
    category,
    is_featured
  )
  VALUES (
    creator_id_var,
    'Atomic Habits Daily Loop',
    'Build better habits based on the proven framework from Atomic Habits by James Clear.',
    'Atomic Habits',
    'https://amzn.to/3atomic-habits',
    '#667eea',
    'personal',
    true
  )
  RETURNING id INTO template_id_var;

  -- Add tasks for this template
  INSERT INTO template_tasks (template_id, description, is_recurring, is_one_time, display_order)
  VALUES
    (template_id_var, 'Make it obvious: Review your environment cues', true, false, 1),
    (template_id_var, 'Make it attractive: Pair habit with something you enjoy', true, false, 2),
    (template_id_var, 'Make it easy: Reduce friction for good habits', true, false, 3),
    (template_id_var, 'Make it satisfying: Track your progress', true, false, 4);

  RAISE NOTICE 'Successfully created template with ID: %', template_id_var;
END $$;


-- ============================================
-- STEP 4: Verify everything was created
-- ============================================
SELECT
  lt.title,
  lt.category,
  lt.is_featured,
  tc.name as creator,
  COUNT(tt.id) as task_count
FROM loop_templates lt
JOIN template_creators tc ON lt.creator_id = tc.id
LEFT JOIN template_tasks tt ON lt.id = tt.template_id
GROUP BY lt.id, lt.title, lt.category, lt.is_featured, tc.name;

-- Expected: At least one row showing the template with 4 tasks
