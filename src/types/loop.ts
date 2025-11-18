/**
 * Supabase Database Types - Core data structures for DoLoop
 */

export type ResetRule = 'manual' | 'daily' | 'weekly';
export type TaskStatus = 'pending' | 'done';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

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
  notes?: string;
  completed: boolean;
  completed_at?: string;
  is_one_time: boolean;
  order_index?: number;
  created_at: string;
  updated_at: string;

  // Extended properties
  priority: TaskPriority;
  due_date?: string; // ISO date string
  notes?: string; // Additional details/description
  tags?: string[]; // Array of tag IDs
  time_estimate_minutes?: number; // Estimated time in minutes
  reminder_at?: string; // ISO date string for reminder
  completed_at?: string; // When task was completed
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

export interface TaskWithDetails extends Task {
  // Extended properties are now part of the base Task interface
}

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

// Folder colors - Brand Kit
export const FOLDER_COLORS: Record<LoopType, string> = {
  personal: '#FF1E88', // Hot pink
  work: '#2EC4B6',     // Turquoise
  daily: '#FFB800',    // Brand primary (golden yellow)
  shared: '#9B51E0',   // Purple
};

// Priority colors
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  none: '#9CA3AF',
  low: '#3B82F6',
  medium: '#F59E0B',
  high: '#EF4444',
  urgent: '#DC2626',
};

// Priority labels
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

