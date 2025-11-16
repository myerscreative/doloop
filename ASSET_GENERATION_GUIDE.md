# DoLoop Asset Generation Guide

This document outlines all the assets needed for DoLoop and how to generate them.

## Brand Assets Available

### SVG Files (Source Files)

1. **`public/doloop-logo-full.svg`** - Complete logo with bee + "D Loop" text (696.76 × 649.36)
   - Use for: Marketing, web, large displays
   - Colors: Gold (#fdbf40) + Gray (#787878)

2. **`public/doloop-bee.svg`** - Bee mascot only (198.06 × 188.72)
   - Use for: App icons, small displays, avatars
   - Colors: Gold (#fcbf40), Black (#010101), Blue wings (#9ac1d6)

3. **`public/doloop-icon.svg`** - Circular arrows icon
   - Use for: UI elements, buttons, loading states

## Required Assets for iOS/Android

### 1. App Icon (Required)

**iOS Requirements:**
- Multiple sizes needed for different contexts
- Must be PNG format
- No transparency (solid background)
- No rounded corners (iOS handles this)

**Recommended approach:**
1. Export `doloop-bee.svg` on a solid gold (#fbbf24) background
2. Center the bee in a square canvas
3. Add subtle padding (10-15% on each side)
4. Generate the following sizes:

```
Standard sizes (for app.json):
- 1024×1024 (App Store)
- 180×180 (@3x iPhone)
- 120×120 (@2x iPhone)
- 167×167 (@2x iPad Pro)
- 152×152 (@2x iPad)
- 76×76 (@1x iPad)
```

**Using Expo:**
```bash
# Option 1: Use expo-icon generator
npx expo-icon generate icon.png

# Option 2: Manual - Place 1024x1024 PNG in assets/icon.png
# Then run expo prebuild to generate all sizes
```

### 2. Splash Screen (Required)

**iOS Requirements:**
- Shows while app is loading
- Simple, fast-loading design
- Should match app's first screen visually

**Recommended design:**
1. White background (#ffffff)
2. Centered DoLoop full logo
3. Optional: Subtle bee animation or static bee icon below
4. Minimal text: "DoLoop" or nothing

**Required sizes:**
```
Universal splash:
- 2048×2732 (iPad Pro 12.9")
- 1242×2688 (iPhone XS Max)
- 1125×2436 (iPhone X/XS)

Or use single asset:
- 1284×2778 (iPhone 14 Pro Max) - scales to other sizes
```

**Using Expo:**
```json
// In app.json
{
  "splash": {
    "image": "./assets/splash.png",
    "resizeMode": "contain",
    "backgroundColor": "#ffffff"
  }
}
```

### 3. Native Logo Assets (for DoLoopLogo component)

**Current issue:**
The `DoLoopLogo.tsx` component uses a placeholder for native platforms. 

**Required PNG exports:**
```
assets/images/doloop-logo@1x.png (232×217)  // 696.76×649.36 / 3
assets/images/doloop-logo@2x.png (465×433)  // 696.76×649.36 / 1.5
assets/images/doloop-logo@3x.png (697×649)  // Full resolution
```

**Update needed in `src/components/native/DoLoopLogo.tsx`:**
```typescript
// Replace line 40:
source={require('../../../assets/images/doloop-logo.png')}
```

### 4. Optional: Additional Icon Sizes

For future features (notifications, spotlight, settings):
```
40×40 - Notifications (@2x)
60×60 - Notifications (@3x)
58×58 - Spotlight (@2x)
87×87 - Spotlight (@3x)
29×29 - Settings (@1x)
58×58 - Settings (@2x)
87×87 - Settings (@3x)
```

## Asset Generation Workflow

### Method 1: Using Design Software (Figma/Sketch/Illustrator)

1. **Import SVG**
   - Import `public/doloop-bee.svg` or `public/doloop-logo-full.svg`

2. **Prepare App Icon**
   - Create 1024×1024 artboard
   - Add solid background (#fbbf24 or white)
   - Center the bee
   - Add padding (100-150px on each side)
   - Export as PNG

3. **Prepare Splash Screen**
   - Create 1284×2778 artboard
   - Add white background
   - Center the full logo
   - Scale to ~30% of screen width
   - Export as PNG

4. **Export Logo PNGs**
   - Use `doloop-logo-full.svg`
   - Export at 1x, 2x, 3x sizes
   - Save as `doloop-logo@1x.png`, etc.

### Method 2: Using Online Tools

**Icon Generation:**
- [Icon.kitchen](https://icon.kitchen/) - Upload SVG, generates all sizes
- [App Icon Generator](https://www.appicon.co/) - Upload 1024×1024, outputs all
- [MakeAppIcon](https://makeappicon.com/) - Generates complete iOS/Android sets

**Splash Screen:**
- [Ape Tools](https://apetools.webprofusion.com/) - Generates all splash sizes
- Expo's built-in splash generation (from single large PNG)

### Method 3: Using CLI Tools (ImageMagick)

```bash
# Install ImageMagick
brew install imagemagick

# Generate app icon sizes from 1024×1024 source
convert icon-1024.png -resize 180x180 icon-180.png
convert icon-1024.png -resize 120x120 icon-120.png
convert icon-1024.png -resize 167x167 icon-167.png
convert icon-1024.png -resize 152x152 icon-152.png
convert icon-1024.png -resize 76x76 icon-76.png

# Generate logo at different scales
convert doloop-logo-source.png -resize 33% doloop-logo@1x.png
convert doloop-logo-source.png -resize 66% doloop-logo@2x.png
cp doloop-logo-source.png doloop-logo@3x.png
```

## Current Asset Status

### ✅ Complete
- `doloop-logo-full.svg` - Source logo with bee + text
- `doloop-bee.svg` - Source bee mascot
- `doloop-icon.svg` - Circular arrows
- `BeeIcon.tsx` - Native React component for bee

### ⚠️ Needs Update
- `assets/icon.png` - Replace with proper bee-based app icon
- `assets/splash.png` - Replace with branded splash screen
- Missing: `assets/images/doloop-logo@*.png` - For native logo component

## Action Items

### Priority 1: App Icon
1. Export `doloop-bee.svg` on gold background at 1024×1024
2. Replace `assets/icon.png`
3. Run `npx expo prebuild` to regenerate iOS assets

### Priority 2: Splash Screen
1. Create 1284×2778 splash with centered full logo
2. Replace `assets/splash.png`
3. Test on iOS simulator

### Priority 3: Native Logo Assets
1. Export `doloop-logo-full.svg` at 3 sizes
2. Place in `assets/images/`
3. Update `DoLoopLogo.tsx` import path
4. Test on iOS device

## Testing Assets

### Check App Icon
```bash
# After generating assets
npx expo prebuild --clean
npx expo run:ios
# Check home screen icon on simulator/device
```

### Check Splash Screen
```bash
# Kill app completely, cold start
# Splash should show while loading
# Should transition smoothly to first screen
```

### Check Logo Component
```bash
# Navigate to screens using DoLoopLogo
# Verify crisp rendering at different sizes
# Test on @1x, @2x, @3x devices
```

## Design Guidelines

### App Icon Dos
✅ Simple, recognizable bee silhouette
✅ High contrast
✅ Solid background (no transparency)
✅ Works at small sizes (29×29)
✅ Distinctive from other apps
✅ Matches brand (gold theme)

### App Icon Don'ts
❌ No text or small details
❌ No gradients (they don't scale well)
❌ No thin lines (disappear at small sizes)
❌ No transparency
❌ No rounded corners (iOS adds these)
❌ Don't copy other app styles

### Splash Screen Dos
✅ Fast loading (under 500KB)
✅ Matches first screen visually
✅ Simple, clean design
✅ Centered logo
✅ Brand colors

### Splash Screen Don'ts
❌ No animations (use static image)
❌ No text that needs localization
❌ Don't make users wait (keep minimal)
❌ No busy backgrounds
❌ Don't differ drastically from app UI

## Useful Resources

- [iOS Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [iOS Human Interface Guidelines - Launch Screens](https://developer.apple.com/design/human-interface-guidelines/launch-screen)
- [Expo Icons Documentation](https://docs.expo.dev/guides/app-icons/)
- [Expo Splash Screen Documentation](https://docs.expo.dev/guides/splash-screens/)

## Questions?

If generating these assets is challenging, consider:
1. Hiring a designer on Fiverr/Upwork for $20-50
2. Using automated tools (Icon.kitchen is excellent)
3. Using Figma with templates (many free iOS icon templates)

The most important is getting the 1024×1024 app icon right. Everything else can be auto-generated from that.


