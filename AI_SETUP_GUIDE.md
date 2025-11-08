# AI Loop Generation - Setup Guide

This guide explains how to set up and configure the AI-powered loop generation feature for doloop.

## 🚀 Overview

The AI feature allows users to create loops using natural language descriptions. The system uses Anthropic's Claude API (with OpenAI GPT-4 as fallback) to generate structured task lists based on user prompts.

## 🔐 Security Features

- ✅ API keys stored in Edge Function environment variables (never exposed to client)
- ✅ Input validation and sanitization (max 500 chars, content filtering)
- ✅ Rate limiting (10/hour, 10/day, 100/month per user)
- ✅ Prompt injection prevention
- ✅ Response validation with Zod schemas
- ✅ Cost tracking and quota management
- ✅ Row-level security (RLS) on all database tables

## 📋 Prerequisites

1. **Supabase Project** - Already configured
2. **Anthropic API Key** - Sign up at https://console.anthropic.com/
3. **OpenAI API Key** (Optional) - Sign up at https://platform.openai.com/

## 🛠️ Setup Instructions

### Step 1: Database Migration

Run the AI requests migration to create necessary tables:

```bash
# Apply migration using Supabase CLI
supabase db push

# Or manually run the migration file
psql -h [your-db-host] -U postgres -d postgres -f supabase/migrations/20251108_add_ai_requests.sql
```

This creates:
- `ai_requests` - Tracks all AI generation requests
- `user_ai_quotas` - Manages per-user rate limits and quotas
- Helper functions for rate limiting

### Step 2: Configure Edge Function Environment Variables

Set environment variables for the Supabase Edge Function:

#### Using Supabase CLI:

```bash
# Set Anthropic API key (primary)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...

# Set OpenAI API key (fallback - optional)
supabase secrets set OPENAI_API_KEY=sk-...

# Verify secrets are set
supabase secrets list
```

#### Using Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Settings → Edge Functions**
3. Click on **Manage secrets**
4. Add the following secrets:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `OPENAI_API_KEY`: Your OpenAI API key (optional)

### Step 3: Deploy Edge Function

Deploy the AI loop generation Edge Function:

```bash
# Deploy using Supabase CLI
supabase functions deploy generate_ai_loop

# Verify deployment
supabase functions list
```

### Step 4: Install Client Dependencies

Install Zod for validation:

```bash
npm install zod@^3.22.4
# or
yarn add zod@^3.22.4
```

### Step 5: Environment Variables for Client

Ensure your `.env` or `app.json` has:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🔑 Getting API Keys

### Anthropic Claude (Recommended)

1. Go to https://console.anthropic.com/
2. Sign up for an account
3. Navigate to **API Keys**
4. Create a new API key
5. Copy the key (starts with `sk-ant-api03-...`)

**Pricing** (as of 2025):
- Claude 3.5 Sonnet: $3 per 1M tokens (input), $15 per 1M tokens (output)
- Estimated cost per loop generation: $0.003 - $0.01

### OpenAI GPT-4 (Fallback)

1. Go to https://platform.openai.com/
2. Sign up for an account
3. Navigate to **API Keys**
4. Create a new API key
5. Copy the key (starts with `sk-...`)

**Pricing** (as of 2025):
- GPT-4 Turbo: $10 per 1M tokens (input), $30 per 1M tokens (output)
- Estimated cost per loop generation: $0.01 - $0.03

## 📊 Rate Limits & Quotas

Default limits per user:
- **Hourly**: 10 requests
- **Daily**: 10 requests
- **Monthly**: 100 requests

### Customizing Limits

To change default limits, modify the database:

```sql
-- Update default limits for all new users
ALTER TABLE user_ai_quotas
ALTER COLUMN daily_limit SET DEFAULT 20;

-- Update specific user's limit
UPDATE user_ai_quotas
SET daily_limit = 50, monthly_limit = 500
WHERE user_id = 'user-uuid-here';
```

## 🧪 Testing

### Test the Edge Function Directly

```bash
# Get a user auth token
curl -X POST https://your-project.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Call the Edge Function
curl -X POST https://your-project.supabase.co/functions/v1/generate_ai_loop \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a morning routine loop","userId":"user-uuid"}'
```

### Test in the App

1. Launch the app: `npm start`
2. Sign in with a test account
3. Click the **+** button on the home screen
4. Select **AI-Powered Creation**
5. Enter a prompt like "Create a morning routine loop"
6. Click **Generate Loop with AI**

### Monitor Requests

Query AI request history:

```sql
-- View all AI requests
SELECT * FROM ai_requests
ORDER BY created_at DESC
LIMIT 10;

-- Check user quota
SELECT * FROM user_ai_quotas
WHERE user_id = 'user-uuid-here';

-- View rate limit status
SELECT check_ai_rate_limit('user-uuid-here');
```

