# AI Loop Generation - Testing Guide

Comprehensive testing checklist for the AI-powered loop generation feature.

## 🧪 Pre-Testing Checklist

Before testing, ensure:

- [ ] Database migration applied (`20251108_add_ai_requests.sql`)
- [ ] Edge Function deployed (`generate_ai_loop`)
- [ ] API keys configured in Supabase secrets
- [ ] Zod package installed (`npm install`)
- [ ] App built and running

## 🔐 Security Testing

### 1. Input Validation

Test that invalid inputs are rejected:

**Test Cases:**
```
✓ Empty prompt → "Prompt cannot be empty"
✓ 501 character prompt → "Prompt must be 500 characters or less"
✓ Prompt with <script> tags → Should be sanitized
✓ SQL injection attempt → Should be sanitized
✓ Prompt with quotes → Should be sanitized
```

**Expected Behavior:**
- Client-side validation prevents submission
- Edge Function validates and sanitizes
- No errors in console

### 2. Content Moderation

Test blocked keywords:

**Test Cases:**
```
✗ "Create a loop to hack websites" → "Inappropriate content"
✗ "Tasks for illegal activities" → "Inappropriate content"
✗ "How to steal things" → "Inappropriate content"
✓ "Morning routine loop" → Should work
✓ "Work project tasks" → Should work
```

**Expected Behavior:**
- Blocked prompts show error message
- Valid prompts proceed to AI generation
- No inappropriate content reaches AI

### 3. Rate Limiting

Test rate limits work correctly:

**Test Cases:**
```
1. Make 10 requests within 1 hour → All succeed
2. Make 11th request → "Rate limit exceeded"
3. Check quota display → Shows correct usage
4. Wait 1 hour → Hourly limit resets
5. Make 10 requests in one day → Hits daily limit
6. Try 11th request → "Rate limit exceeded"
```

**Expected Behavior:**
- Rate limits enforce correctly
- Error message shows current usage
- Quota display accurate

**SQL to Check:**
```sql
-- View rate limit status
SELECT check_ai_rate_limit('your-user-id');

-- Reset for testing
UPDATE user_ai_quotas
SET daily_requests_used = 0,
    monthly_requests_used = 0
WHERE user_id = 'your-user-id';
```

### 4. Authentication

Test auth requirements:

**Test Cases:**
```
✗ Call Edge Function without auth token → 401 Unauthorized
✗ Call with invalid token → 401 Unauthorized
✓ Call with valid session token → Success
✗ Call with expired token → 401 Unauthorized
```

### 5. Authorization

Test RLS policies:

**Test Cases:**
```
✓ User can view own ai_requests → Success
✗ User tries to view other user's requests → No results
✓ User can view own quota → Success
✗ User tries to modify other user's quota → Blocked by RLS
```

**SQL to Test:**
```sql
-- As user A, try to access user B's data
SELECT * FROM ai_requests WHERE user_id = 'user-b-id';
-- Should return empty (not an error)

-- Try to update another user's quota
UPDATE user_ai_quotas
SET daily_limit = 1000
WHERE user_id = 'user-b-id';
-- Should be blocked
```

## 🤖 AI Generation Testing

### 1. Successful Generation

Test various prompt types:

**Test Cases:**
| Prompt | Expected Loop Type | Min Tasks |
|--------|-------------------|-----------|
| "Morning routine" | daily | 5 |
| "Work project planning" | work | 3 |
| "Personal goals for self-improvement" | personal | 4 |
| "Shared family chores" | shared | 3 |
| "Weekly workout schedule" | daily | 7 |

**Expected Behavior:**
- Loop created with appropriate name
- Tasks are relevant and actionable
- Task descriptions < 200 characters
- isRecurring set appropriately
- Loop type matches context

### 2. Response Validation

Test AI response is properly validated:

**Test Cases:**
```
✓ Valid JSON structure → Accepted
✗ Missing loopName → Rejected
✗ Invalid loopType → Rejected
✗ Empty tasks array → Rejected
✗ 21+ tasks → Rejected
✗ Task description > 200 chars → Rejected
```

### 3. Error Handling

Test graceful error handling:

**Test Cases:**
```
✗ Invalid API key → "AI providers failed"
✗ Network timeout → Shows error, doesn't crash
✗ Invalid AI response → "Invalid AI response"
✗ Database error → "Failed to create loop"
```

**Expected Behavior:**
- User sees friendly error message
- App doesn't crash
- Error logged in ai_requests table
- User can retry

## 💰 Cost Tracking Testing

### 1. Cost Calculation

Verify costs are tracked:

