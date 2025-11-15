-- Migration: Loop Library Enhancements
-- Description: Add ratings, reviews, favorites, and more templates
-- Date: 2025-11-15

-- =====================================================
-- 1. Template Ratings & Reviews
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
  UNIQUE(template_id, user_id) -- One review per user per template
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_template_reviews_template ON template_reviews(template_id);
CREATE INDEX IF NOT EXISTS idx_template_reviews_user ON template_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_template_reviews_rating ON template_reviews(rating);

-- Enable RLS
ALTER TABLE template_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
  -- Update the template's average rating and review count
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

-- Triggers to update rating stats
DROP TRIGGER IF EXISTS on_template_review_change ON template_reviews;
CREATE TRIGGER on_template_review_change
  AFTER INSERT OR UPDATE OR DELETE ON template_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_template_rating_stats();

-- =====================================================
-- 2. Template Favorites
-- =====================================================

-- Table: template_favorites
-- Store user's favorite templates
CREATE TABLE IF NOT EXISTS template_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES loop_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id) -- One favorite per user per template
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_template_favorites_template ON template_favorites(template_id);
CREATE INDEX IF NOT EXISTS idx_template_favorites_user ON template_favorites(user_id);

-- Enable RLS
ALTER TABLE template_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- =====================================================
-- 3. Add More Sample Creators
-- =====================================================

