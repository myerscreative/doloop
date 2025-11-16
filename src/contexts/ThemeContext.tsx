import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { VibeStyle } from '../types/onboarding';

interface ThemeContextType {
  colorScheme: ColorSchemeName;
  isDark: boolean;
  vibe: VibeStyle;
  setVibe: (vibe: VibeStyle) => Promise<void>;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    primary: string;
    success: string;
    secondary: string;
    accent1: string;
    accent2: string;
    accentYellow: string;
    border: string;
    error: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Vibe-based color schemes
const vibeColors: Record<VibeStyle, { primary: string; accent: string }> = {
  playful: { primary: '#FFB800', accent: '#FF6B6B' }, // Gold + Coral (default/bee theme)
  focus: { primary: '#64748B', accent: '#475569' }, // Slate
  family: { primary: '#FBBF77', accent: '#FB923C' }, // Peach
  pro: { primary: '#6EE7B7', accent: '#059669' }, // Mint
};

const getColorsForVibe = (vibe: VibeStyle, isDark: boolean) => {
  const vibeColor = vibeColors[vibe];
  return {
    background: isDark ? '#1A1A1A' : '#FFFEF7', // Warm off-white
    surface: isDark ? '#2A2A2A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    primary: vibeColor.primary,
    success: '#00E5A2', // Success green (locked brand color)
    secondary: '#FF1E88', // Hot pink (locked brand color)
    accent1: '#2EC4B6', // Turquoise/cyan (locked brand color)
    accent2: '#9B51E0', // Purple (locked brand color)
    accentYellow: '#FFB800', // Brand yellow (locked)
    border: isDark ? '#374151' : '#E5E7EB',
    error: isDark ? '#F87171' : '#EF4444',
  };
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  // Force light mode to show off the vibrant new theme
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>('light');
  const [vibe, setVibeState] = useState<VibeStyle>('playful'); // Default to playful (gold/bee theme)
  const [loading, setLoading] = useState(true);

  // Load user's theme preference from profile
  useEffect(() => {
    const loadThemePreference = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('theme_vibe')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.warn('[Theme] Error loading theme preference:', error);
        } else if (data?.theme_vibe) {
          setVibeState(data.theme_vibe as VibeStyle);
        }
      } catch (error) {
        console.warn('[Theme] Error loading theme preference:', error);
      } finally {
        setLoading(false);
      }
    };

    loadThemePreference();
  }, [user]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Keep light mode even if system changes
      setColorScheme('light');
    });

    return () => subscription.remove();
  }, []);

  // Update vibe preference in database
  const setVibe = async (newVibe: VibeStyle) => {
    setVibeState(newVibe);
    
    if (!user) return;

    try {
      // Upsert user profile with new theme
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          theme_vibe: newVibe,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (error) {
        console.warn('[Theme] Error saving theme preference:', error);
        // Revert on error
        setVibeState(vibe);
      }
    } catch (error) {
      console.warn('[Theme] Error saving theme preference:', error);
      // Revert on error
      setVibeState(vibe);
    }
  };

  const isDark = colorScheme === 'dark';
  const colors = getColorsForVibe(vibe, isDark);

  return (
    <ThemeContext.Provider value={{ colorScheme, isDark, vibe, setVibe, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
