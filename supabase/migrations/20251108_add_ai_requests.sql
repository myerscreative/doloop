-- Migration: Add AI Requests Tracking
-- Description: Track AI loop generation requests for rate limiting, cost tracking, and audit trails
-- Created: 2025-11-08

-- Create ai_requests table
CREATE TABLE IF NOT EXISTS ai_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  response_data JSONB,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'rejected')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create user_ai_quotas table for managing user limits
CREATE TABLE IF NOT EXISTS user_ai_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_requests_used INTEGER DEFAULT 0,
  monthly_requests_used INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10, 4) DEFAULT 0,
  daily_limit INTEGER DEFAULT 10,
  monthly_limit INTEGER DEFAULT 100,
  last_daily_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_monthly_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX idx_ai_requests_created_at ON ai_requests(created_at);
CREATE INDEX idx_ai_requests_status ON ai_requests(status);
CREATE INDEX idx_ai_requests_user_created ON ai_requests(user_id, created_at DESC);
CREATE INDEX idx_user_ai_quotas_user_id ON user_ai_quotas(user_id);

-- Row Level Security Policies
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_quotas ENABLE ROW LEVEL SECURITY;

-- Users can only view their own AI requests
CREATE POLICY "Users can view their own AI requests"
  ON ai_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own AI requests (Edge Function will handle this)
CREATE POLICY "Users can create AI requests"
  ON ai_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own quota
CREATE POLICY "Users can view their own quota"
  ON user_ai_quotas
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own quota (Edge Function will handle this)
CREATE POLICY "Users can update their own quota"
  ON user_ai_quotas
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role can manage AI requests"
  ON ai_requests
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage quotas"
  ON user_ai_quotas
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION check_ai_rate_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_quota RECORD;
  v_hourly_count INTEGER;
BEGIN
  -- Get or create user quota
  INSERT INTO user_ai_quotas (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current quota
  SELECT * INTO v_quota
  FROM user_ai_quotas
  WHERE user_id = p_user_id;

  -- Reset daily counter if needed
  IF v_quota.last_daily_reset < NOW() - INTERVAL '1 day' THEN
    UPDATE user_ai_quotas
    SET daily_requests_used = 0,
        last_daily_reset = NOW()
    WHERE user_id = p_user_id;
    v_quota.daily_requests_used := 0;
  END IF;

  -- Reset monthly counter if needed
  IF v_quota.last_monthly_reset < NOW() - INTERVAL '1 month' THEN
    UPDATE user_ai_quotas
    SET monthly_requests_used = 0,
        last_monthly_reset = NOW()
    WHERE user_id = p_user_id;
    v_quota.monthly_requests_used := 0;
  END IF;

  -- Check hourly rate (10 requests per hour)
  SELECT COUNT(*) INTO v_hourly_count
  FROM ai_requests
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour'
    AND status != 'rejected';

  -- Return rate limit status
  RETURN jsonb_build_object(
    'allowed', (
      v_hourly_count < 10 AND
      v_quota.daily_requests_used < v_quota.daily_limit AND
      v_quota.monthly_requests_used < v_quota.monthly_limit
    ),
    'hourly_used', v_hourly_count,
    'hourly_limit', 10,
    'daily_used', v_quota.daily_requests_used,
    'daily_limit', v_quota.daily_limit,
    'monthly_used', v_quota.monthly_requests_used,
    'monthly_limit', v_quota.monthly_limit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment quota usage
CREATE OR REPLACE FUNCTION increment_ai_quota(
  p_user_id UUID,
  p_tokens_used INTEGER,
  p_cost_usd DECIMAL(10, 6)
)
RETURNS void AS $$
BEGIN
  UPDATE user_ai_quotas
  SET daily_requests_used = daily_requests_used + 1,
      monthly_requests_used = monthly_requests_used + 1,
      total_cost_usd = total_cost_usd + p_cost_usd,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON ai_requests TO authenticated;
GRANT SELECT, UPDATE ON user_ai_quotas TO authenticated;
GRANT EXECUTE ON FUNCTION check_ai_rate_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_ai_quota TO authenticated, anon;

-- Comment on tables for documentation
COMMENT ON TABLE ai_requests IS 'Tracks all AI loop generation requests for auditing and rate limiting';
COMMENT ON TABLE user_ai_quotas IS 'Manages per-user AI request quotas and usage tracking';
COMMENT ON COLUMN ai_requests.tokens_used IS 'Number of tokens consumed by the AI API';
COMMENT ON COLUMN ai_requests.cost_usd IS 'Estimated cost in USD for this request';
COMMENT ON COLUMN ai_requests.status IS 'Request status: pending, success, failed, or rejected (rate limited)';