**Test Cases:**
```sql
-- After successful generation, verify record
SELECT
  tokens_used,
  cost_usd,
  model,
  status
FROM ai_requests
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- tokens_used > 0
- cost_usd > 0
- model = "claude-3-5-sonnet-20241022" or "gpt-4-turbo-preview"
- status = "success"

### 2. Quota Updates

Test quota increments correctly:

```sql
-- Check before request
SELECT daily_requests_used, monthly_requests_used, total_cost_usd
FROM user_ai_quotas
WHERE user_id = 'your-user-id';

-- Make request

-- Check after request
SELECT daily_requests_used, monthly_requests_used, total_cost_usd
FROM user_ai_quotas
WHERE user_id = 'your-user-id';
```

**Expected:**
- daily_requests_used incremented by 1
- monthly_requests_used incremented by 1
- total_cost_usd increased by cost of request

### 3. Request Status

Test all request statuses work:

**Test Cases:**
```sql
-- Successful request
SELECT * FROM ai_requests WHERE status = 'success';

-- Rate limited request
SELECT * FROM ai_requests WHERE status = 'rejected';

-- Failed request (simulate by invalid API key)
SELECT * FROM ai_requests WHERE status = 'failed';
```

## 📱 UI/UX Testing

### 1. Choice Modal

Test the creation choice modal:

**Test Cases:**
```
✓ Click FAB → Choice modal appears
✓ Click "AI-Powered Creation" → Opens AI modal
✓ Click "Manual Creation" → Opens manual modal
✓ Click "Cancel" → Modal closes
✓ Click outside modal → Modal closes
```

### 2. AI Modal

Test AI creation modal:

**Test Cases:**
```
✓ Modal displays correctly
✓ Examples are clickable and populate input
✓ Character counter updates (x/500)
✓ Quota display shows correct values
✓ Input field accepts text
✓ Generate button disabled when empty
✓ Generate button disabled at rate limit
```

### 3. Loading States

Test loading/disabled states:

**Test Cases:**
```
✓ Click Generate → Button shows "Generating with AI..."
✓ Loading spinner appears
✓ Input field disabled during generation
✓ Cancel button disabled during generation
✓ Can't submit multiple requests
```

### 4. Success Flow

Test successful generation flow:

**Test Cases:**
```
1. Enter prompt
2. Click Generate
3. Wait for AI response
4. Success alert appears
5. Click "View Loop" → Navigates to loop detail
6. Loop has correct name and tasks
7. OR click "Create Another" → Resets form, refreshes quota
```

### 5. Error Display

Test error messages:

**Test Cases:**
```
✗ Empty prompt → Red error box
✗ Rate limit → Alert with limit details
✗ Network error → Error message shown
✓ Error doesn't crash app
✓ User can retry after error
```

### 6. Responsive Design

Test on different platforms:

**Test Cases:**
```
✓ iOS - Modal displays correctly
✓ Android - Modal displays correctly
✓ Web - Modal displays correctly
✓ Modal scrolls on small screens
✓ Text readable on all screen sizes
```

## 🔄 Integration Testing

### 1. End-to-End Flow

Complete flow from start to finish:

**Steps:**
1. Sign in as user
2. Navigate to Home screen
3. Click FAB (+)
4. Select "AI-Powered Creation"
5. Enter prompt: "Create a morning routine loop"
6. Click "Generate Loop with AI"
7. Wait for generation (5-10 seconds)
8. Verify success alert
9. Click "View Loop"
10. Verify in LoopDetail screen:
    - Loop name matches
    - Tasks are created
    - Tasks have descriptions
    - Can mark tasks complete

**Expected Result:**
- ✓ All steps complete without errors
- ✓ Loop is created in database
- ✓ Tasks are created and linked
- ✓ Navigation works correctly
- ✓ Data persists on refresh

### 2. Database Consistency

Verify data integrity:

**SQL Checks:**
```sql
-- Verify loop was created
SELECT * FROM loops
WHERE id = 'new-loop-id';

-- Verify tasks were created
SELECT * FROM tasks
WHERE loop_id = 'new-loop-id';

-- Verify AI request was logged
SELECT * FROM ai_requests
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 1;

