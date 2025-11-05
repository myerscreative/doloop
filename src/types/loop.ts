/**
 * Loop Types - Core data structures for DoLoop
 */

export type LoopType = 'daily' | 'work' | 'personal';

export type LoopStatus = 'active' | 'paused' | 'archived';

export interface Loop {
  id: string;
  title: string;
  description?: string;
  type: LoopType;
  status: LoopStatus;
  
  // Progress tracking
  totalTasks: number;
  completedTasks: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastCompletedAt?: Date;
  
  // Momentum tracking
  currentStreak: number;
  longestStreak: number;
  completionHistory: CompletionRecord[];
  
  // Favorites
  isFavorite?: boolean;
  
  // Color for the loop icon
  color?: string;
  
  // Loop items/steps
  items?: LoopItem[];
}

export interface LoopItem {
  id: string;
  title: string;
  completed: boolean;
  order?: number;
  // Options
  assignedTo?: string; // User ID or name
  isRecurring?: boolean; // true = repeating item, false = one-time
  dueDate?: string; // ISO date string
  notes?: string;
  imageUrl?: string;
  tags?: string[]; // Array of tag labels
  attachments?: Attachment[]; // Attached files
  // Sub-tasks
  subTasks?: SubTask[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  order?: number;
}

export interface CompletionRecord {
  date: string; // ISO date string (YYYY-MM-DD)
  completed: number;
  total: number;
}

export interface Task {
  id: string;
  loopId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * UI-specific types
 */

export interface LoopCardProps {
  loop: Loop;
  onComplete?: (loopId: string, taskId: string) => void;
  onClick?: (loopId: string) => void;
}

export interface MomentumData {
  date: string;
  intensity: number; // 0-1 scale
  loopsCompleted: number;
}

/**
 * Library Folder - For organizing loops in the library
 */
export interface LibraryFolder {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault?: boolean; // For built-in folders like Favorites
  filterType?: LoopType | 'all' | 'shared' | 'favorites'; // How to filter loops
}

/**
 * Helper type guards
 */

export function isValidLoopType(type: string): type is LoopType {
  return ['daily', 'work', 'personal'].includes(type);
}

export function isValidLoopStatus(status: string): status is LoopStatus {
  return ['active', 'paused', 'archived'].includes(status);
}

/**
 * Color mappings for loop types
 */

export const LOOP_TYPE_COLORS: Record<LoopType, { gradient: [string, string]; solid: string }> = {
  daily: {
    gradient: ['#FFB800', '#FF8C00'],
    solid: '#FFB800',
  },
  work: {
    gradient: ['#00BCD4', '#0097A7'],
    solid: '#00BCD4',
  },
  personal: {
    gradient: ['#F44336', '#D32F2F'],
    solid: '#F44336',
  },
};

export const COMPLETION_COLOR = {
  gradient: ['#4CAF50', '#388E3C'],
  solid: '#4CAF50',
};

/**
 * Default colors for Loop Library cards
 */
export const LOOP_LIBRARY_COLORS = [
  '#FEC041', // Orange-yellow (Favorites)
  '#FE356C', // Pink (Personal)
  '#0CB6CC', // Cyan (Work)
  '#7952B4', // Purple (Shared)
] as const;

