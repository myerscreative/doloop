/**
 * Supabase Database Types - Core data structures for DoLoop
 */

export type ResetRule = 'manual' | 'daily' | 'weekly';
export type TaskStatus = 'pending' | 'done';

// Database Tables
export interface User {
  id: string;
  email: string;
  // Add other user fields as needed
}

export interface Loop {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  reset_rule: ResetRule;
  next_reset_at: string; // ISO date string
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  loop_id: string;
  description: string;
  is_recurring: boolean;
  assigned_user_id?: string;
  status: TaskStatus;
  is_one_time: boolean;
  created_at: string;
  updated_at: string;
}

export interface ArchivedTask {
  id: string;
  original_task_id: string;
  loop_id: string;
  description: string;
  completed_at: string;
  archived_at: string;
}

export interface UserStreak {
  id: string;
  user_id: string;
  loop_id: string;
  current_streak: number;
  updated_at: string;
}

export interface LoopMember {
  loop_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

/**
 * Loop Library / Template Types
 */

export interface TemplateCreator {
  id: string;
  name: string;
  bio: string;
  title?: string; // e.g., "Business Coach", "Author", "CEO"
  photo_url?: string;
  website_url?: string;
  created_at: string;
  updated_at: string;
}

export interface LoopTemplate {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  book_course_title: string; // The book/course/training that inspired this loop
  affiliate_link?: string;
  color: string;
  category: LoopType;
  is_featured: boolean;
  popularity_score: number;
  average_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateTask {
  id: string;
  template_id: string;
  description: string;
  is_recurring: boolean;
  is_one_time: boolean;
  display_order: number;
  created_at: string;
}

export interface UserTemplateUsage {
  id: string;
  user_id: string;
  template_id: string;
  loop_id?: string;
  added_at: string;
}

export interface TemplateReview {
  id: string;
  template_id: string;
  user_id: string;
  rating: number; // 1-5
  review_text?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateFavorite {
  id: string;
  template_id: string;
  user_id: string;
  created_at: string;
}

export interface LoopTemplateWithDetails extends LoopTemplate {
  creator: TemplateCreator;
  tasks: TemplateTask[];
  taskCount: number;
  userRating?: number;
  isFavorite?: boolean;
  isAdded?: boolean;
}

/**
 * UI-specific types and helpers
 */

export type LoopType = 'personal' | 'work' | 'daily' | 'shared';

export interface LoopWithTasks extends Loop {
  tasks: Task[];
  completedCount: number;
  totalCount: number;
  streak: number;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  count: number;
}

// Folder icons mapping
export const FOLDER_ICONS: Record<LoopType, string> = {
  personal: '🏡',
  work: '💼',
  daily: '☀️',
  shared: '👥',
};

// Folder colors
export const FOLDER_COLORS: Record<LoopType, string> = {
  personal: '#FE356C',
  work: '#0CB6CC',
  daily: '#FEC041',
  shared: '#7952B4',
};

