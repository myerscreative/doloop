-- =====================================================
-- DoLoop Complete Database Schema Migration
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Add loop_type column to loops table
ALTER TABLE loops ADD COLUMN IF NOT EXISTS loop_type TEXT DEFAULT 'personal';
ALTER TABLE loops ADD CONSTRAINT IF NOT EXISTS check_loop_type CHECK (loop_type IN ('personal', 'work', 'daily', 'shared'));
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
SELECT DISTINCT id, 0, 0, NULL, NOW()
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 10. Loop Library Feature (2025-11-15)
-- =====================================================

-- Table: template_creators
-- Stores information about teachers, coaches, and business leaders
CREATE TABLE IF NOT EXISTS template_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  bio TEXT NOT NULL,
  title VARCHAR(255),
  photo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: loop_templates
-- Stores pre-made loop templates inspired by teachings
CREATE TABLE IF NOT EXISTS loop_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES template_creators(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  book_course_title VARCHAR(255) NOT NULL,
  affiliate_link TEXT,
  color VARCHAR(7) DEFAULT '#667eea',
  category VARCHAR(50) DEFAULT 'personal',
  is_featured BOOLEAN DEFAULT FALSE,
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: template_tasks
-- Tasks that belong to loop templates
CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES loop_templates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT TRUE,
  is_one_time BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: user_template_usage
-- Track which templates users have added to their loops
CREATE TABLE IF NOT EXISTS user_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES loop_templates(id) ON DELETE CASCADE,
  loop_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, template_id, loop_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loop_templates_creator ON loop_templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_loop_templates_category ON loop_templates(category);
CREATE INDEX IF NOT EXISTS idx_loop_templates_featured ON loop_templates(is_featured);
CREATE INDEX IF NOT EXISTS idx_template_tasks_template ON template_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_user_template_usage_user ON user_template_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_template_usage_template ON user_template_usage(template_id);

-- Enable Row Level Security
ALTER TABLE template_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE loop_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_template_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read templates and creators (public library)
DROP POLICY IF EXISTS "Anyone can view template creators" ON template_creators;
CREATE POLICY "Anyone can view template creators"
  ON template_creators FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can view loop templates" ON loop_templates;
CREATE POLICY "Anyone can view loop templates"
  ON loop_templates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can view template tasks" ON template_tasks;
CREATE POLICY "Anyone can view template tasks"
  ON template_tasks FOR SELECT
  USING (true);

-- RLS Policies: Only authenticated users can track their template usage
DROP POLICY IF EXISTS "Users can view their own template usage" ON user_template_usage;
CREATE POLICY "Users can view their own template usage"
  ON user_template_usage FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own template usage" ON user_template_usage;
CREATE POLICY "Users can insert their own template usage"
  ON user_template_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update popularity score when a template is used
CREATE OR REPLACE FUNCTION increment_template_popularity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE loop_templates
  SET popularity_score = popularity_score + 1
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment popularity when template is added by a user
DROP TRIGGER IF EXISTS on_template_usage ON user_template_usage;
CREATE TRIGGER on_template_usage
  AFTER INSERT ON user_template_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_popularity();

-- Insert sample creators
INSERT INTO template_creators (id, name, bio, title, photo_url) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'James Clear',
    'James Clear is a writer and speaker focused on habits, decision making, and continuous improvement. His work has appeared in the New York Times, Time, and Entrepreneur. His book "Atomic Habits" has sold millions of copies worldwide.',
    'Author & Speaker',
    'https://jamesclear.com/wp-content/uploads/2020/01/james-clear-2019-square.jpg'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'David Allen',
    'David Allen is a productivity consultant and author of the bestselling book "Getting Things Done" (GTD). He has coached over a million professionals on personal productivity and organizational effectiveness.',
    'Productivity Consultant',
    'https://gettingthingsdone.com/wp-content/uploads/2020/07/David-Allen-headshot.jpg'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Tim Ferriss',
    'Tim Ferriss is an entrepreneur, author, and podcaster. He has written several #1 New York Times bestsellers including "The 4-Hour Workweek" and hosts one of the world''s most popular podcasts, The Tim Ferriss Show.',
    'Entrepreneur & Author',
    'https://tim.blog/wp-content/uploads/2020/01/tim-ferriss-high-res.jpg'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample loop templates
INSERT INTO loop_templates (id, creator_id, title, description, book_course_title, affiliate_link, color, category, is_featured) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Atomic Habits Daily Reset',
    'Build better habits with James Clear''s proven framework. This loop helps you implement the Four Laws of Behavior Change: make it obvious, make it attractive, make it easy, and make it satisfying.',
    'Atomic Habits',
    'https://www.amazon.com/Atomic-Habits-Proven-Build-Break/dp/0735211299',
    '#4CAF50',
    'daily',
    true
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'GTD Weekly Review',
    'Master your productivity with David Allen''s Getting Things Done methodology. This weekly review loop ensures you stay on top of all your commitments and maintain a clear mind.',
    'Getting Things Done',
    'https://www.amazon.com/Getting-Things-Done-Stress-Free-Productivity/dp/0143126563',
    '#0CB6CC',
    'work',
    true
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'Morning Routine Optimization',
    'Start your day like a high performer using principles from Tim Ferriss. This morning routine combines journaling, exercise, and strategic planning to set you up for success.',
    'The 4-Hour Workweek',
    'https://www.amazon.com/4-Hour-Workweek-Escape-Live-Anywhere/dp/0307465357',
    '#FEC041',
    'personal',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks for templates
INSERT INTO template_tasks (template_id, description, is_recurring, display_order) VALUES
  -- Atomic Habits Daily Reset
  ('10000000-0000-0000-0000-000000000001', 'Review your habit scorecard', true, 1),
  ('10000000-0000-0000-0000-000000000001', 'Complete your identity-based goal', true, 2),
  ('10000000-0000-0000-0000-000000000001', 'Stack a new habit onto an existing one', true, 3),
  ('10000000-0000-0000-0000-000000000001', 'Track your daily habits in your journal', true, 4),
  ('10000000-0000-0000-0000-000000000001', 'Remove one friction point from a good habit', true, 5),
  ('10000000-0000-0000-0000-000000000001', 'Add one friction point to a bad habit', true, 6),

  -- GTD Weekly Review
  ('10000000-0000-0000-0000-000000000002', 'Clear all inboxes (email, physical, notes)', true, 1),
  ('10000000-0000-0000-0000-000000000002', 'Review and update your project list', true, 2),
  ('10000000-0000-0000-0000-000000000002', 'Review next actions for each context', true, 3),
  ('10000000-0000-0000-0000-000000000002', 'Review waiting-for list', true, 4),
  ('10000000-0000-0000-0000-000000000002', 'Review someday/maybe list', true, 5),
  ('10000000-0000-0000-0000-000000000002', 'Review calendar for next 2 weeks', true, 6),

  -- Morning Routine Optimization
  ('10000000-0000-0000-0000-000000000003', 'Make your bed (1 min)', true, 1),
  ('10000000-0000-0000-0000-000000000003', '5-minute meditation or breathing exercise', true, 2),
  ('10000000-0000-0000-0000-000000000003', 'Morning pages - 3 pages of journaling', true, 3),
  ('10000000-0000-0000-0000-000000000003', '10-minute workout or stretching', true, 4),
  ('10000000-0000-0000-0000-000000000003', 'Healthy breakfast and hydration', true, 5),
  ('10000000-0000-0000-0000-000000000003', 'Review top 3 priorities for the day', true, 6)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 11. Loop Library Enhancements (2025-11-15)
-- =====================================================

-- Table: template_reviews
-- Store user reviews and ratings for templates
CREATE TABLE IF NOT EXISTS template_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES loop_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_reviews_template ON template_reviews(template_id);
CREATE INDEX IF NOT EXISTS idx_template_reviews_user ON template_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_template_reviews_rating ON template_reviews(rating);

ALTER TABLE template_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view template reviews" ON template_reviews;
CREATE POLICY "Anyone can view template reviews"
  ON template_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own reviews" ON template_reviews;
CREATE POLICY "Users can insert their own reviews"
  ON template_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON template_reviews;
CREATE POLICY "Users can update their own reviews"
  ON template_reviews FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON template_reviews;
CREATE POLICY "Users can delete their own reviews"
  ON template_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Add average rating and review count to loop_templates
ALTER TABLE loop_templates ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE loop_templates ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Function to update template rating statistics
CREATE OR REPLACE FUNCTION update_template_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE loop_templates
  SET
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM template_reviews
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM template_reviews
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    )
  WHERE id = COALESCE(NEW.template_id, OLD.template_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_template_review_change ON template_reviews;
CREATE TRIGGER on_template_review_change
  AFTER INSERT OR UPDATE OR DELETE ON template_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_template_rating_stats();

-- Table: template_favorites
CREATE TABLE IF NOT EXISTS template_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES loop_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_favorites_template ON template_favorites(template_id);
CREATE INDEX IF NOT EXISTS idx_template_favorites_user ON template_favorites(user_id);

ALTER TABLE template_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own favorites" ON template_favorites;
CREATE POLICY "Users can view their own favorites"
  ON template_favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own favorites" ON template_favorites;
CREATE POLICY "Users can insert their own favorites"
  ON template_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON template_favorites;
CREATE POLICY "Users can delete their own favorites"
  ON template_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- More sample creators and templates
INSERT INTO template_creators (id, name, bio, title, photo_url) VALUES
  ('00000000-0000-0000-0000-000000000004', 'Cal Newport', 'Cal Newport is a computer science professor at Georgetown University and the author of several books including "Deep Work" and "Digital Minimalism".', 'Author & Professor', NULL),
  ('00000000-0000-0000-0000-000000000005', 'Robin Sharma', 'Robin Sharma is a leadership expert and author of "The 5 AM Club" and "The Monk Who Sold His Ferrari".', 'Leadership Expert', NULL),
  ('00000000-0000-0000-0000-000000000006', 'BJ Fogg', 'BJ Fogg is a behavior scientist at Stanford University and founder of the Behavior Design Lab. His book "Tiny Habits" presents a breakthrough method for creating good habits.', 'Behavior Scientist', NULL),
  ('00000000-0000-0000-0000-000000000007', 'Stephen Covey', 'Stephen Covey was an educator and author of "The 7 Habits of Highly Effective People", one of the most influential business books of all time.', 'Author & Educator', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO loop_templates (id, creator_id, title, description, book_course_title, affiliate_link, color, category, is_featured, popularity_score) VALUES
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'Deep Work Session', 'Maximize focus with Cal Newport''s Deep Work methodology for distraction-free concentration.', 'Deep Work', 'https://www.amazon.com/Deep-Work-Focused-Success-Distracted/dp/1455586692', '#2196F3', 'work', true, 150),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'The 5 AM Club Routine', 'Join the 5 AM Club with Robin Sharma''s 20/20/20 formula: movement, reflection, and growth.', 'The 5 AM Club', 'https://www.amazon.com/AM-Club-Morning-Elevate-Life/dp/1443456624', '#FF5722', 'daily', true, 200),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', 'Tiny Habits Starter Pack', 'Start small with BJ Fogg''s Tiny Habits method using behavior design principles.', 'Tiny Habits', 'https://www.amazon.com/Tiny-Habits-Changes-Change-Everything/dp/0358003326', '#8BC34A', 'personal', true, 175),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000007', '7 Habits Weekly Check-In', 'Master Stephen Covey''s 7 Habits with this weekly reflection loop.', 'The 7 Habits of Highly Effective People', 'https://www.amazon.com/Habits-Highly-Effective-People-Powerful/dp/1982137274', '#9C27B0', 'work', true, 250)
ON CONFLICT (id) DO NOTHING;