-- Verify quota was updated
SELECT * FROM user_ai_quotas
WHERE user_id = 'your-user-id';
```

### 3. Concurrent Requests

Test multiple users simultaneously:

**Test Cases:**
```
✓ User A and B request at same time → Both succeed
✓ Each request tracked separately
✓ Quotas updated independently
✓ No race conditions
```

## 🌐 Cross-Platform Testing

### iOS Testing
```bash
npm run ios
```

**Test:**
- [ ] Modal animations smooth
- [ ] Keyboard behavior correct
- [ ] Text input works
- [ ] Alerts display correctly
- [ ] Navigation works

### Android Testing
```bash
npm run android
```

**Test:**
- [ ] Modal rendering correct
- [ ] Back button behavior
- [ ] Material Design compliance
- [ ] Performance acceptable

### Web Testing
```bash
npm run web
```

**Test:**
- [ ] Responsive on desktop
- [ ] Responsive on mobile viewport
- [ ] Keyboard shortcuts work
- [ ] No console errors
- [ ] Forms submit correctly

## 🔍 Performance Testing

### 1. Response Time

Measure AI generation time:

**Expected:**
- Claude API: 3-7 seconds
- OpenAI API: 5-10 seconds
- Total (with DB): < 15 seconds

### 2. Database Performance

Test query performance:

```sql
-- Should be fast (<50ms)
EXPLAIN ANALYZE
SELECT check_ai_rate_limit('user-id');

-- Should be fast (<100ms)
EXPLAIN ANALYZE
SELECT * FROM ai_requests
WHERE user_id = 'user-id'
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Edge Function Performance

Test cold start vs warm start:

```bash
# Monitor logs
supabase functions logs generate_ai_loop --tail

# Look for:
# - Cold start: 1-3 seconds
# - Warm start: <500ms
```

## 📊 Monitoring & Logging

### 1. Edge Function Logs

Monitor during testing:

```bash
supabase functions logs generate_ai_loop --tail
```

**Look for:**
- ✓ No errors
- ✓ Request/response logged
- ✓ Execution time < 15s
- ✗ API errors (investigate)

### 2. Database Logs

Check for errors:

```sql
-- Recent errors
SELECT *
FROM ai_requests
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Error patterns
SELECT error_message, COUNT(*)
FROM ai_requests
WHERE status = 'failed'
GROUP BY error_message;
```

### 3. Cost Monitoring

Track spending:

```sql
-- Daily cost
SELECT
  DATE(created_at) as date,
  COUNT(*) as requests,
  SUM(cost_usd) as total_cost
FROM ai_requests
WHERE status = 'success'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## ✅ Testing Checklist

### Security
- [ ] Input validation works
- [ ] Content moderation blocks inappropriate prompts
- [ ] Rate limiting enforces correctly
- [ ] Authentication required
- [ ] RLS policies prevent unauthorized access
- [ ] API keys not exposed to client
- [ ] Prompt injection prevented
- [ ] SQL injection prevented

### Functionality
- [ ] AI generates valid loops
- [ ] Response validation works
- [ ] Error handling graceful
- [ ] Database writes succeed
- [ ] Navigation works correctly
- [ ] Success/error alerts shown

### Cost & Quota
- [ ] Costs calculated correctly
- [ ] Quotas update properly
- [ ] Rate limits reset correctly
- [ ] Usage tracked accurately

### UI/UX
- [ ] Choice modal works
- [ ] AI modal works
- [ ] Loading states correct
- [ ] Error messages clear
- [ ] Success flow smooth
- [ ] Mobile responsive
- [ ] Desktop responsive

### Integration
- [ ] End-to-end flow works
- [ ] Database consistency maintained
- [ ] Multiple users work simultaneously
- [ ] Cross-platform compatible

### Performance
- [ ] Response time acceptable
- [ ] Database queries fast
- [ ] No memory leaks
- [ ] App doesn't crash

## 🐛 Known Issues & Limitations

### Current Limitations:
1. **Language**: English only (AI may struggle with other languages)
2. **Models**: Claude 3.5 Sonnet and GPT-4 only
3. **Quotas**: Fixed limits (no dynamic scaling)
4. **Feedback**: No built-in feedback mechanism
5. **Retries**: No automatic retry on failure

### Potential Issues:
- AI may generate irrelevant tasks for vague prompts
- Rate limiting may be too strict for power users
- Cost tracking doesn't account for failed retries
- No caching of similar prompts

## 📝 Test Report Template

```markdown
## Test Session Report

**Date**: YYYY-MM-DD
**Tester**: Name
**Platform**: iOS/Android/Web
**Environment**: Development/Staging/Production

### Test Results

#### Security: PASS/FAIL
- Input validation: ✓/✗
- Rate limiting: ✓/✗
- Authentication: ✓/✗

#### Functionality: PASS/FAIL
- AI generation: ✓/✗
- Database writes: ✓/✗
- Navigation: ✓/✗

#### UI/UX: PASS/FAIL
- Modal display: ✓/✗
- Loading states: ✓/✗
- Error handling: ✓/✗

### Issues Found
1. [Description]
2. [Description]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

**Last Updated**: 2025-11-08
**Version**: 1.0.0