INSERT INTO template_creators (id, name, bio, title, photo_url) VALUES
  (
    '00000000-0000-0000-0000-000000000004',
    'Cal Newport',
    'Cal Newport is a computer science professor at Georgetown University and the author of several books including "Deep Work" and "Digital Minimalism". His work focuses on the intersection of technology, productivity, and the quest for a meaningful life.',
    'Author & Professor',
    'https://calnewport.com/wp-content/uploads/2019/10/cal-headshot-2019.jpg'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Robin Sharma',
    'Robin Sharma is a leadership expert and author of "The 5 AM Club" and "The Monk Who Sold His Ferrari". He has worked with Fortune 500 companies and spoken to audiences around the world about personal mastery and leadership.',
    'Leadership Expert',
    'https://www.robinsharma.com/wp-content/uploads/2020/01/robin-sharma.jpg'
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'BJ Fogg',
    'BJ Fogg is a behavior scientist at Stanford University and founder of the Behavior Design Lab. His book "Tiny Habits" presents a breakthrough method for creating good habits and breaking bad ones.',
    'Behavior Scientist',
    'https://behaviordesignlab.org/wp-content/uploads/2020/01/bj-fogg.jpg'
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Stephen Covey',
    'Stephen Covey (1932-2012) was an educator, businessman, and author of "The 7 Habits of Highly Effective People", one of the most influential business books of all time. His principles have transformed millions of lives worldwide.',
    'Author & Educator',
    'https://www.franklincovey.com/wp-content/uploads/2020/01/stephen-covey.jpg'
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    'Marie Kondo',
    'Marie Kondo is an organizing consultant and author of "The Life-Changing Magic of Tidying Up". Her KonMari Method has helped millions of people declutter their homes and lives, sparking joy in the process.',
    'Organizing Consultant',
    'https://konmari.com/wp-content/uploads/2020/01/marie-kondo.jpg'
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    'Hal Elrod',
    'Hal Elrod is the author of "The Miracle Morning", a book that shows how to transform your life before 8AM. His morning routine has been adopted by millions of people seeking to improve their health, wealth, and relationships.',
    'Author & Speaker',
    'https://miraclemorning.com/wp-content/uploads/2020/01/hal-elrod.jpg'
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    'Greg McKeown',
    'Greg McKeown is the author of "Essentialism: The Disciplined Pursuit of Less". He teaches leaders around the world how to do less but better, focusing on what truly matters.',
    'Author & Speaker',
    'https://gregmckeown.com/wp-content/uploads/2020/01/greg-mckeown.jpg'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. Add More Sample Loop Templates
-- =====================================================

INSERT INTO loop_templates (id, creator_id, title, description, book_course_title, affiliate_link, color, category, is_featured, popularity_score) VALUES
  -- Cal Newport - Deep Work
  (
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000004',
    'Deep Work Session',
    'Maximize your focus and productivity with Cal Newport''s Deep Work methodology. This loop helps you create distraction-free blocks of intense concentration to produce your best work.',
    'Deep Work',
    'https://www.amazon.com/Deep-Work-Focused-Success-Distracted/dp/1455586692',
    '#2196F3',
    'work',
    true,
    150
  ),

  -- Robin Sharma - 5 AM Club
  (
    '10000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000005',
    'The 5 AM Club Routine',
    'Join the 5 AM Club with Robin Sharma''s transformative morning routine. The 20/20/20 formula: 20 minutes of movement, 20 minutes of reflection, and 20 minutes of growth.',
    'The 5 AM Club',
    'https://www.amazon.com/AM-Club-Morning-Elevate-Life/dp/1443456624',
    '#FF5722',
    'daily',
    true,
    200
  ),

  -- BJ Fogg - Tiny Habits
  (
    '10000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000006',
    'Tiny Habits Starter Pack',
    'Start small and grow big with BJ Fogg''s Tiny Habits method. This loop uses behavior design principles to help you build lasting habits without relying on motivation.',
    'Tiny Habits',
    'https://www.amazon.com/Tiny-Habits-Changes-Change-Everything/dp/0358003326',
    '#8BC34A',
    'personal',
    true,
    175
  ),

  -- Stephen Covey - 7 Habits
  (
    '10000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000007',
    '7 Habits Weekly Check-In',
    'Master Stephen Covey''s 7 Habits of Highly Effective People with this weekly reflection loop. Focus on being proactive, beginning with the end in mind, and putting first things first.',
    'The 7 Habits of Highly Effective People',
    'https://www.amazon.com/Habits-Highly-Effective-People-Powerful/dp/1982137274',
    '#9C27B0',
    'work',
    true,
    250
  ),

  -- Marie Kondo - KonMari
  (
    '10000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008',
    'KonMari Declutter Method',
    'Transform your space with Marie Kondo''s KonMari Method. This loop guides you through tidying by category, keeping only what sparks joy, and creating a clutter-free home.',
    'The Life-Changing Magic of Tidying Up',
    'https://www.amazon.com/Life-Changing-Magic-Tidying-Decluttering-Organizing/dp/1607747308',
    '#E91E63',
    'personal',
    false,
    125
  ),

  -- Hal Elrod - Miracle Morning
  (
    '10000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000009',
    'Miracle Morning SAVERS',
    'Transform your life before 8AM with Hal Elrod''s Miracle Morning. Practice the SAVERS: Silence, Affirmations, Visualization, Exercise, Reading, and Scribing.',
    'The Miracle Morning',
    'https://www.amazon.com/Miracle-Morning-Not-So-Obvious-Guaranteed-Transform/dp/0979019710',
    '#FF9800',
    'daily',
    true,
    220
  ),

  -- Greg McKeown - Essentialism
  (
    '10000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000010',
    'Essentialist Weekly Review',
    'Practice the disciplined pursuit of less with Greg McKeown''s Essentialism. This loop helps you identify and eliminate non-essential tasks to focus on what truly matters.',
    'Essentialism: The Disciplined Pursuit of Less',
    'https://www.amazon.com/Essentialism-Disciplined-Pursuit-Greg-McKeown/dp/0804137382',
    '#607D8B',
    'work',
    false,
    180
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. Add Tasks for New Templates
-- =====================================================

-- Deep Work Session
INSERT INTO template_tasks (template_id, description, is_recurring, display_order) VALUES
  ('10000000-0000-0000-0000-000000000004', 'Choose your most important task for deep work', true, 1),
  ('10000000-0000-0000-0000-000000000004', 'Eliminate all distractions (phone, email, social media)', true, 2),
  ('10000000-0000-0000-0000-000000000004', 'Set a timer for 90-120 minutes of focused work', true, 3),
  ('10000000-0000-0000-0000-000000000004', 'Work with full concentration on the chosen task', true, 4),
  ('10000000-0000-0000-0000-000000000004', 'Take a 15-minute break after the session', true, 5),
  ('10000000-0000-0000-0000-000000000004', 'Log your progress and insights', true, 6)
ON CONFLICT DO NOTHING;

-- 5 AM Club Routine
INSERT INTO template_tasks (template_id, description, is_recurring, display_order) VALUES
  ('10000000-0000-0000-0000-000000000005', 'Wake up at 5:00 AM', true, 1),
  ('10000000-0000-0000-0000-000000000005', '20 min: Move - Exercise to activate your body', true, 2),
  ('10000000-0000-0000-0000-000000000005', '20 min: Reflect - Meditation or journaling', true, 3),
  ('10000000-0000-0000-0000-000000000005', '20 min: Grow - Read or learn something new', true, 4),
  ('10000000-0000-0000-0000-000000000005', 'Plan your top priorities for the day', true, 5),
  ('10000000-0000-0000-0000-000000000005', 'Healthy breakfast and hydration', true, 6)
ON CONFLICT DO NOTHING;

-- Tiny Habits Starter Pack
INSERT INTO template_tasks (template_id, description, is_recurring, display_order) VALUES
  ('10000000-0000-0000-0000-000000000006', 'After I pour my morning coffee, I will do 2 pushups', true, 1),
  ('10000000-0000-0000-0000-000000000006', 'After I brush my teeth, I will floss one tooth', true, 2),
  ('10000000-0000-0000-0000-000000000006', 'After I sit down for lunch, I will take 3 deep breaths', true, 3),
  ('10000000-0000-0000-0000-000000000006', 'After I start my car, I will buckle my seatbelt', true, 4),
  ('10000000-0000-0000-0000-000000000006', 'After I close my laptop, I will clear my desk', true, 5),
  ('10000000-0000-0000-0000-000000000006', 'Celebrate each tiny habit with a fist pump or smile', true, 6)
ON CONFLICT DO NOTHING;

-- 7 Habits Weekly Check-In
INSERT INTO template_tasks (template_id, description, is_recurring, display_order) VALUES
  ('10000000-0000-0000-0000-000000000007', 'Habit 1: Be Proactive - Review your circle of influence', true, 1),
  ('10000000-0000-0000-0000-000000000007', 'Habit 2: Begin with the End in Mind - Revisit your mission', true, 2),
  ('10000000-0000-0000-0000-000000000007', 'Habit 3: Put First Things First - Time block important tasks', true, 3),
  ('10000000-0000-0000-0000-000000000007', 'Habit 4: Think Win-Win - Plan collaborative solutions', true, 4),
  ('10000000-0000-0000-0000-000000000007', 'Habit 5: Seek First to Understand - Practice empathetic listening', true, 5),
  ('10000000-0000-0000-0000-000000000007', 'Habits 6 & 7: Synergize and Sharpen the Saw', true, 6)
ON CONFLICT DO NOTHING;

-- KonMari Declutter Method
INSERT INTO template_tasks (template_id, description, is_recurring, display_order) VALUES
  ('10000000-0000-0000-0000-000000000008', 'Choose one category to declutter today', true, 1),
  ('10000000-0000-0000-0000-000000000008', 'Gather all items from that category in one place', true, 2),
  ('10000000-0000-0000-0000-000000000008', 'Touch each item and ask: Does this spark joy?', true, 3),
  ('10000000-0000-0000-0000-000000000008', 'Thank items you''re letting go and discard them', true, 4),
  ('10000000-0000-0000-0000-000000000008', 'Organize remaining items by category', true, 5),
  ('10000000-0000-0000-0000-000000000008', 'Store items vertically so everything is visible', true, 6)
ON CONFLICT DO NOTHING;

-- Miracle Morning SAVERS
INSERT INTO template_tasks (template_id, description, is_recurring, display_order) VALUES
  ('10000000-0000-0000-0000-000000000009', 'S - Silence: 5 min meditation or prayer', true, 1),
  ('10000000-0000-0000-0000-000000000009', 'A - Affirmations: Read your daily affirmations', true, 2),
  ('10000000-0000-0000-0000-000000000009', 'V - Visualization: Visualize your perfect day', true, 3),
  ('10000000-0000-0000-0000-000000000009', 'E - Exercise: 10-20 min workout or yoga', true, 4),
  ('10000000-0000-0000-0000-000000000009', 'R - Reading: Read 10 pages of personal development', true, 5),
  ('10000000-0000-0000-0000-000000000009', 'S - Scribing: Journal your thoughts and goals', true, 6)
ON CONFLICT DO NOTHING;

-- Essentialist Weekly Review
INSERT INTO template_tasks (template_id, description, is_recurring, display_order) VALUES
  ('10000000-0000-0000-0000-000000000010', 'List all your current commitments and projects', true, 1),
  ('10000000-0000-0000-0000-000000000010', 'For each item, ask: Is this essential?', true, 2),
  ('10000000-0000-0000-0000-000000000010', 'Identify 3 things to eliminate or say no to', true, 3),
  ('10000000-0000-0000-0000-000000000010', 'Choose your ONE most important priority for next week', true, 4),
  ('10000000-0000-0000-0000-000000000010', 'Schedule buffer time for the unexpected', true, 5),
  ('10000000-0000-0000-0000-000000000010', 'Remove obstacles that prevent essential work', true, 6)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Migration Complete!
-- =====================================================
