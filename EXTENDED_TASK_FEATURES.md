# 🚀 Extended Task Features Implementation

**Inspired by "The Checklist Manifesto"** - Enhanced task management while preserving the simplicity of recurring loops.

---

## 📋 What's New

All the features you requested have been added to tasks:

### ✅ Task Properties
- **Priority Levels** - None, Low, Medium, High, Urgent (with color coding)
- **Due Dates** - Set deadlines for tasks
- **Notes** - Additional details beyond the description
- **Tags** - Categorize tasks with custom labels
- **Attachments** - Link files, images, and documents
- **Subtasks** - Break down complex tasks into steps
- **Time Estimates** - Track how long tasks should take
- **Reminders** - Get notified before tasks are due

---

## 📂 Files Created/Modified

### New Components (`src/components/native/`)
1. **PriorityBadge.tsx** - Visual indicator for task priority
2. **TaskTag.tsx** - Display and manage task tags
3. **EnhancedTaskCard.tsx** - Rich task display with all metadata
4. **TaskEditModal.tsx** - Comprehensive task creation/editing modal

### New Utilities (`src/lib/`)
1. **taskHelpers.ts** - Helper functions for:
   - Tag management (create, attach, remove)
   - Subtask management (create, toggle, delete)
   - Attachment management (upload, delete)
   - Reminder management (create, delete)
   - Loading tasks with all related data

### Updated Types (`src/types/`)
1. **loop.ts** - Extended with:
   - `TaskPriority` type
   - `Tag`, `Attachment`, `Subtask`, `TaskReminder` interfaces
   - `TaskWithDetails` interface
   - Priority colors and labels

### Database Migrations (`supabase/migrations/`)
1. **20251115_add_extended_task_features.sql** - New migration
2. **00_apply_all_migrations.sql** - Updated consolidated migration

### Dependencies
- **@react-native-community/datetimepicker** - Date/time pickers (installed ✅)

---

## 🗄️ Database Schema

### Extended `tasks` Table
```sql
ALTER TABLE tasks ADD COLUMN:
- priority (text: 'none' | 'low' | 'medium' | 'high' | 'urgent')
- due_date (timestamp)
- notes (text)
- time_estimate_minutes (integer)
- reminder_at (timestamp)
- completed_at (timestamp) - Auto-set on completion
```

### New Tables

#### `tags`
```sql
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- name (text, unique per user)
- color (text, hex color)
- created_at (timestamp)
```

#### `task_tags` (Junction Table)
```sql
- task_id (uuid, references tasks)
- tag_id (uuid, references tags)
- created_at (timestamp)
```

#### `subtasks`
```sql
- id (uuid, primary key)
- parent_task_id (uuid, references tasks)
- description (text)
- status ('pending' | 'done')
- sort_order (integer)
- created_at, updated_at (timestamp)
```

#### `attachments`
```sql
- id (uuid, primary key)
- task_id (uuid, references tasks)
- file_name, file_url, file_type (text)
- file_size (bigint)
- uploaded_by (uuid, references auth.users)
- created_at (timestamp)
```

#### `task_reminders`
```sql
- id (uuid, primary key)
- task_id (uuid, references tasks)
- user_id (uuid, references auth.users)
- reminder_at (timestamp)
- is_sent (boolean)
- created_at (timestamp)
```

---

## 🔧 How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy/paste from: `supabase/migrations/00_apply_all_migrations.sql`
6. Click **Run** (or press ⌘/Ctrl + Enter)

### Option 2: Supabase CLI
```bash
# Link your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

---

## 💡 Usage Examples

### Using EnhancedTaskCard
```tsx
import { EnhancedTaskCard } from '../components/native/EnhancedTaskCard';
import { getTaskWithDetails } from '../lib/taskHelpers';

const task = await getTaskWithDetails(taskId);

<EnhancedTaskCard
  task={task}
  onPress={() => handleTaskPress(task)}
  onToggle={() => toggleTask(task)}
/>
```

### Using TaskEditModal
```tsx
import { TaskEditModal } from '../components/native/TaskEditModal';
import { getUserTags, createTag } from '../lib/taskHelpers';

const [modalVisible, setModalVisible] = useState(false);
const [availableTags, setAvailableTags] = useState([]);

useEffect(() => {
  loadTags();
}, []);

const loadTags = async () => {
  const tags = await getUserTags(user.id);
  setAvailableTags(tags);
};

<TaskEditModal
  visible={modalVisible}
  onClose={() => setModalVisible(false)}
  onSave={handleSaveTask}
  task={editingTask}
  availableTags={availableTags}
  onCreateTag={createTag}
/>
```

### Managing Tags
```tsx
import { createTag, addTagToTask, getUserTags } from '../lib/taskHelpers';

// Create a new tag
const tag = await createTag(userId, 'Important', '#EF4444');

// Add tag to task
await addTagToTask(taskId, tag.id);

// Get all user tags
const tags = await getUserTags(userId);
```

### Managing Subtasks
```tsx
import { createSubtask, toggleSubtask, getTaskSubtasks } from '../lib/taskHelpers';

// Create subtask
const subtask = await createSubtask(parentTaskId, 'First step', 0);

// Toggle subtask
await toggleSubtask(subtask.id, subtask.status);

