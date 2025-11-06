import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get Supabase config from environment variables or app.json extra
// For web builds (Vercel), prioritize process.env
// For native builds, use Constants.expoConfig.extra
const supabaseUrl = Platform.OS === 'web'
  ? (process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl || '')
  : (Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '');

const supabaseAnonKey = Platform.OS === 'web'
  ? (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey || '')
  : (Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '');

// Validate credentials - don't use placeholder values
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const hasValidCredentials =
  supabaseUrl &&
  supabaseAnonKey &&
  isValidUrl(supabaseUrl) &&
  !supabaseUrl.includes('YOUR_SUPABASE_URL') &&
  !supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY');

if (!hasValidCredentials) {
  console.error('❌ Invalid Supabase configuration detected!');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.');
  console.error('For Vercel: Add these in Project Settings > Environment Variables');
  console.error('For local dev: Create a .env.local file with these variables');
}

// Use dummy values if credentials are missing to prevent initialization errors
const finalUrl = hasValidCredentials ? supabaseUrl : 'https://placeholder.supabase.co';
const finalKey = hasValidCredentials ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Enable offline support
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-my-custom-header': 'doloop-mobile',
    },
  },
  // Enable real-time subscriptions
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Export validation status so app can check if Supabase is configured
export const isSupabaseConfigured = hasValidCredentials;

// For auth
export const getCurrentUser = async () => {
  if (!hasValidCredentials) {
    console.warn('Supabase not configured, skipping auth check');
    return null;
  }
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

