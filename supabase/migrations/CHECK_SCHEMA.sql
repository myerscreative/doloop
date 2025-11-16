-- =====================================================
-- DoLoop Extended Task Features Migration - FIXED
-- Run this in Supabase SQL Editor to check current schema
-- =====================================================

-- First, let's see what tables and columns exist
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('loops', 'tasks', 'tags', 'task_tags', 'subtasks', 'attachments', 'task_reminders')
ORDER BY table_name, ordinal_position;
