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
  is_recurring: boolean;
  assigned_user_id?: string;
  status: TaskStatus;
  is_one_time: boolean;
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

export interface LoopMember {
  loop_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskTag {
  task_id: string;
  tag_id: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_type: string; // mime type
  file_size: number; // bytes
  uploaded_by: string; // user_id
  created_at: string;
}

export interface Subtask {
  id: string;
  parent_task_id: string;
  description: string;
  status: TaskStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskReminder {
  id: string;
  task_id: string;
  user_id: string;
  reminder_at: string; // ISO date string
  is_sent: boolean;
  created_at: string;
}

/**
 * UI-specific types and helpers
 */

export type LoopType = 'personal' | 'work' | 'daily' | 'shared';

export interface TaskWithDetails extends Task {
  subtasks?: Subtask[];
  attachments?: Attachment[];
  tag_details?: Tag[]; // Populated tag objects
  reminder?: TaskReminder;
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

// Folder colors
export const FOLDER_COLORS: Record<LoopType, string> = {
  personal: '#FE356C',
  work: '#0CB6CC',
  daily: '#FEC041',
  shared: '#7952B4',
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

