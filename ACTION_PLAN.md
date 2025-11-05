# 🎯 DoLoop Action Plan

*Based on Vision & Codebase Review — November 4, 2025*

---

## 📋 Quick Summary

Your codebase scores **8.0/10** on vision alignment! The foundation is solid with:
- ✅ Perfect naming conventions
- ✅ Beautiful design system
- ✅ Extensible architecture
- ✅ Smooth animations

**Key gaps:** Core features (Reloop, search), UX polish, and some performance issues.

---

## 🚀 Phase 1: Critical Fixes (Do These First)

### 1. Remove Mock Loops from Home Page
**File:** `src/app/page.tsx` (line 25)

**Current:**
```typescript
const combinedLoops = [...mockLoops, ...storedLoops];
```

**Fix:**
```typescript
const combinedLoops = [...storedLoops];
// Optional: Add "Show Demo Loops" toggle for new users
```

---

### 2. Replace Placeholder Text
**File:** `src/app/loops/create/page.tsx` (line 101-104)

**Current:**
```tsx
Lorem ipsum dolor sit amet, consectetur adipiscing...
```

**Fix:**
```tsx
Create a recipe for success — a checklist you can use over and over.
```

---

### 3. Add Loop Type Selector
**File:** `src/app/loops/new/page.tsx`

Add to the "name" step (around line 287):
```tsx
<div className="mb-6">
  <label className="block text-gray-600 text-sm mb-2">
    What type of loop is this?
  </label>
  <div className="flex gap-2">
    {(['daily', 'work', 'personal'] as const).map((type) => (
      <button
        key={type}
        onClick={() => setLoopType(type)}
        className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
          loopType === type
            ? 'bg-yellow-500 text-white shadow-md'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </button>
    ))}
  </div>
</div>
```

Then update line 84 to use `loopType` state instead of hardcoded `'daily'`.

---

### 4. Implement Reloop Button
**File:** Create `src/lib/loopUtils.ts` function

Add this function:
```typescript
/**
 * Reloop: Reset all recurring tasks to unchecked
 * One-time tasks stay completed
 */
export function reloop(loop: Loop): Loop {
  const resetItems = loop.items?.map(item => ({
    ...item,
    completed: item.isRecurring ? false : item.completed,
  }));
  
  return {
    ...loop,
    items: resetItems,
    completedTasks: resetItems?.filter(item => item.completed).length || 0,
    updatedAt: new Date(),
  };
}
```

Then add a Reloop button to loop detail pages:
```tsx
<button
  onClick={() => handleReloop(loop.id)}
  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-4 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M 12 4 Q 4 4, 4 12 Q 4 20, 12 20 Q 20 20, 20 12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M 20 12 L 17 9 M 20 12 L 17 15"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
  <span>Reloop</span>
</button>
```

---

## 🔧 Phase 2: Enhanced UX (Next Sprint)

### 5. Add Global Search
Create `src/components/SearchBar.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Loop } from '@/types/loop';

interface SearchBarProps {
  loops: Loop[];
  onSelect: (loopId: string) => void;
}

export function SearchBar({ loops, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const results = query.trim()
    ? loops.filter(loop =>
        loop.title.toLowerCase().includes(query.toLowerCase()) ||
        loop.items?.some(item =>
          item.title.toLowerCase().includes(query.toLowerCase())
        )
      )
    : [];

  return (
    <div className="relative mb-6">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
        placeholder="Search loops and tasks..."
        className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"
      />
      <svg
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="2" />
        <path d="M 12 12 L 18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((loop) => (
            <button
              key={loop.id}
              onClick={() => {
                onSelect(loop.id);
                setQuery('');
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <div className="font-medium text-gray-900">{loop.title}</div>
              <div className="text-sm text-gray-600">
                {loop.totalTasks} tasks · {loop.type}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### 6. Replace Alerts with Toast Notifications
Create `src/components/ui/Toast.tsx`:
```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

