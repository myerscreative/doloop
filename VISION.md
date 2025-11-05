# 🌀 DoLoop Vision – "Recipes for Success"

<!-- 
🧭 PURPOSE FOR CURSOR:
This document defines the mental model and design rules Cursor should respect when generating UI, data models, or logic.
Keep the tone simple, minimal, and human. No clutter. No complexity beyond what's necessary.
-->

## 🔑 Core Concept

**DoLoop** is not a to-do list — it's a *cookbook of success recipes.*

Each **Loop** is a reusable checklist (a "recipe") that helps users succeed at recurring goals or situations.

Examples:
- 🕗 Morning Routine → recipe for focus  
- 🏕 Camping Trip → recipe for adventure  
- 💼 Workday Prep → recipe for readiness  
- 👥 Team Workflow → shared recipe for performance  

Every Loop represents a *repeatable formula for success.*

---

## 🧭 Design Philosophy

> "Clean, calm, and frictionless — everything you need, nothing you don't."

### 1. Zero clutter
Keep screens light and intuitive.  
Large tap targets, generous spacing, minimal icons.  
Each screen should feel peaceful and clear.

### 2. Find fast
Users should locate or start their "recipe for success" instantly.
- Global search across loops and tasks  
- Favorites appear first  
- Recently used loops under "Quick Access"

### 3. Natural metaphor
Loops behave like **recipes.**

| Concept | Real-world equivalent |
|----------|-----------------------|
| Loop | Recipe |
| Task | Ingredient or Step |
| Assigned user | Sous-chef / teammate |
| Due date | Bake time |
| Image | Visual reference |
| Notes | Chef's tips |

### 4. Shared success
Loops can be shared like family recipes.  
Collaborate, assign tasks, and watch progress update live.

### 5. Reloop simplicity
The **Reloop button** resets all recurring tasks to unchecked.  
One-time tasks stay completed.  
Auto-reset (daily, weekly, custom) is optional per loop.

### 6. Joy in use
Animations should feel *alive but calm.*  
Circular progress rings ("baking timers") show completion.  
Soft color palettes and subtle motion create delight without distraction.

---

## 🧩 Structural Guidelines (for Developers)

<!-- Cursor: follow these naming and structure rules when building components or APIs -->

### Naming
Use these consistent terms:
- **Loop** – the parent entity
- **Task** – an actionable item
- **User** – the participant
- **LoopMember** – mapping for shared loops

### UX Flow

#### Home Screen
```
┌─────────────────────────────────────┐
│  [Search bar]                       │
│                                     │
│  ⭐ Favorites                        │
│  ├─ Morning Routine          [▶️]   │
│  └─ Team Standup            [▶️]   │
│                                     │
│  📋 My Loops                         │
│  ├─ My Day                          │
│  ├─ Important                       │
│  ├─ Planned                         │
│  └─ Assigned to me                  │
│                                     │
│  📚 Loop Library                     │
│  ├─ Daily (3)                       │
│  ├─ Work (5)                        │
│  ├─ Personal (2)                    │
│  └─ Shared (1)                      │
│                                     │
│  [+ Create a new Loop]              │
│                                     │
│  🎯 Your Progress                    │
│  [Target/Momentum visualization]     │
└─────────────────────────────────────┘
```

#### Loop Detail Screen
```
┌─────────────────────────────────────┐
│  ← [Loop Title]           ⭐ ⚙️      │
│  [Description]                      │
│                                     │
│  Progress: ◯ 3/5 complete (60%)     │
│  🔥 12 day streak                    │
│                                     │
│  Tasks:                             │
│  ☑️ Meditate (10 min)               │
│  ☑️ Exercise                        │
│  ☑️ Journal                         │
│  ☐ Review goals                     │
│  ☐ Plan day                         │
│                                     │
│  [🔄 Reloop] [Share]                │
└─────────────────────────────────────┘
```

#### Create/Edit Loop
```
┌─────────────────────────────────────┐
│  ← New Loop                         │
│                                     │
│  Title: [___________________]       │
│  Description: [____________]        │
│                                     │
│  Type: ⚪ Daily ⚪ Work ⚪ Personal   │
│                                     │
│  Tasks:                             │
│  1. [Task title]         🗑️         │
│     ☐ Recurring                     │
│     [+ Add note/image/assignee]     │
│                                     │
│  [+ Add task]                       │
│                                     │
│  [Cancel]            [Create Loop]  │
└─────────────────────────────────────┘
```

### Key Interactions

1. **Tap a Loop** → Open loop detail with tasks
2. **Check a task** → Smooth animation, update progress ring
3. **Reloop button** → Reset recurring tasks with satisfying animation
4. **Long-press task** → Quick actions (edit, delete, assign)
5. **Swipe task left** → Delete (with undo option)
6. **Pull to refresh** → Sync shared loops

---

## 🎨 Visual Design Principles

### Color Palette

**Loop Type Colors:**
- **Daily** → Yellow/Gold (`#FFB800` - `#FF8C00`)
- **Work** → Cyan/Blue (`#00BCD4` - `#0097A7`)
- **Personal** → Red/Pink (`#F44336` - `#D32F2F`)
- **Completion** → Green (`#4CAF50` - `#388E3C`)

**Neutrals:**
- Background → Soft gradient (`from-purple-50 to-blue-50`)
- Text → Dark gray (`#1F2937`)
- Borders → Light gray (`#E5E7EB`)
- Cards → White with subtle shadow

### Typography
- Headings: **Bold, clear, 18-24px**
- Body: Regular, 14-16px
- Labels: Medium, 12-14px

