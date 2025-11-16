-- =====================================================
-- DoLoop Complete Database Schema Migration
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Add loop_type column to loops table
ALTER TABLE loops ADD COLUMN IF NOT EXISTS loop_type TEXT DEFAULT 'personal';

-- Add constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_loop_type') THEN
    ALTER TABLE loops ADD CONSTRAINT check_loop_type CHECK (loop_type IN ('personal', 'work', 'daily', 'shared'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_loops_loop_type ON loops(loop_type);

-- 1b. Add next_reset_at column to loops table for scheduled resets
ALTER TABLE loops ADD COLUMN IF NOT EXISTS next_reset_at TIMESTAMP WITH TIME ZONE;
UPDATE loops 
SET next_reset_at = CASE 
  WHEN reset_rule = 'daily' THEN NOW() + INTERVAL '1 day'
  WHEN reset_rule = 'weekly' THEN NOW() + INTERVAL '7 days'
  ELSE NULL
END
WHERE next_reset_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loops_next_reset_at ON loops(next_reset_at);

-- 2. Add is_one_time column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_one_time BOOLEAN DEFAULT FALSE;
UPDATE tasks SET is_one_time = FALSE WHERE is_one_time IS NULL;
ALTER TABLE tasks ALTER COLUMN is_one_time SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_is_one_time ON tasks(is_one_time);

-- 3. Add archived_tasks table
CREATE TABLE IF NOT EXISTS archived_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_task_id UUID NOT NULL,
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add user_streaks table (global user-level streak)
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_streak INT DEFAULT 0 NOT NULL,
  longest_streak INT DEFAULT 0 NOT NULL,
  last_completed_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_archived_tasks_loop_id ON archived_tasks(loop_id);
CREATE INDEX IF NOT EXISTS idx_archived_tasks_completed_at ON archived_tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);

-- 6. Enable RLS
ALTER TABLE archived_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for archived_tasks
DROP POLICY IF EXISTS "Users can view archived tasks from their loops" ON archived_tasks;
CREATE POLICY "Users can view archived tasks from their loops" ON archived_tasks
  FOR SELECT USING (
    loop_id IN (
      SELECT id FROM loops WHERE owner_id = auth.uid()
      UNION
      SELECT loop_id FROM loop_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert archived tasks for their loops" ON archived_tasks;
CREATE POLICY "Users can insert archived tasks for their loops" ON archived_tasks
  FOR INSERT WITH CHECK (
    loop_id IN (
      SELECT id FROM loops WHERE owner_id = auth.uid()
      UNION
      SELECT loop_id FROM loop_members WHERE user_id = auth.uid()
    )
  );

-- 8. RLS Policies for user_streaks (global streak)
DROP POLICY IF EXISTS "Users can view own streak" ON user_streaks;
CREATE POLICY "Users can view own streak" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own streak" ON user_streaks;
CREATE POLICY "Users can update own streak" ON user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can modify own streak" ON user_streaks;
CREATE POLICY "Users can modify own streak" ON user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- 9. Initialize streaks for existing users
INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_completed_date, updated_at)
SELECT DISTINCT id, 0, 0, NULL::TIMESTAMP WITH TIME ZONE, NOW()
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- Extended Task Features Migration
-- =====================================================

-- Add priority column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'none';

-- Add constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_task_priority') THEN
    ALTER TABLE tasks ADD CONSTRAINT check_task_priority
      CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent'));
  END IF;
END $$;

-- Add extended task fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_estimate_minutes INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for extended fields
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_at ON tasks(reminder_at);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- Create task-tag junction table
CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (task_id, tag_id)
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_tags_task_id') THEN
    ALTER TABLE task_tags ADD CONSTRAINT fk_task_tags_task_id FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_tags_tag_id') THEN
    ALTER TABLE task_tags ADD CONSTRAINT fk_task_tags_tag_id FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attachments_task_id') THEN
    ALTER TABLE attachments ADD CONSTRAINT fk_attachments_task_id FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attachments_uploaded_by') THEN
    ALTER TABLE attachments ADD CONSTRAINT fk_attachments_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_task_id UUID NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT check_subtask_status CHECK (status IN ('pending', 'done'))
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subtasks_parent_task_id') THEN
    ALTER TABLE subtasks ADD CONSTRAINT fk_subtasks_parent_task_id FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subtasks_parent_task_id ON subtasks(parent_task_id);

-- Create task reminders table
CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reminder_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_reminders_task_id') THEN
    ALTER TABLE task_reminders ADD CONSTRAINT fk_task_reminders_task_id FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_reminders_user_id') THEN
    ALTER TABLE task_reminders ADD CONSTRAINT fk_task_reminders_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_reminder_at ON task_reminders(reminder_at);

-- Enable RLS on new tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
CREATE POLICY "Users can manage own tags" ON tags
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for task_tags
DROP POLICY IF EXISTS "Users can manage task tags" ON task_tags;
CREATE POLICY "Users can manage task tags" ON task_tags
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN loops l ON t.loop_id = l.id
      WHERE l.owner_id = auth.uid()
    )
  );

-- RLS Policies for attachments
DROP POLICY IF EXISTS "Users can manage task attachments" ON attachments;
CREATE POLICY "Users can manage task attachments" ON attachments
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN loops l ON t.loop_id = l.id
      WHERE l.owner_id = auth.uid()
    )
  );

-- RLS Policies for subtasks
DROP POLICY IF EXISTS "Users can manage subtasks" ON subtasks;
CREATE POLICY "Users can manage subtasks" ON subtasks
  FOR ALL USING (
    parent_task_id IN (
      SELECT t.id FROM tasks t
      JOIN loops l ON t.loop_id = l.id
      WHERE l.owner_id = auth.uid()
    )
  );

-- RLS Policies for task_reminders
DROP POLICY IF EXISTS "Users can manage own reminders" ON task_reminders;
CREATE POLICY "Users can manage own reminders" ON task_reminders
  FOR ALL USING (auth.uid() = user_id);

-- Trigger to auto-set completed_at
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status = 'pending' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_task_completed_at ON tasks;
CREATE TRIGGER trigger_set_task_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_at();

-- =====================================================
-- Migration Complete!
-- =====================================================

