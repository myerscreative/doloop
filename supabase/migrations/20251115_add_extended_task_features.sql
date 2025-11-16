-- =====================================================
-- DoLoop Extended Task Features Migration
-- Adds: priority, due dates, notes, tags, attachments,
--       subtasks, time estimates, reminders
-- Date: 2025-11-15
-- =====================================================

-- ===== EXTEND TASKS TABLE =====

-- Add priority column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'none';
ALTER TABLE tasks ADD CONSTRAINT IF NOT EXISTS check_task_priority
  CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent'));

-- Add due date column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Add notes/additional description
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add time estimate in minutes
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_estimate_minutes INTEGER;

-- Add reminder timestamp
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMP WITH TIME ZONE;

-- Add completed_at timestamp (for tracking when task was completed)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_at ON tasks(reminder_at);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);


-- ===== TAGS TABLE =====

CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name) -- Prevent duplicate tag names per user
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);


-- ===== TASK-TAG JUNCTION TABLE =====

CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);


-- ===== ATTACHMENTS TABLE =====

CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type
  file_size BIGINT NOT NULL, -- bytes
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON attachments(uploaded_by);


-- ===== SUBTASKS TABLE =====

CREATE TABLE IF NOT EXISTS subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT check_subtask_status CHECK (status IN ('pending', 'done'))
);

CREATE INDEX IF NOT EXISTS idx_subtasks_parent_task_id ON subtasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_sort_order ON subtasks(parent_task_id, sort_order);


-- ===== TASK REMINDERS TABLE =====

CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_user_id ON task_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_reminder_at ON task_reminders(reminder_at);
CREATE INDEX IF NOT EXISTS idx_task_reminders_is_sent ON task_reminders(is_sent);


-- ===== ROW LEVEL SECURITY (RLS) =====

-- Enable RLS on new tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for TAGS
DROP POLICY IF EXISTS "Users can view own tags" ON tags;
CREATE POLICY "Users can view own tags" ON tags
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own tags" ON tags;
CREATE POLICY "Users can create own tags" ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tags" ON tags;
CREATE POLICY "Users can update own tags" ON tags
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tags" ON tags;
CREATE POLICY "Users can delete own tags" ON tags
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for TASK_TAGS
DROP POLICY IF EXISTS "Users can view task tags from their tasks" ON task_tags;
CREATE POLICY "Users can view task tags from their tasks" ON task_tags
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN loops l ON t.loop_id = l.id
      WHERE l.owner_id = auth.uid()
        OR l.id IN (SELECT loop_id FROM loop_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage task tags for their tasks" ON task_tags;
CREATE POLICY "Users can manage task tags for their tasks" ON task_tags
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN loops l ON t.loop_id = l.id
      WHERE l.owner_id = auth.uid()
        OR l.id IN (SELECT loop_id FROM loop_members WHERE user_id = auth.uid())
    )
  );

-- RLS Policies for ATTACHMENTS
DROP POLICY IF EXISTS "Users can view attachments from their tasks" ON attachments;
CREATE POLICY "Users can view attachments from their tasks" ON attachments
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN loops l ON t.loop_id = l.id
      WHERE l.owner_id = auth.uid()
        OR l.id IN (SELECT loop_id FROM loop_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can upload attachments to their tasks" ON attachments;
CREATE POLICY "Users can upload attachments to their tasks" ON attachments
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN loops l ON t.loop_id = l.id
      WHERE l.owner_id = auth.uid()
        OR l.id IN (SELECT loop_id FROM loop_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own attachments" ON attachments;
CREATE POLICY "Users can delete their own attachments" ON attachments
  FOR DELETE USING (auth.uid() = uploaded_by);

-- RLS Policies for SUBTASKS
DROP POLICY IF EXISTS "Users can view subtasks from their tasks" ON subtasks;
CREATE POLICY "Users can view subtasks from their tasks" ON subtasks
  FOR SELECT USING (
    parent_task_id IN (
      SELECT t.id FROM tasks t
      JOIN loops l ON t.loop_id = l.id
      WHERE l.owner_id = auth.uid()
        OR l.id IN (SELECT loop_id FROM loop_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage subtasks for their tasks" ON subtasks;
CREATE POLICY "Users can manage subtasks for their tasks" ON subtasks
  FOR ALL USING (
    parent_task_id IN (
      SELECT t.id FROM tasks t
      JOIN loops l ON t.loop_id = l.id
      WHERE l.owner_id = auth.uid()
        OR l.id IN (SELECT loop_id FROM loop_members WHERE user_id = auth.uid())
    )
  );

-- RLS Policies for TASK_REMINDERS
DROP POLICY IF EXISTS "Users can view own reminders" ON task_reminders;
CREATE POLICY "Users can view own reminders" ON task_reminders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own reminders" ON task_reminders;
CREATE POLICY "Users can create own reminders" ON task_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reminders" ON task_reminders;
CREATE POLICY "Users can update own reminders" ON task_reminders
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reminders" ON task_reminders;
CREATE POLICY "Users can delete own reminders" ON task_reminders
  FOR DELETE USING (auth.uid() = user_id);


-- ===== HELPER FUNCTIONS =====

-- Function to update subtask updated_at timestamp
CREATE OR REPLACE FUNCTION update_subtask_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subtask_updated_at ON subtasks;
CREATE TRIGGER trigger_update_subtask_updated_at
  BEFORE UPDATE ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_subtask_updated_at();

-- Function to set completed_at when task status changes to done
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


-- ===== MIGRATION COMPLETE =====
-- All extended task features have been added successfully!
