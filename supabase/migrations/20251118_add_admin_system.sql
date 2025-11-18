-- Migration: Add Admin System
-- Description: Add admin roles, affiliate tracking, and admin permissions
-- Date: 2025-11-18

-- ============================================================================
-- PART 1: ADMIN ROLES & PERMISSIONS
-- ============================================================================

-- Add is_admin column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin) WHERE is_admin = true;

-- ============================================================================
-- PART 2: AFFILIATE TRACKING SYSTEM
-- ============================================================================

-- Table: affiliate_clicks
-- Track when users click on affiliate links
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES loop_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for logged-out users
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  -- Track if this click led to a conversion (can be updated later)
  converted BOOLEAN DEFAULT FALSE,
  conversion_date TIMESTAMP WITH TIME ZONE,
  conversion_amount DECIMAL(10, 2)
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_template ON affiliate_clicks(template_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_user ON affiliate_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_date ON affiliate_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_converted ON affiliate_clicks(converted);

-- Enable RLS on affiliate_clicks
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_clicks
-- Anyone can insert clicks (for tracking)
CREATE POLICY "Anyone can log affiliate clicks"
  ON affiliate_clicks FOR INSERT
  WITH CHECK (true);

-- Only admins can view all clicks
CREATE POLICY "Admins can view all affiliate clicks"
  ON affiliate_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update conversion status
CREATE POLICY "Admins can update affiliate clicks"
  ON affiliate_clicks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- PART 3: ADMIN RLS POLICIES FOR TEMPLATES
-- ============================================================================

-- Allow admins to INSERT template creators
CREATE POLICY "Admins can insert template creators"
  ON template_creators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to UPDATE template creators
CREATE POLICY "Admins can update template creators"
  ON template_creators FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to DELETE template creators
CREATE POLICY "Admins can delete template creators"
  ON template_creators FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to INSERT loop templates
CREATE POLICY "Admins can insert loop templates"
  ON loop_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to UPDATE loop templates
CREATE POLICY "Admins can update loop templates"
  ON loop_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to DELETE loop templates
CREATE POLICY "Admins can delete loop templates"
  ON loop_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to INSERT template tasks
CREATE POLICY "Admins can insert template tasks"
  ON template_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to UPDATE template tasks
CREATE POLICY "Admins can update template tasks"
  ON template_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to DELETE template tasks
CREATE POLICY "Admins can delete template tasks"
  ON template_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- PART 4: ADMIN ANALYTICS VIEWS
-- ============================================================================

-- View: Admin Dashboard Stats
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d,
  (SELECT COUNT(*) FROM loops) as total_loops,
  (SELECT COUNT(*) FROM loop_templates) as total_templates,
  (SELECT COUNT(*) FROM affiliate_clicks) as total_affiliate_clicks,
  (SELECT COUNT(*) FROM affiliate_clicks WHERE converted = true) as total_conversions,
  (SELECT COALESCE(SUM(conversion_amount), 0) FROM affiliate_clicks WHERE converted = true) as total_revenue;

-- View: Template Performance
CREATE OR REPLACE VIEW admin_template_performance AS
SELECT
  lt.id,
  lt.title,
  lt.creator_id,
  tc.name as creator_name,
  lt.category,
  lt.popularity_score,
  lt.average_rating,
  lt.review_count,
  (SELECT COUNT(*) FROM user_template_usage WHERE template_id = lt.id) as total_uses,
  (SELECT COUNT(*) FROM affiliate_clicks WHERE template_id = lt.id) as affiliate_clicks,
  (SELECT COUNT(*) FROM affiliate_clicks WHERE template_id = lt.id AND converted = true) as affiliate_conversions,
  (SELECT COALESCE(SUM(conversion_amount), 0) FROM affiliate_clicks WHERE template_id = lt.id AND converted = true) as affiliate_revenue,
  lt.created_at
FROM loop_templates lt
LEFT JOIN template_creators tc ON lt.creator_id = tc.id
ORDER BY lt.popularity_score DESC;

-- View: User Activity Summary (for admin user management)
CREATE OR REPLACE VIEW admin_user_summary AS
SELECT
  u.id,
  u.email,
  u.created_at,
  up.theme_vibe,
  up.is_admin,
  (SELECT COUNT(*) FROM loops WHERE owner_id = u.id) as loop_count,
  (SELECT COUNT(*) FROM tasks WHERE loop_id IN (SELECT id FROM loops WHERE owner_id = u.id)) as task_count,
  (SELECT COUNT(*) FROM user_template_usage WHERE user_id = u.id) as templates_used,
  (SELECT MAX(updated_at) FROM loops WHERE owner_id = u.id) as last_activity
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
ORDER BY u.created_at DESC;

-- Grant SELECT on views to authenticated users with admin role
-- Note: RLS will still apply based on the is_admin check

-- ============================================================================
-- PART 5: HELPER FUNCTIONS
-- ============================================================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track affiliate click
CREATE OR REPLACE FUNCTION track_affiliate_click(
  p_template_id UUID,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_click_id UUID;
BEGIN
  INSERT INTO affiliate_clicks (
    template_id,
    user_id,
    user_agent,
    referrer
  ) VALUES (
    p_template_id,
    auth.uid(), -- Will be NULL if not logged in
    p_user_agent,
    p_referrer
  )
  RETURNING id INTO v_click_id;

  RETURN v_click_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark affiliate conversion (admin only)
CREATE OR REPLACE FUNCTION mark_affiliate_conversion(
  p_click_id UUID,
  p_conversion_amount DECIMAL DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can mark conversions';
  END IF;

  UPDATE affiliate_clicks
  SET
    converted = true,
    conversion_date = NOW(),
    conversion_amount = p_conversion_amount
  WHERE id = p_click_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: SAMPLE ADMIN USER (OPTIONAL - COMMENT OUT IN PRODUCTION)
-- ============================================================================

-- This is just for development. In production, you should manually
-- set is_admin = true for specific users via SQL or admin panel

-- Example: Update a specific user to be admin
-- UPDATE user_profiles SET is_admin = true WHERE id = 'YOUR_USER_ID';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
