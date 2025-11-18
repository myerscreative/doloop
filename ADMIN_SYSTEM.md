# DoLoop Admin System Documentation

## Overview

The DoLoop Admin System provides comprehensive administrative tools for managing the application, including loop templates, creators, users, and affiliate tracking. This system is designed to give you full control over your app's content and monitor its performance.

## Features

### 1. **Loop Template Management**
- ✅ Create, edit, and delete loop templates
- ✅ Manage template tasks (add, edit, delete, reorder)
- ✅ Set template categories (personal, work, daily, shared)
- ✅ Mark templates as featured
- ✅ Configure template colors
- ✅ Add affiliate links for monetization

### 2. **Creator Management**
- ✅ Create, edit, and delete template creators
- ✅ Add creator bio, title, photo, and website
- ✅ Associate templates with creators

### 3. **User Management**
- ✅ View all users with activity metrics
- ✅ Grant/revoke admin privileges
- ✅ Monitor user engagement (loops, tasks, templates used)
- ✅ Track user registration dates and last activity

### 4. **Affiliate Tracking System**
- ✅ Automatic tracking of affiliate link clicks
- ✅ Click attribution (user, timestamp, user agent)
- ✅ Conversion tracking and revenue reporting
- ✅ Performance analytics per template
- ✅ Conversion rate calculations

### 5. **Analytics Dashboard**
- ✅ Total users and new users (30-day)
- ✅ Total loops and templates
- ✅ Affiliate performance metrics
- ✅ Template popularity and usage stats
- ✅ Revenue tracking

## Getting Started

### Step 1: Run the Database Migration

First, apply the admin system migration to your Supabase database:

```bash
# Navigate to your Supabase project
cd supabase

# Apply the migration
supabase migration up
```

Or manually run the SQL file in your Supabase SQL Editor:
- File: `supabase/migrations/20251118_add_admin_system.sql`

### Step 2: Set Your First Admin User

After the migration, you need to manually set yourself as an admin. In your Supabase SQL Editor, run:

```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE user_profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

### Step 3: Access the Admin Dashboard

1. Log into the DoLoop app with your admin account
2. Navigate to **Settings**
3. You'll see a new **Admin** section with an "Admin Dashboard" button
4. Click to access the full admin panel

## Admin Dashboard Screens

### Main Dashboard (`AdminDashboardScreen`)

The main hub displaying:
- **User Statistics**: Total users, new users (30d), total loops, total templates
- **Affiliate Performance**: Total clicks, conversions, conversion rate, revenue
- **Quick Access Cards**: Navigate to Templates, Creators, Users, or Affiliates

### Template Management (`AdminTemplatesScreen`)

Create and manage loop templates:

**Creating a Template:**
1. Click the **+** button in the header
2. Fill in the required fields:
   - **Creator**: Select from existing creators
   - **Title**: Template name (e.g., "Morning Routine")
   - **Description**: Detailed description
   - **Book/Course Title**: Source material (e.g., "Atomic Habits")
   - **Affiliate Link**: Optional Amazon/product link
   - **Color**: Hex color for the template
   - **Category**: personal, work, daily, or shared
   - **Featured**: Check to feature on homepage
   - **Tasks**: Add at least one task
3. Click **Save**

**Editing a Template:**
1. Click the **pencil icon** on any template card
2. Modify fields as needed
3. Click **Save**

**Deleting a Template:**
1. Click the **trash icon** on any template card
2. Confirm deletion
3. All associated tasks will be deleted automatically

### Creator Management (`AdminCreatorsScreen`)

Manage template creators/coaches:

**Creating a Creator:**
1. Click the **+** button
2. Fill in:
   - **Name**: Creator's full name (required)
   - **Bio**: Detailed biography (required)
   - **Title**: e.g., "Author & Speaker"
   - **Photo URL**: Link to creator's photo
   - **Website URL**: Creator's website
3. Click **Save**

**Editing/Deleting:**
- Use the pencil/trash icons on creator cards
- **Warning**: Deleting a creator will delete all their templates!

### User Management (`AdminUsersScreen`)

View and manage users:

**User Cards Show:**
- Email address
- Admin badge (if applicable)
- Join date
- Activity stats (loops, tasks, templates used)
- Last activity date

**Grant/Revoke Admin:**
- Click the shield icon on any user card
- Confirm the action
- User will immediately gain/lose admin access

**Summary Stats:**
- Total Users
- Total Admins
- New Users (30 days)

### Affiliate Performance (`AdminAffiliatesScreen`)

Track affiliate link performance:

**Overall Metrics:**
- Total Clicks
- Total Conversions
- Conversion Rate
- Total Revenue

**Per-Template Analytics:**
- Template name and creator
- Total clicks
- Total conversions
- Conversion rate
- Revenue generated

**Sort Options:**
- By Clicks
- By Conversions
- By Conversion Rate
- By Revenue

## Affiliate System Details

### How Affiliate Tracking Works

1. **User Clicks Affiliate Link**: When a user clicks "Learn More" on a template, the app calls `trackAffiliateClick()`
2. **Data Recorded**:
   - Template ID
   - User ID (if logged in)
   - Timestamp
   - User Agent
   - Referrer URL
3. **Link Opens**: User is redirected to the affiliate link (e.g., Amazon)
4. **Conversion Tracking**: If a sale occurs, you can manually mark it as converted in the admin panel

### Marking Conversions

Conversions need to be marked manually (or via webhook if you set one up):

```typescript
// In your admin code or webhook handler
import { markAffiliateConversion } from '../lib/admin';

