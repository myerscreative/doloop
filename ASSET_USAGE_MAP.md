# DoLoop Asset Usage Map

This document shows where each brand asset appears in the app and system.

## 🏠 iOS System Level

### App Icon (`assets/icon.png`)
**Where it appears:**
- ✓ Home screen
- ✓ App switcher (multitasking view)
- ✓ Settings → General → iPhone Storage
- ✓ Spotlight search results
- ✓ Notifications (if you implement push notifications)
- ✓ App Store listing

**Current file:** `assets/icon.png`
**Status:** ⚠️ Needs replacement with bee-based icon
**Recommended:** Bee face on gold background (#fbbf24)

### Splash Screen (`assets/splash.png`)
**Where it appears:**
- ✓ App launch (cold start)
- ✓ App returning from background (sometimes)
- ✓ First 1-3 seconds of user experience

**Current file:** `assets/splash.png`
**Status:** ⚠️ Needs replacement with branded splash
**Recommended:** White background with centered full logo

---

## 📱 In-App Usage

### 1. Full Logo (`doloop-logo-full.svg` → `DoLoopLogo` component)

**Used in:**
- ✓ **Onboarding Screen** (`src/screens/OnboardingScreen.tsx`)
  - First onboarding card (welcome)
  - Size: 120px wide
  - Location: Top center

- ✓ **Login Screen** (`src/screens/LoginScreen.tsx`)
  - Top of authentication screen
  - Size: ~140-160px wide
  - Location: Center or top center

**Code usage:**
```typescript
import { DoLoopLogo } from '@/components/native/DoLoopLogo';

<DoLoopLogo size={120} />
```

**Files:**
- Component: `src/components/native/DoLoopLogo.tsx`
- Web: Uses `public/doloop-logo-full.svg` ✅
- Native: Uses `assets/icon.png` (placeholder) ⚠️

---

### 2. Bee Icon (`BeeIcon` component)

**Used in:**
- ✓ **Empty states** (no loops created yet)
  - `src/screens/HomeScreen.tsx` - when user has no loops
  - Size: 80-120px
  - Friendly, inviting visual

- ✓ **Onboarding cards** (potential)
  - As decorative element
  - Reinforces brand personality

- ✓ **Success celebrations** (potential)
  - After loop completion
  - Animated or static

- ✓ **Error states** (potential)
  - Friendly error messages
  - "Oops" moments

**Code usage:**
```typescript
import { BeeIcon } from '@/components/native/BeeIcon';

<BeeIcon size={100} />
```

**Files:**
- Component: `src/components/native/BeeIcon.tsx` ✅
- Native SVG rendering (works everywhere)

---

### 3. Circular Arrow Icon (`doloop-icon.svg`)

**Potential usage:**
- Loop completion animations
- Loading states
- Circular progress indicators
- "Refresh" or "Reset" buttons

**Current status:** Created but not yet integrated
**File:** `public/doloop-icon.svg` ✅

---

## 📊 Usage by Screen

### LoginScreen (`src/screens/LoginScreen.tsx`)
```
┌─────────────────────────┐
│                         │
│     [DoLoopLogo]        │  ← Full logo (doloop-logo-full.svg)
│                         │
│   Welcome to DoLoop     │
│   [Sign in with Apple]  │
│   [Sign in with Google] │
│                         │
└─────────────────────────┘
```

### OnboardingScreen (`src/screens/OnboardingScreen.tsx`)
```
┌─────────────────────────┐
│   [DoLoopLogo]          │  ← Full logo (card 1)
│   Welcome to DoLoop!    │
│                         │
│   [BeeIcon]             │  ← Bee mascot (decorative)
│   Let's get started     │
│                         │
└─────────────────────────┘
```

### HomeScreen - Empty State (`src/screens/HomeScreen.tsx`)
```
┌─────────────────────────┐
│   Header                │
│                         │
│     [BeeIcon]           │  ← Large bee icon
│   No loops yet!         │
│   Create your first     │
│   [Create Loop]         │
│                         │
└─────────────────────────┘
```

### HomeScreen - With Loops
```
┌─────────────────────────┐
│   Header + Avatar       │
│                         │
│   Today's Loops         │
│   ┌───────────────┐     │
│   │ ◉ Morning     │     │  ← Progress rings (not logo)
│   │   Routine     │     │
│   └───────────────┘     │
│   [+] FAB               │
└─────────────────────────┘
```

---

## 🎨 Asset Priorities by User Experience Impact

### Critical (User sees immediately)
1. **App Icon** - First thing user sees on home screen
2. **Splash Screen** - First app experience
3. **Login Logo** - First in-app brand touchpoint

### Important (User sees frequently)
4. **Bee Icon** - Empty states, celebrations
5. **Native Logo PNGs** - Sharper rendering on iOS

### Nice to Have (Future features)
6. **Circular Arrow** - Loading states, animations
7. **Marketing Assets** - App Store screenshots
8. **Widget Icons** - Home screen widgets

---

## 🔍 File Reference Quick Guide

### Source Files (Design/Export from these)
```
public/doloop-logo-full.svg    ← Full logo with bee + text
public/doloop-bee.svg          ← Bee mascot only
public/doloop-icon.svg         ← Circular arrows
```

### App Assets (Expo uses these)
```
assets/icon.png                ← ⚠️ NEEDS UPDATE: App icon (1024×1024)
assets/splash.png              ← ⚠️ NEEDS UPDATE: Splash screen (1284×2778)
```

### Native Assets (Future enhancement)
```
assets/images/doloop-logo@1x.png   ← For native logo rendering
assets/images/doloop-logo@2x.png
assets/images/doloop-logo@3x.png
```

### React Components (Already implemented)
```
src/components/native/DoLoopLogo.tsx   ← ✅ Renders full logo
src/components/native/BeeIcon.tsx      ← ✅ Renders bee mascot
src/components/native/AppleLogo.tsx    ← ✅ For auth button
src/components/native/GoogleLogo.tsx   ← ✅ For auth button
```

---

## 🧪 Testing Each Asset

### Test App Icon
```bash
# After updating assets/icon.png
npx expo prebuild --clean
npx expo run:ios
# Look at home screen - should see bee icon
```

### Test Splash Screen
```bash
# After updating assets/splash.png
npx expo prebuild --clean
npx expo run:ios
# Force quit app, reopen - should see branded splash
```

### Test Logo Component
```bash
# Open app, check:
# 1. Login screen - see full logo?
# 2. Onboarding - see full logo?
# 3. Both look crisp (not pixelated)?
```

### Test Bee Icon
```bash
# Open app with no loops created
# Should see friendly bee on empty state
```

---

## 💡 Design Considerations

### App Icon Design Checklist
- [ ] Simple enough to recognize at 29×29px
- [ ] Works in dark mode (iOS 13+)
- [ ] Stands out among other apps
- [ ] Represents "productivity" + "bee" theme
- [ ] No text (too small to read)
- [ ] Solid background (gold #fbbf24 recommended)
- [ ] Centered with padding

### Splash Screen Design Checklist
- [ ] Matches first screen user sees (reduces jarring transition)
- [ ] Loads fast (< 500KB)
- [ ] Simple design (logo + background)
- [ ] No "loading" text (iOS shows loading automatically)
- [ ] Brand colors prominent
- [ ] Centered composition

---

## 🎯 Next Actions Summary

1. **Create App Icon:**
   - Open `public/doloop-bee.svg` in design tool
   - Place on 1024×1024 canvas with gold background
   - Add 10-15% padding on all sides
   - Export as PNG
   - Save to `assets/icon.png`

2. **Create Splash Screen:**
   - Open `public/doloop-logo-full.svg` in design tool
   - Place on 1284×2778 canvas with white background
   - Center logo at ~30-40% width
   - Export as PNG
   - Save to `assets/splash.png`

3. **Rebuild & Test:**
   ```bash
   npx expo prebuild --clean
   npx expo run:ios
   ```

4. **Submit to TestFlight** 🚀

---

**Pro Tip:** The bee face works great as an app icon because:
- ✓ Instantly recognizable
- ✓ Friendly and approachable
- ✓ Unique (not another generic productivity icon)
- ✓ Scales well to small sizes
- ✓ Memorable

Your brand assets are excellent - just need to get them exported and into the right places! 🐝

