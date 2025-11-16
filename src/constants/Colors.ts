/**
 * DoLoop Brand Colors
 * Locked Brand Kit - Primary #FFB800, Success #00E5A2
 */

export const Colors = {
  light: {
    background: '#FFFFFF',
    backgroundSecondary: '#FFFEF7',
    surface: '#F8F9FA',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    primary: '#FFB800', // Brand golden yellow
    success: '#00E5A2', // Success green
    error: '#EF4444',
    border: '#E5E7EB',
    
    // Vibe colors
    playful: '#FF6B6B', // Coral
    focus: '#64748B', // Slate
    family: '#FBBF77', // Peach
    pro: '#6EE7B7', // Mint
  },
  dark: {
    background: '#0A0A0A',
    backgroundSecondary: '#1A1A1A',
    surface: '#2A2A2A',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    primary: '#FFB800',
    success: '#00E5A2',
    error: '#F87171',
    border: '#374151',
    
    // Vibe colors (slightly adjusted for dark mode)
    playful: '#FF8080',
    focus: '#94A3B8',
    family: '#FCD199',
    pro: '#86EFAC',
  },
};

export type ColorTheme = keyof typeof Colors;

