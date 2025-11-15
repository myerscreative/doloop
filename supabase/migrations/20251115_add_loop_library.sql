-- Migration: Add Loop Library Feature
-- Description: Add support for loop templates with creator information and affiliate links
-- Date: 2025-11-15

-- Table: template_creators
-- Stores information about teachers, coaches, and business leaders
CREATE TABLE IF NOT EXISTS template_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  bio TEXT NOT NULL,
  title VARCHAR(255), -- e.g., "Business Coach", "Author", "CEO"
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
  book_course_title VARCHAR(255) NOT NULL, -- The book/course/training that inspired this loop
  affiliate_link TEXT, -- Affiliate link to purchase the material
  color VARCHAR(7) DEFAULT '#667eea', -- Hex color for the loop
  category VARCHAR(50) DEFAULT 'personal', -- personal, work, daily, shared
  is_featured BOOLEAN DEFAULT FALSE,
  popularity_score INTEGER DEFAULT 0, -- For sorting by popularity
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
  display_order INTEGER DEFAULT 0, -- Order in which tasks should be displayed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: user_template_usage
-- Track which templates users have added to their loops
CREATE TABLE IF NOT EXISTS user_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES loop_templates(id) ON DELETE CASCADE,
  loop_id UUID REFERENCES loops(id) ON DELETE SET NULL, -- The loop created from this template
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, template_id, loop_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_loop_templates_creator ON loop_templates(creator_id);
CREATE INDEX idx_loop_templates_category ON loop_templates(category);
CREATE INDEX idx_loop_templates_featured ON loop_templates(is_featured);
CREATE INDEX idx_template_tasks_template ON template_tasks(template_id);
CREATE INDEX idx_user_template_usage_user ON user_template_usage(user_id);
CREATE INDEX idx_user_template_usage_template ON user_template_usage(template_id);

-- Enable Row Level Security
ALTER TABLE template_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE loop_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_template_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read templates and creators (public library)
CREATE POLICY "Anyone can view template creators"
  ON template_creators FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view loop templates"
  ON loop_templates FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view template tasks"
  ON template_tasks FOR SELECT
  USING (true);

-- RLS Policies: Only authenticated users can track their template usage
CREATE POLICY "Users can view their own template usage"
  ON user_template_usage FOR SELECT
  USING (auth.uid() = user_id);

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
  );

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
  );

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
  ('10000000-0000-0000-0000-000000000003', 'Review top 3 priorities for the day', true, 6);
