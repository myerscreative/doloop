/**
 * Onboarding Types
 */

export type UserType = 'student' | 'pro' | 'parent';
export type MainUse = 'daily' | 'shared' | 'goals';
export type VibeStyle = 'playful' | 'focus' | 'family' | 'pro';

export interface OnboardingData {
  userType?: UserType;
  mainUse?: MainUse;
  vibe?: VibeStyle;
  completedAt?: string;
}

export interface StarterTask {
  description: string;
  emoji: string;
  completed: boolean;
}