INSERT INTO template_tasks (template_id, description, is_recurring, display_order) VALUES
  ('10000000-0000-0000-0000-000000000004', 'Choose your most important task for deep work', true, 1),
  ('10000000-0000-0000-0000-000000000004', 'Eliminate all distractions (phone, email, social media)', true, 2),
  ('10000000-0000-0000-0000-000000000004', 'Set a timer for 90-120 minutes of focused work', true, 3),
  ('10000000-0000-0000-0000-000000000004', 'Work with full concentration on the chosen task', true, 4),
  ('10000000-0000-0000-0000-000000000005', 'Wake up at 5:00 AM', true, 1),
  ('10000000-0000-0000-0000-000000000005', '20 min: Move - Exercise to activate your body', true, 2),
  ('10000000-0000-0000-0000-000000000005', '20 min: Reflect - Meditation or journaling', true, 3),
  ('10000000-0000-0000-0000-000000000005', '20 min: Grow - Read or learn something new', true, 4),
  ('10000000-0000-0000-0000-000000000006', 'After I pour my morning coffee, I will do 2 pushups', true, 1),
  ('10000000-0000-0000-0000-000000000006', 'After I brush my teeth, I will floss one tooth', true, 2),
  ('10000000-0000-0000-0000-000000000006', 'After I sit down for lunch, I will take 3 deep breaths', true, 3),
  ('10000000-0000-0000-0000-000000000007', 'Habit 1: Be Proactive - Review your circle of influence', true, 1),
  ('10000000-0000-0000-0000-000000000007', 'Habit 2: Begin with the End in Mind - Revisit your mission', true, 2),
  ('10000000-0000-0000-0000-000000000007', 'Habit 3: Put First Things First - Time block important tasks', true, 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Migration Complete!
-- =====================================================