// Get all subtasks for a task
const subtasks = await getTaskSubtasks(taskId);
```

---

## 🎨 UI Components Guide

### PriorityBadge
Displays a colored badge for task priority:
- **none**: Hidden (gray)
- **low**: Blue
- **medium**: Amber
- **high**: Red
- **urgent**: Dark Red

```tsx
<PriorityBadge priority="high" size="small" />
```

### TaskTag
Displays a tag chip with optional remove button:
```tsx
<TaskTag
  tag={tag}
  size="small"
  onPress={() => handleTagPress(tag)}
  onRemove={() => handleRemoveTag(tag)}
/>
```

### EnhancedTaskCard
Shows task with all metadata:
- Priority badge
- Description (with strikethrough when done)
- Tags
- Due date (highlighted if overdue)
- Time estimate
- Subtask progress (e.g., "☑️ 2/5")
- Attachment count
- Reminder indicator
- Notes preview

---

## 🔐 Security (Row Level Security)

All new tables have RLS policies:
- **tags**: Users can only see/modify their own tags
- **task_tags**: Users can tag tasks in their loops
- **attachments**: Users can attach files to tasks in their loops
- **subtasks**: Users can manage subtasks for tasks in their loops
- **task_reminders**: Users can only see/modify their own reminders

---

## 📱 Integration Steps

### 1. Update LoopDetailScreen
Replace the basic task list with `EnhancedTaskCard`:

```tsx
import { EnhancedTaskCard } from '../components/native/EnhancedTaskCard';
import { getTaskWithDetails } from '../lib/taskHelpers';

// In your render:
{tasks.map((task) => (
  <EnhancedTaskCard
    key={task.id}
    task={task}
    onPress={() => handleEditTask(task)}
    onToggle={() => toggleTask(task)}
  />
))}
```

### 2. Replace FAB addTask Handler
Use `TaskEditModal` instead of simple prompt:

```tsx
import { TaskEditModal } from '../components/native/TaskEditModal';

const [modalVisible, setModalVisible] = useState(false);
const [editingTask, setEditingTask] = useState(null);

const handleSaveTask = async (taskData) => {
  if (editingTask) {
    // Update existing task
    await updateTaskExtended(editingTask.id, taskData);
  } else {
    // Create new task
    await supabase.from('tasks').insert({
      loop_id: loopId,
      ...taskData,
    });
  }
  await loadLoopData();
};

// Replace FAB action
<FAB onPress={() => setModalVisible(true)} />

<TaskEditModal
  visible={modalVisible}
  onClose={() => setModalVisible(false)}
  onSave={handleSaveTask}
  task={editingTask}
  availableTags={tags}
/>
```

### 3. Load Task Details
When displaying task detail view, load full data:

```tsx
import { getTaskWithDetails } from '../lib/taskHelpers';

const loadTask = async () => {
  const fullTask = await getTaskWithDetails(taskId);
  setTask(fullTask);
};
```

---

## 🚨 Important Notes

### Default Values
- All new fields are **optional** except `priority` (defaults to 'none')
- Existing tasks will work without changes
- The app remains fully backward compatible

### Attachments
- File upload to Supabase Storage needs to be implemented
- Current implementation creates database records only
- See `uploadAttachment()` in `taskHelpers.ts` for TODO

### Reminders
- Notification system needs to be implemented separately
- Database structure is ready
- Consider using Expo Notifications for push notifications

### Performance
- All new tables have proper indexes
- Use `getTaskWithDetails()` sparingly (loads all related data)
- Consider pagination for large task lists

---

## 🎯 Checklist Manifesto Philosophy

These features enhance, not complicate:

✅ **Priority** - Focus on what matters most
✅ **Due Dates** - Create urgency for critical items
✅ **Notes** - Capture context without cluttering
✅ **Tags** - Organize without rigid hierarchies
✅ **Subtasks** - Break complex procedures into steps
✅ **Time Estimates** - Build realistic schedules
✅ **Reminders** - Never miss critical tasks

**Core simplicity preserved**: The basic loop → task → complete → reloop workflow remains unchanged.

---

## 🧪 Testing Checklist

- [ ] Run database migrations
- [ ] Create a tag
- [ ] Add task with priority
- [ ] Set due date on task
- [ ] Add notes to task
- [ ] Tag a task
- [ ] Create subtasks
- [ ] Set time estimate
- [ ] Toggle subtask completion
- [ ] Mark task complete (verify completed_at auto-set)
- [ ] View EnhancedTaskCard display
- [ ] Test TaskEditModal with all fields

---

## 📚 Next Steps

### Recommended Implementation Order
1. ✅ **Apply migrations** to database
2. ✅ **Test types** compile correctly
3. **Update LoopDetailScreen** to use EnhancedTaskCard
4. **Replace FAB** with TaskEditModal
5. **Create tag management screen** (optional)
6. **Implement attachment upload** to Supabase Storage
7. **Add reminder notification system**
8. **Create subtask detail view** (optional)

### Future Enhancements
- [ ] Recurring task templates
- [ ] Task search/filter by tags, priority
- [ ] Time tracking (actual vs estimated)
- [ ] Task analytics dashboard
- [ ] Shared task assignments
- [ ] Attachment previews
- [ ] Voice notes as attachments
- [ ] Smart reminder suggestions

---

## 📞 Support

All components are documented inline with TypeScript. Check:
- Component prop types for usage
- Helper function JSDoc comments
- Type definitions in `src/types/loop.ts`

**Built with the spirit of The Checklist Manifesto** - Simple, powerful, reliable. 🔄