## 📈 Cost Tracking

### View Total Costs

```sql
-- Total cost across all users
SELECT SUM(cost_usd) as total_cost
FROM ai_requests
WHERE status = 'success';

-- Cost per user
SELECT
  user_id,
  COUNT(*) as request_count,
  SUM(cost_usd) as total_cost_usd,
  AVG(tokens_used) as avg_tokens
FROM ai_requests
WHERE status = 'success'
GROUP BY user_id
ORDER BY total_cost_usd DESC;
```

### Export Usage Data

```sql
-- Export for billing/analytics
COPY (
  SELECT
    ai.user_id,
    u.email,
    ai.created_at,
    ai.tokens_used,
    ai.cost_usd,
    ai.model,
    ai.status
  FROM ai_requests ai
  JOIN auth.users u ON u.id = ai.user_id
  WHERE ai.created_at >= NOW() - INTERVAL '30 days'
) TO '/tmp/ai_usage_report.csv' WITH CSV HEADER;
```

## 🛡️ Security Best Practices

### 1. Protect API Keys
- ✅ Never commit API keys to version control
- ✅ Use Supabase secrets for Edge Functions
- ✅ Rotate keys regularly (every 90 days)

### 2. Monitor Usage
- Set up alerts for unusual activity
- Review rate limit logs weekly
- Monitor cost trends

### 3. Content Moderation
The system includes basic keyword filtering. For production:
- Consider adding advanced content moderation API (e.g., OpenAI Moderation API)
- Implement user reporting system
- Review flagged content regularly

### 4. Database Backups
- Enable point-in-time recovery in Supabase
- Regular backups of `ai_requests` table for audit trails

## 🐛 Troubleshooting

### "ANTHROPIC_API_KEY not configured"
- Verify secret is set: `supabase secrets list`
- Redeploy Edge Function: `supabase functions deploy generate_ai_loop`

### "Rate limit exceeded"
- Check user's quota: `SELECT * FROM user_ai_quotas WHERE user_id = '...'`
- Reset if needed: `UPDATE user_ai_quotas SET daily_requests_used = 0 WHERE user_id = '...'`

### "Failed to parse Claude response as JSON"
- This can happen with complex prompts
- The system will automatically fallback to OpenAI
- Check Edge Function logs: `supabase functions logs generate_ai_loop`

### High API Costs
- Review top users: `SELECT user_id, SUM(cost_usd) FROM ai_requests GROUP BY user_id`
- Lower rate limits if needed
- Consider switching to Claude 3 Haiku for lower costs

## 📚 Architecture

```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │ 1. User enters prompt
       │
       ▼
┌──────────────────┐
│   aiService.ts   │
│  - Validation    │
│  - Sanitization  │
└──────┬───────────┘
       │ 2. POST to Edge Function
       │
       ▼
┌─────────────────────────┐
│  Supabase Edge Function │
│  - Check rate limits    │
│  - Call Claude/OpenAI   │
│  - Validate response    │
│  - Log request          │
└──────┬──────────────────┘
       │ 3. Create loop & tasks
       │
       ▼
┌──────────────────┐
│   PostgreSQL     │
│  - loops         │
│  - tasks         │
│  - ai_requests   │
│  - user_ai_quotas│
└──────────────────┘
```

## 🔄 Updating the System

### Update AI Models

To switch models, edit `generate_ai_loop/index.ts`:

```typescript
// Change Claude model
model: "claude-3-5-sonnet-20241022"  // Current
// to
model: "claude-3-haiku-20240307"     // Faster, cheaper

// Change OpenAI model
model: "gpt-4-turbo-preview"         // Current
// to
model: "gpt-4o"                      // Latest
```

### Update Rate Limits

Edit the database function or add UI for admins:

```sql
CREATE OR REPLACE FUNCTION update_user_quota(
  p_user_id UUID,
  p_daily_limit INT,
  p_monthly_limit INT
)
RETURNS void AS $$
BEGIN
  UPDATE user_ai_quotas
  SET daily_limit = p_daily_limit,
      monthly_limit = p_monthly_limit
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

## 📞 Support

For issues or questions:
1. Check Edge Function logs: `supabase functions logs generate_ai_loop --tail`
2. Review database logs in Supabase dashboard
3. Test with sample prompts in the app
4. Contact Anthropic/OpenAI support for API issues

## 🎯 Next Steps

1. **Analytics Dashboard**: Build admin UI to view AI usage metrics
2. **A/B Testing**: Compare Claude vs GPT-4 performance
3. **Fine-tuning**: Collect feedback to improve prompts
4. **Advanced Features**:
   - Loop templates from successful generations
   - User feedback on AI quality
   - Suggested loop improvements
   - Multi-language support

---

**Last Updated**: 2025-11-08
**Version**: 1.0.0
