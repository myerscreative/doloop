import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get Supabase config from app.json extra or fallback to env vars
const supabaseUrl = 
  Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  '';

const supabaseAnonKey = 
  Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  '';

// Check if credentials are placeholders or missing
const isValidConfig = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));

if (!isValidConfig) {
  console.warn('⚠️  Missing or invalid Supabase configuration. Running in demo mode.');
  console.warn('   To enable backend features, set valid supabaseUrl and supabaseAnonKey in app.json');
}

// Create a dummy/demo client if credentials are missing
const dummyUrl = 'https://demo.supabase.co';
const dummyKey = 'demo-key-for-local-development';

export const supabase = createClient(
  isValidConfig ? supabaseUrl : dummyUrl, 
  isValidConfig ? supabaseAnonKey : dummyKey,
  {
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
  }
);

// Export flag to check if we're in demo mode
export const isSupabaseConfigured = isValidConfig;

// For auth
export const getCurrentUser = async () => {
  if (!isSupabaseConfigured) {
    return null; // Demo mode - no user
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.warn('Error getting user:', error);
    return null;
  }
};

