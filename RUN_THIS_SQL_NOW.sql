-- =====================================================
-- COPY AND PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR
-- This combines both migrations you need to run
-- =====================================================

-- ============== MIGRATION 1: Fix RLS Policies ==============

-- Drop all existing policies on loops
DROP POLICY IF EXISTS "Users can view their own loops" ON loops;
DROP POLICY IF EXISTS "Users can create loops" ON loops;
DROP POLICY IF EXISTS "Users can update their own loops" ON loops;
DROP POLICY IF EXISTS "Users can delete their own loops" ON loops;
DROP POLICY IF EXISTS "Users can view shared loops" ON loops;
DROP POLICY IF EXISTS "Users can manage their own loops" ON loops;

-- Create simple policy for loops
CREATE POLICY "Users can manage their own loops"
  ON loops
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Drop all existing policies on tasks
DROP POLICY IF EXISTS "Users can view tasks in their loops" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their loops" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their loops" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their loops" ON tasks;
DROP POLICY IF EXISTS "Users can manage tasks in their loops" ON tasks;

-- Drop function if it exists
DROP FUNCTION IF EXISTS user_owns_loop(UUID);

-- Create security definer function
CREATE OR REPLACE FUNCTION user_owns_loop(loop_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM loops 
    WHERE id = loop_uuid 
    AND owner_id = auth.uid()
  );
$$;

-- Create policy for tasks
CREATE POLICY "Users can manage tasks in their loops"
  ON tasks
  FOR ALL
  USING (user_owns_loop(loop_id))
  WITH CHECK (user_owns_loop(loop_id));

-- Fix other policies
DROP POLICY IF EXISTS "Users can view archived tasks" ON archived_tasks;
DROP POLICY IF EXISTS "Users can create archived tasks" ON archived_tasks;
DROP POLICY IF EXISTS "Users can manage archived tasks" ON archived_tasks;

CREATE POLICY "Users can manage archived tasks"
  ON archived_tasks
  FOR ALL
  USING (user_owns_loop(loop_id))
  WITH CHECK (user_owns_loop(loop_id));

DROP POLICY IF EXISTS "Users can view their own streaks" ON user_streaks;
DROP POLICY IF EXISTS "Users can update their own streaks" ON user_streaks;
DROP POLICY IF EXISTS "Users can manage their own streaks" ON user_streaks;

CREATE POLICY "Users can manage their own streaks"
  ON user_streaks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view loop members" ON loop_members;
DROP POLICY IF EXISTS "Loop owners can manage members" ON loop_members;
DROP POLICY IF EXISTS "Users can manage loop members" ON loop_members;

CREATE POLICY "Users can manage loop members"
  ON loop_members
  FOR ALL
  USING (user_owns_loop(loop_id) OR user_id = auth.uid())
  WITH CHECK (user_owns_loop(loop_id));

-- ============== MIGRATION 2: Add completed Column ==============

-- Add the completed column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;

-- Migrate existing data from status to completed
UPDATE tasks 
SET completed = (status = 'done')
WHERE completed IS NULL OR completed = false;

-- Update any NULL values
UPDATE tasks 
SET completed = false 
WHERE completed IS NULL;

-- Make completed NOT NULL
ALTER TABLE tasks ALTER COLUMN completed SET NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_is_one_time ON tasks(is_one_time);

-- =====================================================
-- DONE! Now test by running:
-- SELECT id, description, status, completed FROM tasks LIMIT 5;
-- =====================================================

