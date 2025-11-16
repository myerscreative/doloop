# DoLoop - Cursor AI Development Prompt

## Project Overview

You are building **DoLoop**, a productivity app centered around "Momentum Through Completion" that uses loop-based task management. The core concept revolves around recurring task lists (loops) that users can complete repeatedly to build momentum and maintain productive habits.

## Brand Identity

- **Mascot**: Bee theme (🐝)
- **Primary Colors**: Gold/Yellow (#fbbf24, #f59e0b) - NOT purple
- **Visual Style**: Clean, professional with playful bee accents
- **Key Metaphor**: Circular progress indicators reinforce the "loop" concept
- **Target Indicators**: Rounded gold squares (bullseye/target style) serve as both goal achievement symbols and bee-themed visual elements

## Tech Stack

### Frontend
- **Framework**: React Native with Expo
- **Language**: TypeScript (strict mode enabled)
- **Styling**: React Native StyleSheet with theme support
- **Animations**: React Native Reanimated or similar for smooth animations
- **Navigation**: React Navigation (stack + tab navigators)
- **State Management**: React Context API or Zustand for global state

### Backend
- **Platform**: Supabase
- **Authentication**: Supabase Auth (Apple Sign In, Google Sign In)
- **Database**: PostgreSQL via Supabase
- **Real-time**: Supabase real-time subscriptions for live updates
- **Storage**: Supabase Storage (if needed for future features)

### Build & Deployment
- **Platform**: iOS (with Android support structure)
- **Build Tool**: EAS Build (Expo Application Services)
- **Distribution**: TestFlight for beta testing
- **Environment**: Development, Staging, Production configs

## Core Features

### 1. Authentication

```typescript
// Authentication flow requirements:
- Apple Sign In (primary for iOS)
- Google Sign In (secondary)
- Email/password as fallback
- Persistent sessions
- Secure token storage
- Profile management (name, avatar)
```

**Key Screens:**
- Welcome/Landing screen
- Sign in screen
- Account creation
- Profile setup

### 2. Onboarding Flow

```typescript
// Multi-step onboarding to personalize experience:

Screen 1: Welcome
- DoLoop logo + bee mascot
- Value proposition
- "Let's get started" CTA

Screen 2: User Type
Question: "What best describes you?"
Options:
- Full-time parent
- Home office
- Office Worker
- Student
- Retired

Screen 3: Use Case
Question: "How will you use DoLoop?"
Options (multiple select):
- Daily Loops
- Specialized Loops
- Shared Loops
- Self Improvement
- All of the above

Screen 4: Getting Started
Question: "How would you like to get started?"
Options:
- Create a loop (from scratch)
- Pre-made loops (templates)
- Tutorial (guided walkthrough)

Screen 5: Success
- Gold checkmark
- "You're ready to start your new 'get it done right' lifestyle!"
- "Let's get started!" CTA
```

### 3. Loop Management

**Data Structure:**

```typescript
interface Loop {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string; // hex color for visual identification
  icon?: string; // emoji or icon identifier
  category?: 'playful' | 'focus' | 'family' | 'pro' | 'wellness' | 'custom';
  reset_schedule: 'daily' | 'weekly' | 'custom';
  tasks: Task[];
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  order_index: number;
}

interface Task {
  id: string;
  loop_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

interface LoopCompletion {
  id: string;
  loop_id: string;
  user_id: string;
  completed_at: string;
  tasks_completed: string[]; // array of task IDs
}

interface TaskCompletion {
  id: string;
  task_id: string;
  loop_id: string;
  user_id: string;
  completed_at: string;
}
```

**Key Screens:**
- Loop Library (main view with categories/filters)
- Loop Detail (view/edit specific loop)
- Loop Creation (step-by-step loop builder)
- Task Completion Modal (check off tasks for a loop)

### 4. Home Screen

**Layout:**
```
- Header with user greeting and profile
- "Today's Loops" section
- Active loops with circular progress indicators
- Quick actions (+ Create Loop)
- Streak counter
- Recent completions feed
```

**Loop Cards:**
- Compact, tappable cards
- Circular progress indicator showing completion (0-100%)
- Loop name and icon/color
- Quick complete button
- Tap to open detail modal

### 5. Progress Tracking

**Features:**
- Circular progress visualization (SVG with Framer Motion style animations)
- Streak tracking (consecutive days/weeks completing loops)
- Completion history
- Statistics dashboard
- Achievement celebrations (confetti, animations)

**Circular Progress Component:**

```typescript
interface CircularProgressProps {
  progress: number; // 0-100
  size: number;
  strokeWidth: number;
  color: string;
  showPercentage?: boolean;
  animated?: boolean;
}
```

### 6. Categories & Organization

**Default Categories:**
- 🐝 Playful (Fun & lighthearted)
- 🎯 Focus (Minimal distractions)
- 👨‍👩‍👧 Family (Shared & collaborative)
- 💼 Pro (Business focused)
- 🧘‍♀️ Wellness (Health & mindfulness)
- ⭐ Favorites (user-starred loops)
- 🆕 Custom categories (user-created)

**Loop Library Features:**
- Tab navigation between categories
- Search/filter functionality
- Sort options (alphabetical, recent, most used)
- Drag-to-reorder within categories

## Design System

### Colors

```typescript
const colors = {
  // Primary (Bee/Gold theme)
  primary: '#fbbf24',
  primaryDark: '#f59e0b',
  primaryLight: '#fde68a',
  
  // Neutrals
  background: '#ffffff',
  backgroundSecondary: '#f9fafb',
  surface: '#ffffff',
  
  // Text
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  
  // Status
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  
  // Dark mode
  dark: {
    background: '#111827',
    backgroundSecondary: '#1f2937',
    surface: '#374151',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
  }
};
```

### Typography

```typescript
const typography = {
  h1: { fontSize: 32, fontWeight: '700' },
  h2: { fontSize: 24, fontWeight: '600' },
  h3: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 14, fontWeight: '400' },
  button: { fontSize: 16, fontWeight: '600' },
};
```

### Spacing

```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
```

### Components
- Rounded corners (8-16px border radius)
- Subtle shadows for elevation
- Smooth transitions (300ms ease)
- Gold accent colors on interactive elements
- Bee emoji/icons as visual accents (subtle, not overwhelming)

## Key User Flows

### 1. First Time User

```
1. Open app
2. View welcome screen with bee branding
3. Sign in with Apple/Google
4. Complete onboarding (4 steps)
5. Choose: Create loop / Browse templates / Tutorial
6. Land on Home screen with first loop or templates
```

### 2. Daily User - Complete Loop

```
1. Open app to Home screen
2. See "Today's Loops" with progress indicators
3. Tap loop card
4. Task completion modal opens
5. Check off tasks (with smooth animations)
6. Complete all tasks
7. Celebration animation (confetti, success message)
8. Update streak counter
9. Loop resets based on schedule
```

### 3. Create New Loop

```
1. Tap + button
2. Enter loop name
3. Choose color/icon
4. Add tasks (one by one or bulk)
5. Set reset schedule (daily/weekly/custom)
6. Assign to category (optional)
7. Save
8. Loop appears in library
```

### 4. View Progress

```
1. Navigate to Progress/Stats tab
2. See overview (total completions, current streak, etc.)
3. View detailed history by loop
4. See completion calendar
5. View achievements/milestones
```

## Database Schema (Supabase)

### Tables

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  user_type TEXT, -- from onboarding
  use_cases TEXT[], -- from onboarding
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loops table
CREATE TABLE loops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#fbbf24',
  icon TEXT,
  category TEXT,
  reset_schedule TEXT NOT NULL DEFAULT 'daily',
  is_favorite BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loop completions table (tracks when entire loop completed)
CREATE TABLE loop_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task completions table (tracks individual task completions)
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_loops_user_id ON loops(user_id);
CREATE INDEX idx_tasks_loop_id ON tasks(loop_id);
CREATE INDEX idx_loop_completions_user_id ON loop_completions(user_id);
CREATE INDEX idx_loop_completions_loop_id ON loop_completions(loop_id);
CREATE INDEX idx_task_completions_user_id ON task_completions(user_id);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE loop_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own loops" ON loops FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own loops" ON loops FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own loops" ON loops FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own loops" ON loops FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for other tables...
```

## Project Structure

```
doloop/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── CircularProgress.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Input.tsx
│   │   ├── loops/
│   │   │   ├── LoopCard.tsx
│   │   │   ├── LoopList.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   └── TaskCompletionModal.tsx
│   │   └── onboarding/
│   │       ├── WelcomeScreen.tsx
│   │       ├── UserTypeScreen.tsx
│   │       ├── UseCaseScreen.tsx
│   │       └── GettingStartedScreen.tsx
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── SignUpScreen.tsx
│   │   ├── onboarding/
│   │   │   └── OnboardingFlow.tsx
│   │   ├── home/
│   │   │   └── HomeScreen.tsx
│   │   ├── loops/
│   │   │   ├── LoopLibraryScreen.tsx
│   │   │   ├── LoopDetailScreen.tsx
│   │   │   └── CreateLoopScreen.tsx
│   │   └── profile/
│   │       └── ProfileScreen.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── auth.service.ts
│   │   ├── loops.service.ts
│   │   └── analytics.service.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useLoops.ts
│   │   ├── useTheme.ts
│   │   └── useCompletions.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── LoopContext.tsx
│   ├── types/
│   │   ├── index.ts
│   │   ├── loop.types.ts
│   │   └── user.types.ts
│   ├── utils/
│   │   ├── colors.ts
│   │   ├── helpers.ts
│   │   └── constants.ts
│   └── theme/
│       ├── colors.ts
│       ├── typography.ts
│       └── spacing.ts
├── assets/
│   ├── images/
│   └── fonts/
├── app.json
├── App.tsx
├── package.json
└── tsconfig.json
```

## Development Guidelines

### Code Style
- Use functional components with hooks (no class components)
- TypeScript strict mode enabled
- Use named exports (avoid default exports except for screens)
- Keep components small and focused (< 200 lines)
- Use custom hooks for reusable logic
- Implement proper error boundaries

### Performance
- Use React.memo for expensive components
- Implement FlatList for long lists (loops, tasks)
- Lazy load screens with React.lazy
- Optimize images and assets
- Use Supabase real-time subscriptions wisely (avoid unnecessary listeners)

### Testing (Future)
- Jest for unit tests
- React Native Testing Library for component tests
- E2E tests with Detox

### Security
- Never commit API keys or secrets
- Use environment variables for sensitive data
- Implement proper RLS policies in Supabase
- Validate all user inputs
- Secure token storage (expo-secure-store)

## Key Implementation Notes

### 1. Circular Progress Animation

```typescript
// Use React Native Reanimated for smooth circular progress
// Reference the bullseye/target indicator design
// Gold color (#fbbf24) for completed portions
// Animate on task completion with spring physics
```

### 2. Loop Reset Logic

```typescript
// Daily: Reset at midnight local time
// Weekly: Reset on specified day (Monday default)
// Custom: User-defined interval
// Store last_completed_at timestamp
// Check on app open if reset needed
```

### 3. Streak Calculation

```typescript
// Count consecutive days/periods with at least one loop completion
// Break streak if user misses a day
// Show current streak prominently
// Celebrate milestones (7 days, 30 days, etc.)
```

### 4. Offline Support (Future Enhancement)

```typescript
// Queue completions locally
// Sync when connection restored
// Show sync status indicator
```

## Success Criteria

### MVP (Phase 1)
- ✅ User can sign in with Apple
- ✅ User completes onboarding flow
- ✅ User can create a loop with tasks
- ✅ User can complete tasks and see progress
- ✅ Loops reset on schedule
- ✅ Basic Home screen with today's loops
- ✅ Loop Library with categories

### Phase 2
- Shared loops (collaboration)
- Loop templates marketplace
- Advanced statistics and insights
- Achievements and gamification
- Social features (friends, sharing progress)
- Premium features (unlimited loops, advanced analytics)

## Getting Started Checklist

1. ✅ Initialize Expo project with TypeScript
2. ✅ Set up Supabase project and configure authentication
3. ✅ Create database schema and RLS policies
4. ✅ Implement authentication flow (Apple Sign In priority)
5. ✅ Build onboarding screens (4 steps)
6. ✅ Create Loop data models and services
7. ✅ Build Home screen with loop cards
8. ✅ Implement circular progress component
9. ✅ Build task completion modal
10. ✅ Create Loop Library with categories
11. ✅ Implement loop creation flow
12. ✅ Add streak tracking
13. ✅ Set up iOS build configuration
14. ✅ Test on TestFlight
15. ✅ Iterate based on feedback

---

## Additional Context

**Design Philosophy:**
- "Momentum Through Completion" - The app should feel satisfying to use
- Visual feedback is crucial (animations, celebrations)
- Keep it simple - don't overwhelm with features
- Gold/bee theme should be present but not overwhelming
- Professional yet playful

**User Psychology:**
- Loop completion should trigger dopamine (celebration animations)
- Streaks create commitment and consistency
- Circular progress gives clear visual goal
- Categories reduce cognitive load

**Future Vision:**
- Community loop templates
- Team/family shared loops
- Integration with calendar/reminders
- Apple Watch companion app
- Widgets for iOS home screen

---

**When implementing, prioritize:**
1. Solid authentication and data persistence
2. Smooth, delightful animations
3. Reliable loop reset logic
4. Clear visual hierarchy
5. Performance (app should feel fast)

Good luck building DoLoop! 🐝✨


