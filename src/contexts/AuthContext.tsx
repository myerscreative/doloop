import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  devModeLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session with timeout
    const getInitialSession = async () => {
      console.log('[Auth] Checking initial session...');

      // Set a safety timeout to ensure loading state completes
      const timeoutId = setTimeout(() => {
        console.warn('[Auth] Session check timed out, continuing without session');
        setLoading(false);
      }, 5000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[Auth] Initial session:', session ? 'Found' : 'None');
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.warn('[Auth] Error getting session:', error);
        // Continue without session on error
        setSession(null);
        setUser(null);
      } finally {
        clearTimeout(timeoutId);
        console.log('[Auth] Loading complete');
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State change:', event, session ? 'User found' : 'No user');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Error signing out:', error);
    }
  };

  // Development mode - auto login with test account
  const devModeLogin = async () => {
    console.log('[Auth] Dev Mode Login - Creating/logging in test account');
    const testEmail = 'dev@dev.com';
    const testPassword = 'dev123';
    
    return { error: { message: 'Account not found. Please sign up first with these credentials:\n\nEmail: dev@dev.com\nPassword: dev123' } };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        devModeLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