export function Toast({ message, type, isVisible, onClose }: ToastProps) {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg ${colors[type]} text-white z-50`}
        >
          <div className="flex items-center gap-2">
            <span>{message}</span>
            <button
              onClick={onClose}
              className="ml-2 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

Then create a context or hook to manage toasts:
```tsx
// src/lib/useToast.ts
import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({ message: '', type: 'info', isVisible: false });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
  }, []);

  return { toast, showToast };
}
```

---

### 7. Remove Polling from Home Page
**File:** `src/app/page.tsx` (lines 57-64)

**Remove:**
```typescript
// Remove this entire useEffect
useEffect(() => {
  const interval = setInterval(() => {
    loadLoops();
  }, 1000); // Check every second
  return () => clearInterval(interval);
}, []);
```

**Add (optional, for multi-tab sync):**
```typescript
useEffect(() => {
  // Listen for storage changes from other tabs
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'doloop-loops') {
      loadLoops();
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

---

### 8. Improve Accessibility

Add ARIA labels to interactive elements:

**Checkboxes:**
```tsx
<button
  onClick={handleToggle}
  role="checkbox"
  aria-checked={item.completed}
  aria-label={`Mark "${item.title}" as ${item.completed ? 'incomplete' : 'complete'}`}
  className="..."
>
```

**Modal dialogs:**
```tsx
<div
  role="dialog"
  aria-labelledby="modal-title"
  aria-modal="true"
>
  <h2 id="modal-title">Item Options</h2>
  {/* ... */}
</div>
```

**Color pickers:**
```tsx
<button
  onClick={() => setSelectedColor(color.value)}
  aria-label={`Select ${color.name} color`}
  style={{ backgroundColor: color.value }}
/>
```

---

### 9. Add Task Reordering (Drag & Drop)

Install dependency:
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

Then update the task list component:
```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';

function SortableTask({ item }: { item: LoopItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Task content */}
    </div>
  );
}
```

---

## 📈 Phase 3: Polish & Features (Later)

10. **Quick Access Section** — Recently used loops
11. **Loop Detail Page** — View/edit existing loops
12. **Sub-tasks Support** — Nested checklist items
13. **Loop Templates** — Pre-built recipes
14. **Analytics Dashboard** — Completion rates, streaks
15. **Sharing & Collaboration** — Team loops

---

## 🎨 Design Tokens (for consistency)

Create `src/lib/designTokens.ts`:
```typescript
export const colors = {
  loop: {
    daily: { gradient: ['#FFB800', '#FF8C00'], solid: '#FFB800' },
    work: { gradient: ['#00BCD4', '#0097A7'], solid: '#00BCD4' },
    personal: { gradient: ['#F44336', '#D32F2F'], solid: '#F44336' },
  },
  completion: { gradient: ['#4CAF50', '#388E3C'], solid: '#4CAF50' },
  background: 'from-purple-50 to-blue-50',
};

export const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
};

export const animations = {
  fast: 200,    // State changes
  medium: 400,  // Transitions
  slow: 1000,   // Progress rings
};
```

---

## ✅ Testing Checklist

Before deploying each phase:

- [ ] All loops save correctly
- [ ] Favorites work properly
- [ ] Loop creation flow is smooth (< 2 minutes)
- [ ] Reloop button resets only recurring tasks
- [ ] Search finds loops and tasks
- [ ] No console errors or warnings
- [ ] Mobile responsive (test on phone)
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Animations are smooth (60fps)

---

## 📚 Documentation

Files created:
1. ✅ `VISION.md` — Design philosophy & guidelines
2. ✅ `CODEBASE_REVIEW.md` — Alignment analysis
3. ✅ `ACTION_PLAN.md` — This implementation guide

Keep these updated as the project evolves!

---

## 🚢 Ready to Ship?

**Phase 1** (Critical Fixes) → Takes ~2-4 hours
**Phase 2** (Enhanced UX) → Takes ~1-2 days
**Phase 3** (Polish) → Ongoing

After Phase 1, you'll have a **solid MVP** ready for user testing. 🌀

**Let's build some recipes for success!**