await markAffiliateConversion(
  clickId,        // UUID of the click record
  conversionAmount // Optional: revenue amount (e.g., 12.50)
);
```

### Setting Up Conversion Webhooks (Advanced)

If you're using Amazon Associates or another affiliate program with webhook support:

1. Create a Supabase Edge Function
2. Configure your affiliate program to send conversion webhooks
3. In the webhook handler, call `markAffiliateConversion()`

Example Edge Function:

```typescript
// supabase/functions/affiliate-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const payload = await req.json()

  // Verify webhook signature (specific to your affiliate program)
  // ...

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Mark conversion
  await supabase.rpc('mark_affiliate_conversion', {
    p_click_id: payload.clickId,
    p_conversion_amount: payload.amount
  })

  return new Response('OK', { status: 200 })
})
```

## Database Schema

### New Tables

#### `user_profiles` (modified)
- Added `is_admin` BOOLEAN field
- Default: `false`
- Index on `is_admin` for fast admin lookups

#### `affiliate_clicks`
- Tracks every affiliate link click
- Fields:
  - `id`: UUID primary key
  - `template_id`: UUID (references loop_templates)
  - `user_id`: UUID (references auth.users, nullable)
  - `clicked_at`: Timestamp
  - `user_agent`: Text
  - `ip_address`: INET
  - `referrer`: Text
  - `converted`: Boolean
  - `conversion_date`: Timestamp (nullable)
  - `conversion_amount`: Decimal(10,2) (nullable)

### Database Views

#### `admin_dashboard_stats`
Aggregated statistics for the main dashboard.

#### `admin_template_performance`
Per-template performance metrics including usage and affiliate data.

#### `admin_user_summary`
User activity summary for user management.

### Row Level Security (RLS)

All admin operations are protected by RLS policies that check:

```sql
EXISTS (
  SELECT 1 FROM user_profiles
  WHERE id = auth.uid() AND is_admin = true
)
```

Only users with `is_admin = true` can:
- Insert/Update/Delete templates, creators, and tasks
- View affiliate click data
- Update user admin status

## API Reference

### Admin Utilities (`src/lib/admin.ts`)

#### Authentication
```typescript
checkIsAdmin(): Promise<boolean>
```
Check if current user is an admin.

#### Template Creators
```typescript
createTemplateCreator(creator: CreatorData): Promise<TemplateCreator | null>
updateTemplateCreator(id: string, updates: Partial<CreatorData>): Promise<TemplateCreator | null>
deleteTemplateCreator(id: string): Promise<boolean>
getAllTemplateCreators(): Promise<TemplateCreator[]>
```

#### Loop Templates
```typescript
createLoopTemplate(
  template: CreateLoopTemplateInput,
  tasks: TaskInput[]
): Promise<LoopTemplate | null>

