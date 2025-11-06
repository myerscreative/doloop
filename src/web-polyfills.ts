/**
 * Web-specific polyfills and fallbacks for native modules
 * This ensures the app runs smoothly on web without breaking mobile
 */
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Polyfill for any web-specific issues
  // Most Expo modules handle web gracefully, but we can add fallbacks here if needed
  
  // Ensure global navigator exists for web
  if (typeof navigator === 'undefined') {
    (global as any).navigator = {};
  }
  
  // Add any other web-specific polyfills here as needed
}

