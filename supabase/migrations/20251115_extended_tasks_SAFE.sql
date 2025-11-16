-- =====================================================
-- DoLoop Extended Task Features Migration - SAFE VERSION
-- This version checks for existing tables/columns first
-- Date: 2025-11-15
-- =====================================================

-- ===== STEP 1: EXTEND TASKS TABLE =====
-- Only add columns if they don't exist

DO $$
BEGIN
  -- Add priority column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'priority') THEN
    ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'none';
    ALTER TABLE tasks ADD CONSTRAINT check_task_priority
      CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent'));
  END IF;

  -- Add due_date column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'due_date') THEN
    ALTER TABLE tasks ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add notes column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'notes') THEN
    ALTER TABLE tasks ADD COLUMN notes TEXT;
  END IF;

  -- Add time_estimate_minutes column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'time_estimate_minutes') THEN
    ALTER TABLE tasks ADD COLUMN time_estimate_minutes INTEGER;
  END IF;

  -- Add reminder_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'reminder_at') THEN
    ALTER TABLE tasks ADD COLUMN reminder_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add completed_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'completed_at') THEN
    ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create indexes for extended task fields
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_at ON tasks(reminder_at);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);


-- ===== STEP 2: CREATE TAGS TABLE =====

CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add unique constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tags_user_id_name_key'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_user_id_name_key UNIQUE(user_id, name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);


-- ===== STEP 3: CREATE TASK-TAG JUNCTION TABLE =====

CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);


-- ===== STEP 4: CREATE SUBTASKS TABLE =====

CREATE TABLE IF NOT EXISTS subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_subtask_status'
  ) THEN
    ALTER TABLE subtasks ADD CONSTRAINT check_subtask_status
      CHECK (status IN ('pending', 'done'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subtasks_parent_task_id ON subtasks(parent_task_id);


-- ===== STEP 5: CREATE ATTACHMENTS TABLE =====

CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);


-- ===== STEP 6: CREATE TASK REMINDERS TABLE =====

CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_reminder_at ON task_reminders(reminder_at);


-- ===== STEP 7: ENABLE ROW LEVEL SECURITY =====

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;


-- ===== STEP 8: CREATE RLS POLICIES =====

-- Tags policies
DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
CREATE POLICY "Users can manage own tags" ON tags
  FOR ALL USING (auth.uid() = user_id);

-- Task tags policies
DROP POLICY IF EXISTS "Users can manage task tags" ON task_tags;
CREATE POLICY "Users can manage task tags" ON task_tags
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN loops l ON t.loop_id = l.id
      WHERE l.owner_id = auth.uid() OR l.owner = auth.uid()
    )
  );

-- Attachments policies
DROP POLICY IF EXISTS "Users can manage task attachments" ON attachments;
CREATE POLICY "Users can manage task attachments" ON attachments
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN loops l ON t.loop_id = l.id
      WHERE l.owner_id = auth.uid() OR l.owner = auth.uid()
    )
  );

-- Subtasks policies
DROP POLICY IF EXISTS "Users can manage subtasks" ON subtasks;
CREATE POLICY "Users can manage subtasks" ON subtasks
  FOR ALL USING (
    parent_task_id IN (
      SELECT t.id FROM tasks t
      JOIN loops l ON t.loop_id = l.id
      WHERE l.owner_id = auth.uid() OR l.owner = auth.uid()
    )
  );

-- Task reminders policies
DROP POLICY IF EXISTS "Users can manage own reminders" ON task_reminders;
CREATE POLICY "Users can manage own reminders" ON task_reminders
  FOR ALL USING (auth.uid() = user_id);


-- ===== STEP 9: CREATE TRIGGER FUNCTIONS =====

-- Function to auto-set completed_at
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status = 'pending' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_set_task_completed_at ON tasks;
CREATE TRIGGER trigger_set_task_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_at();


-- ===== MIGRATION COMPLETE =====
-- All extended task features have been added successfully!

SELECT 'Migration completed successfully!' AS status;
