import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get Supabase config - try multiple sources
const supabaseUrl = 
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  Constants.manifest?.extra?.supabaseUrl ||
  Constants.manifest2?.extra?.expoClient?.extra?.supabaseUrl;

const supabaseAnonKey = 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  Constants.manifest?.extra?.supabaseAnonKey ||
  Constants.manifest2?.extra?.expoClient?.extra?.supabaseAnonKey;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing Supabase configuration. Platform: ${Platform.OS}. Please set credentials in app.json "extra" section.`
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-my-custom-header': 'doloop-mobile',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Supabase is always configured now
export const isSupabaseConfigured = true;

// Get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.warn('Error getting user:', error);
    return null;
  }
};

