# 🔧 Database Migration Troubleshooting

You got errors when running the migration. Let's fix this step by step.

## ❌ Error You Received
```
ERROR: 42703: column "task_id" does not exist
ERROR: 42703: column "task_id" referenced in foreign key constraint does not exist
```

This means the migration tried to create foreign keys to tables/columns that don't exist yet.

---

## ✅ Solution: Run the SAFE Migration

I've created a safer migration that checks for existing tables/columns before trying to modify them.

### Step 1: Check Your Current Schema

1. Go to Supabase Dashboard → SQL Editor
2. Run this query to see what exists:

```sql
-- See what tables you have
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

3. Check if you have a `tasks` table:

```sql
-- See tasks table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;
```

### Step 2: Run the Safe Migration

**Use this file instead**: `supabase/migrations/20251115_extended_tasks_SAFE.sql`

1. Open: `supabase/migrations/20251115_extended_tasks_SAFE.sql`
2. Copy **ALL** contents
3. Paste into Supabase SQL Editor
4. Click **Run**

This version:
- ✅ Checks if columns exist before adding them
- ✅ Checks if tables exist before creating them
- ✅ Uses `CREATE TABLE IF NOT EXISTS`
- ✅ Handles the case where schema might be different

---

## 🔍 Common Issues

### Issue 1: Tasks Table Doesn't Exist

**If you don't have a `tasks` table**, you need to create the base schema first.

Run this **FIRST**:

```sql
-- Create base loops table
CREATE TABLE IF NOT EXISTS loops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  owner UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  reset_rule TEXT DEFAULT 'manual',
  next_reset_at TIMESTAMP WITH TIME ZONE,
  is_favorite BOOLEAN DEFAULT FALSE,
  loop_type TEXT DEFAULT 'personal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create base tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT TRUE,
  assigned_user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  is_one_time BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can manage own loops" ON loops
  FOR ALL USING (auth.uid() = owner_id OR auth.uid() = owner);

CREATE POLICY "Users can manage tasks in own loops" ON tasks
  FOR ALL USING (
    loop_id IN (SELECT id FROM loops WHERE owner_id = auth.uid() OR owner = auth.uid())
  );
```

**Then** run the safe migration.

### Issue 2: Column Name Mismatch

If your loops table has `owner` instead of `owner_id`, the RLS policies might fail.

**Check with:**
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'loops';
```

**If you see `owner` but not `owner_id`**, add this column:
```sql
ALTER TABLE loops ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE loops SET owner_id = owner WHERE owner_id IS NULL;
```

### Issue 3: Foreign Key References Wrong Column

The error mentions the attachments table trying to reference `task_id`. This should work if tasks table has an `id` column.

**Verify tasks has an id column:**
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name = 'id';
```

**Should return:** `id`

If it doesn't exist, something is very wrong with your base schema.

---

## 📋 Step-by-Step Migration Process

### Option A: Fresh Start (Recommended if you have no data)

```sql
-- 1. Drop all extended feature tables (if they exist)
DROP TABLE IF EXISTS task_reminders CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS task_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- 2. Run the safe migration
-- (Copy from 20251115_extended_tasks_SAFE.sql)
```

### Option B: Incremental (If you have data to preserve)

Run the safe migration - it will skip anything that already exists.

---

## 🧪 Test After Migration

After successful migration, run this to verify:

```sql
-- Check all new columns exist on tasks
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('priority', 'due_date', 'notes', 'time_estimate_minutes', 'reminder_at', 'completed_at');

-- Should return 6 rows

-- Check all new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tags', 'task_tags', 'subtasks', 'attachments', 'task_reminders');

-- Should return 5 rows
```

---

## 🎯 Quick Fix (Most Common Case)

**If you just need to run the migration without the errors:**

1. Use `20251115_extended_tasks_SAFE.sql` instead of the other migration file
2. It handles all the edge cases automatically
3. Safe to run multiple times (idempotent)

---

## 💬 Still Having Issues?

Share the output of this query:

```sql
-- Show me your current schema
SELECT
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN ('loops', 'tasks')
ORDER BY t.table_name, c.ordinal_position;
```

This will help diagnose exactly what's different in your database.
