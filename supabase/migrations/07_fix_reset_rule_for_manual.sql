-- =====================================================
-- Fix reset_rule constraint to include 'manual'
-- =====================================================

-- Remove old constraint
ALTER TABLE loops DROP CONSTRAINT IF EXISTS check_reset_rule;

ALTER TABLE loops DROP CONSTRAINT IF EXISTS loops_reset_rule_check;

-- Add correct constraint with 'manual'
ALTER TABLE loops ADD CONSTRAINT check_reset_rule 
  CHECK (reset_rule IN ('manual', 'daily', 'weekly'));

-- Migrate existing data (if any loops use 'never' or 'monthly')
UPDATE loops 
SET reset_rule = 'manual' 
WHERE reset_rule IN ('never', 'monthly');

-- =====================================================
-- Migration Complete!
-- =====================================================

