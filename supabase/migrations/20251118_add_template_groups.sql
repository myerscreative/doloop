-- Migration: Add Template Groups for Library Organization
-- Created: 2025-11-18
-- Description: Adds grouping/categorization for loop templates with search and filtering

-- ============================================
-- Table: template_groups
-- ============================================
CREATE TABLE IF NOT EXISTS template_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Table: template_group_assignments
-- ============================================
-- Many-to-many relationship between templates and groups
CREATE TABLE IF NOT EXISTS template_group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES loop_templates(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES template_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, group_id)
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_template_group_assignments_template ON template_group_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_template_group_assignments_group ON template_group_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_template_groups_display_order ON template_groups(display_order);

-- ============================================
-- RLS Policies for template_groups
-- ============================================
ALTER TABLE template_groups ENABLE ROW LEVEL SECURITY;

-- Everyone can read groups
CREATE POLICY "Anyone can view template groups"
  ON template_groups FOR SELECT
  USING (true);

-- Only admins can insert groups
CREATE POLICY "Only admins can create template groups"
  ON template_groups FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update groups
CREATE POLICY "Only admins can update template groups"
  ON template_groups FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can delete groups
CREATE POLICY "Only admins can delete template groups"
  ON template_groups FOR DELETE
  USING (is_admin());

-- ============================================
-- RLS Policies for template_group_assignments
-- ============================================
ALTER TABLE template_group_assignments ENABLE ROW LEVEL SECURITY;

-- Everyone can read group assignments
CREATE POLICY "Anyone can view template group assignments"
  ON template_group_assignments FOR SELECT
  USING (true);

-- Only admins can insert assignments
CREATE POLICY "Only admins can create template group assignments"
  ON template_group_assignments FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can delete assignments
CREATE POLICY "Only admins can delete template group assignments"
  ON template_group_assignments FOR DELETE
  USING (is_admin());

-- ============================================
-- Helper Functions
-- ============================================

-- Function to get all templates in a group
CREATE OR REPLACE FUNCTION get_templates_by_group(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  creator_id UUID,
  title TEXT,
  description TEXT,
  book_course_title TEXT,
  affiliate_link TEXT,
  color TEXT,
  category TEXT,
  is_featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lt.id,
    lt.creator_id,
    lt.title,
    lt.description,
    lt.book_course_title,
    lt.affiliate_link,
    lt.color,
    lt.category,
    lt.is_featured,
    lt.created_at,
    lt.updated_at
  FROM loop_templates lt
  INNER JOIN template_group_assignments tga ON lt.id = tga.template_id
  WHERE tga.group_id = p_group_id
  ORDER BY lt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get groups for a template
CREATE OR REPLACE FUNCTION get_groups_for_template(p_template_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tg.id,
    tg.name,
    tg.description,
    tg.display_order
  FROM template_groups tg
  INNER JOIN template_group_assignments tga ON tg.id = tga.group_id
  WHERE tga.template_id = p_template_id
  ORDER BY tg.display_order, tg.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign template to group
CREATE OR REPLACE FUNCTION assign_template_to_group(p_template_id UUID, p_group_id UUID)
RETURNS UUID AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can assign templates to groups';
  END IF;

  -- Insert or get existing assignment
  INSERT INTO template_group_assignments (template_id, group_id)
  VALUES (p_template_id, p_group_id)
  ON CONFLICT (template_id, group_id) DO NOTHING
  RETURNING id INTO v_assignment_id;

  -- If assignment already existed, get its ID
  IF v_assignment_id IS NULL THEN
    SELECT id INTO v_assignment_id
    FROM template_group_assignments
    WHERE template_id = p_template_id AND group_id = p_group_id;
  END IF;

  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unassign template from group
CREATE OR REPLACE FUNCTION unassign_template_from_group(p_template_id UUID, p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can unassign templates from groups';
  END IF;

  DELETE FROM template_group_assignments
  WHERE template_id = p_template_id AND group_id = p_group_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Insert Default Groups
-- ============================================
INSERT INTO template_groups (name, description, display_order)
VALUES
  ('Productivity', 'Templates focused on productivity and efficiency', 1),
  ('Health & Wellness', 'Templates for physical and mental health', 2),
  ('Personal Growth', 'Templates for self-improvement and learning', 3),
  ('Business', 'Templates for professional and business development', 4)
ON CONFLICT (name) DO NOTHING;
