-- =====================================================
-- DIAGNOSTIC: Check what exists in your database
-- Run this FIRST to see what you have
-- =====================================================

-- 1. What tables exist?
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Does tasks table exist and have an id column?
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- 3. Does loops table exist?
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'loops'
ORDER BY ordinal_position;

-- 4. What constraints exist on tasks?
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'tasks';