### Spacing
- Generous padding (16-24px)
- Clear section separation
- Breathing room between interactive elements

### Animations
- **Fast**: 200ms for state changes (check/uncheck)
- **Medium**: 300-500ms for screen transitions
- **Slow**: 1000ms for progress ring animations
- **Easing**: `ease-in-out` for smooth, natural motion

---

## 🔧 Technical Architecture

### Data Models

```typescript
interface Loop {
  id: string;
  title: string;
  description?: string;
  type: 'daily' | 'work' | 'personal';
  status: 'active' | 'paused' | 'archived';
  
  // Progress tracking
  totalTasks: number;
  completedTasks: number;
  
  // Momentum tracking
  currentStreak: number;
  longestStreak: number;
  completionHistory: CompletionRecord[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastCompletedAt?: Date;
  isFavorite?: boolean;
  
  // Tasks/items
  items?: LoopItem[];
}

interface LoopItem {
  id: string;
  title: string;
  completed: boolean;
  order?: number;
  
  // Options
  assignedTo?: string;      // User ID or name
  isRecurring?: boolean;    // true = resets on reloop
  dueDate?: string;         // ISO date string
  notes?: string;
  imageUrl?: string;
  
  // Sub-tasks
  subTasks?: SubTask[];
}

interface CompletionRecord {
  date: string;             // ISO date (YYYY-MM-DD)
  completed: number;
  total: number;
}
```

### Component Structure

```
src/
├── app/                    # Next.js pages
│   ├── page.tsx           # Home screen
│   └── loops/
│       ├── page.tsx       # Loop library
│       ├── [id]/
│       │   └── page.tsx   # Loop detail
│       └── create/
│           └── page.tsx   # Create/edit loop
│
├── components/
│   ├── loops/
│   │   ├── LoopCard.tsx          # Loop preview card
│   │   ├── LoopList.tsx          # List of loops
│   │   └── LoopItemOptions.tsx   # Task options
│   │
│   └── ui/
│       ├── CircularProgress.tsx  # Progress ring
│       ├── BeeDot.tsx           # Momentum dots
│       ├── TargetMomentum.tsx   # Target visualization
│       └── DoLoopLogo.tsx       # App logo
│
├── lib/
│   ├── loopStorage.ts     # LocalStorage/DB operations
│   ├── loopUtils.ts       # Helper functions
│   └── mockData.ts        # Demo data
│
└── types/
    └── loop.ts            # TypeScript types
```

---

## 🚀 Feature Roadmap

### Phase 1: Core Experience ✅
- ✅ Loop creation and editing
- ✅ Task management (add, complete, delete)
- ✅ Progress tracking with circular rings
- ✅ Favorites system
- ✅ Basic momentum/streak tracking
- ✅ LocalStorage persistence

### Phase 2: Enhanced UX (Next)
- 🔲 Reloop functionality (reset recurring tasks)
- 🔲 Search across loops and tasks
- 🔲 Task reordering (drag & drop)
- 🔲 Rich task options (notes, images, due dates)
- 🔲 Loop templates/categories

### Phase 3: Collaboration
- 🔲 User accounts & authentication
- 🔲 Share loops with others
- 🔲 Assign tasks to team members
- 🔲 Real-time sync
- 🔲 Activity feed

### Phase 4: Intelligence
- 🔲 Smart suggestions ("People also use...")
- 🔲 Auto-scheduling based on patterns
- 🔲 Insights & analytics
- 🔲 Habit tracking integration

---

## 📝 Writing Guidelines

### Loop Titles
- **Keep short** (2-4 words ideal)
- **Action-oriented** ("Morning Routine" not "Things I Do in Morning")
- **Specific** ("Team Standup" not "Meeting")

### Task Descriptions
- **One action per task** ("Meditate" not "Meditate and stretch")
- **Clear verb** ("Review pull requests" not "PRs")
- **Measurable when possible** ("Read 20 pages" not "Read")

### Loop Descriptions
- **Optional but helpful** for context
- **One sentence max** (2-3 lines)
- **Explain the "why"** ("Start the day with focus and energy")

---

## 🎯 Success Metrics

A successful DoLoop experience means:

1. **Fast engagement** → User can start/complete a loop in < 5 seconds
2. **High completion rate** → 70%+ of started loops get finished
3. **Return usage** → Users come back daily/weekly
4. **Momentum visible** → Streaks and progress create motivation
5. **Effortless creation** → New loops created in < 2 minutes

---

## 💡 Design Decision Reference

### Why "Loop" not "Checklist"?
- Emphasizes recurring, cyclical nature
- "Re-loop" is more fun than "reset"
- Matches the flow/rhythm of habit formation

### Why circular progress rings?
- Mimics timer/clock metaphor (recipes!)
- More engaging than linear bars
- Works well in card layouts

### Why favorites instead of folders?
- Less cognitive overhead
- Faster access to frequently-used loops
- Can add tags/filters later without complexity

### Why local-first storage?
- Instant, no loading states
- Works offline
- Simple to start, can add sync later

---

## 🤝 Contributing Guidelines

When adding features or making changes:

1. **Stay true to the metaphor** → Ask "Does this fit the recipe concept?"
2. **Minimize friction** → Every tap/click should feel purposeful
3. **Preserve calm** → No aggressive colors, sounds, or notifications
4. **Test with real use** → Does it work for morning routines? Work sprints? Camping trips?
5. **Document patterns** → Update this doc if you create new conventions

---

**Remember:** DoLoop is about making success repeatable. Every feature should help users create, follow, and improve their recipes for success. 🌀