updateLoopTemplate(id: string, updates: Partial<LoopTemplate>): Promise<LoopTemplate | null>
deleteLoopTemplate(id: string): Promise<boolean>
```

#### Template Tasks
```typescript
createTemplateTask(task: TaskInput): Promise<TemplateTask | null>
updateTemplateTask(id: string, updates: Partial<TaskInput>): Promise<TemplateTask | null>
deleteTemplateTask(id: string): Promise<boolean>
getTemplateTasks(templateId: string): Promise<TemplateTask[]>
```

#### Analytics
```typescript
getAdminDashboardStats(): Promise<DashboardStats | null>
getTemplatePerformance(): Promise<TemplatePerformance[]>
getUserSummary(): Promise<UserSummary[]>
```

#### Affiliate Tracking
```typescript
trackAffiliateClick(templateId: string, affiliateLink: string): Promise<void>
markAffiliateConversion(clickId: string, conversionAmount?: number): Promise<boolean>
```

#### User Management
```typescript
toggleUserAdminStatus(userId: string, isAdmin: boolean): Promise<boolean>
```

### Custom Hook

```typescript
// src/hooks/useAdmin.ts
import { useAdmin } from '../hooks/useAdmin';

function MyComponent() {
  const { isAdmin, loading } = useAdmin();

  if (loading) return <Loading />;
  if (!isAdmin) return <Unauthorized />;

  return <AdminPanel />;
}
```

## Security Considerations

1. **Admin Access**: Only grant admin status to trusted users
2. **RLS Policies**: All admin operations are protected by Row Level Security
3. **Service Role Key**: Never expose your service role key in client code
4. **Webhook Validation**: Always validate webhook signatures before processing
5. **Rate Limiting**: Consider adding rate limiting to prevent abuse

## Troubleshooting

### "You don't have permission to perform this action"

**Solution**: Ensure your user has `is_admin = true` in the `user_profiles` table.

```sql
SELECT is_admin FROM user_profiles WHERE id = auth.uid();
```

### Affiliate clicks not tracking

**Possible causes**:
1. User is not logged in (optional, but helps with attribution)
2. Database function `track_affiliate_click` failed
3. Network error

**Check logs**:
```javascript
console.log('[Admin] Tracking affiliate click...');
```

### Templates not appearing in admin panel

**Solution**: Check RLS policies:

```sql
-- Should return templates
SELECT * FROM loop_templates;
```

If empty but you know templates exist, check if you're an admin:

```sql
SELECT is_admin FROM user_profiles WHERE id = auth.uid();
```

## Future Enhancements

Potential features for future development:

1. **Bulk Operations**: Import/export templates via CSV
2. **Email Notifications**: Alert admins of new signups or conversions
3. **Advanced Analytics**: Charts and graphs for performance trends
4. **Content Scheduling**: Schedule template releases
5. **A/B Testing**: Test different template descriptions
6. **Automated Conversion Tracking**: Direct integration with affiliate programs
7. **Role-Based Permissions**: Granular permissions (editor, moderator, etc.)
8. **Audit Logs**: Track all admin actions

## Support

For issues or questions:
1. Check the console logs for errors
2. Verify database migrations were applied
3. Check Supabase logs for RLS policy failures
4. Review this documentation

## Version History

- **v1.0.0** (2025-11-18): Initial admin system release
  - Template management
  - Creator management
  - User management
  - Affiliate tracking
  - Analytics dashboard
