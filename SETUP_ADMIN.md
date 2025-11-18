# Admin Setup Guide

## Quick Start

### 1. Login Credentials
- **Email**: `dev@dev.com`
- **Password**: `dev123`
- Use the "🚀 Auto-Fill Login" button on the login screen

### 2. Apply Database Migration

1. Go to your Supabase Dashboard: https://faaidvdogakvrdwloxjf.supabase.co
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/20251118_add_admin_system.sql`
5. Click **Run**

### 3. Set Admin User

Run this SQL query in the SQL Editor:

```sql
UPDATE user_profiles
SET is_admin = true
WHERE email = 'dev@dev.com';
```

### 4. Access Admin Features

After completing the above steps:
- Refresh/restart the app
- Look for the **shield icon** (🛡️) in the header
- Click it to access the Admin Dashboard

## Admin Features

Once you're an admin, you can:
- **Manage Loop Templates**: Add, edit, delete library loops
- **Manage Creators**: Add coaches and their information
- **Track Affiliates**: Monitor clicks, conversions, and revenue
- **Manage Users**: View users and grant admin privileges
- **View Analytics**: Dashboard with key metrics

## Troubleshooting

**Don't see the shield icon?**
- Make sure you ran both SQL queries above
- Log out and log back in
- Check that your email in the database matches 'dev@dev.com'

**Can't apply the migration?**
- Make sure you're logged into the correct Supabase project
- Check that you have admin rights in Supabase
- Try running the migration in smaller chunks if it fails

## Need Help?

Check the detailed documentation in `ADMIN_SYSTEM.md`
