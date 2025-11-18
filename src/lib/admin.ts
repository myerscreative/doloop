/**
 * Admin Utilities
 * Helper functions for admin operations
 */

import { supabase } from './supabase';
import { LoopTemplate, TemplateCreator, TemplateTask } from '../types/loop';

/**
 * Check if the current user is an admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data?.is_admin || false;
  } catch (error) {
    console.error('Error in checkIsAdmin:', error);
    return false;
  }
}

/**
 * Track an affiliate link click
 */
export async function trackAffiliateClick(
  templateId: string,
  affiliateLink: string
): Promise<void> {
  try {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const referrer = typeof document !== 'undefined' ? document.referrer : '';

    // Call the database function to track the click
    const { error } = await supabase.rpc('track_affiliate_click', {
      p_template_id: templateId,
      p_user_agent: userAgent,
      p_referrer: referrer,
    });

    if (error) {
      console.error('Error tracking affiliate click:', error);
    }

    // Open the affiliate link
    if (typeof window !== 'undefined') {
      window.open(affiliateLink, '_blank');
    }
  } catch (error) {
    console.error('Error in trackAffiliateClick:', error);
  }
}

/**
 * Admin Analytics Types
 */
export interface DashboardStats {
  total_users: number;
  new_users_30d: number;
  total_loops: number;
  total_templates: number;
  total_affiliate_clicks: number;
  total_conversions: number;
  total_revenue: number;
}

export interface TemplatePerformance {
  id: string;
  title: string;
  creator_id: string;
  creator_name: string;
  category: string;
  popularity_score: number;
  average_rating: number;
  review_count: number;
  total_uses: number;
  affiliate_clicks: number;
  affiliate_conversions: number;
  affiliate_revenue: number;
  created_at: string;
}

export interface UserSummary {
  id: string;
  email: string;
  created_at: string;
  theme_vibe: string;
  is_admin: boolean;
  loop_count: number;
  task_count: number;
  templates_used: number;
  last_activity: string | null;
}

/**
 * Fetch admin dashboard statistics
 */
export async function getAdminDashboardStats(): Promise<DashboardStats | null> {
  try {
    const { data, error } = await supabase
      .from('admin_dashboard_stats')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching dashboard stats:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getAdminDashboardStats:', error);
    return null;
  }
}

/**
 * Fetch template performance metrics
 */
export async function getTemplatePerformance(): Promise<TemplatePerformance[]> {
  try {
    const { data, error } = await supabase
      .from('admin_template_performance')
      .select('*');

    if (error) {
      console.error('Error fetching template performance:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTemplatePerformance:', error);
    return [];
  }
}

/**
 * Fetch user summary for admin user management
 */
export async function getUserSummary(): Promise<UserSummary[]> {
  try {
    const { data, error } = await supabase
      .from('admin_user_summary')
      .select('*');

    if (error) {
      console.error('Error fetching user summary:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserSummary:', error);
    return [];
  }
}

/**
 * TEMPLATE CREATOR MANAGEMENT
 */

export async function createTemplateCreator(
  creator: Omit<TemplateCreator, 'id' | 'created_at' | 'updated_at'>
): Promise<TemplateCreator | null> {
  try {
    const { data, error } = await supabase
      .from('template_creators')
      .insert([creator])
      .select()
      .single();

    if (error) {
      console.error('Error creating template creator:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createTemplateCreator:', error);
    throw error;
  }
}

export async function updateTemplateCreator(
  id: string,
  updates: Partial<Omit<TemplateCreator, 'id' | 'created_at' | 'updated_at'>>
): Promise<TemplateCreator | null> {
  try {
    const { data, error } = await supabase
      .from('template_creators')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template creator:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateTemplateCreator:', error);
    throw error;
  }
}

export async function deleteTemplateCreator(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('template_creators')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template creator:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteTemplateCreator:', error);
    throw error;
  }
}

export async function getAllTemplateCreators(): Promise<TemplateCreator[]> {
  try {
    const { data, error } = await supabase
      .from('template_creators')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching template creators:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllTemplateCreators:', error);
    return [];
  }
}

/**
 * LOOP TEMPLATE MANAGEMENT
 */

export interface CreateLoopTemplateInput {
  creator_id: string;
  title: string;
  description: string;
  book_course_title: string;
  affiliate_link?: string;
  color?: string;
  category?: string;
  is_featured?: boolean;
}

export async function createLoopTemplate(
  template: CreateLoopTemplateInput,
  tasks: Array<{ description: string; is_recurring?: boolean; is_one_time?: boolean; display_order: number }>
): Promise<LoopTemplate | null> {
  try {
    // Insert the template
    const { data: templateData, error: templateError } = await supabase
      .from('loop_templates')
      .insert([{
        ...template,
        color: template.color || '#667eea',
        category: template.category || 'personal',
        is_featured: template.is_featured || false,
      }])
      .select()
      .single();

    if (templateError) {
      console.error('Error creating loop template:', templateError);
      throw templateError;
    }

    // Insert the tasks
    if (tasks.length > 0) {
      const tasksToInsert = tasks.map(task => ({
        template_id: templateData.id,
        description: task.description,
        is_recurring: task.is_recurring ?? true,
        is_one_time: task.is_one_time ?? false,
        display_order: task.display_order,
      }));

      const { error: tasksError } = await supabase
        .from('template_tasks')
        .insert(tasksToInsert);

      if (tasksError) {
        console.error('Error creating template tasks:', tasksError);
        // Rollback: delete the template
        await supabase.from('loop_templates').delete().eq('id', templateData.id);
        throw tasksError;
      }
    }

    return templateData;
  } catch (error) {
    console.error('Error in createLoopTemplate:', error);
    throw error;
  }
}

export async function updateLoopTemplate(
  id: string,
  updates: Partial<Omit<LoopTemplate, 'id' | 'created_at' | 'updated_at' | 'popularity_score' | 'average_rating' | 'review_count'>>
): Promise<LoopTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('loop_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating loop template:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateLoopTemplate:', error);
    throw error;
  }
}

export async function deleteLoopTemplate(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('loop_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting loop template:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteLoopTemplate:', error);
    throw error;
  }
}

/**
 * TEMPLATE TASK MANAGEMENT
 */

export async function createTemplateTask(
  task: Omit<TemplateTask, 'id' | 'created_at'>
): Promise<TemplateTask | null> {
  try {
    const { data, error } = await supabase
      .from('template_tasks')
      .insert([task])
      .select()
      .single();

    if (error) {
      console.error('Error creating template task:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createTemplateTask:', error);
    throw error;
  }
}

export async function updateTemplateTask(
  id: string,
  updates: Partial<Omit<TemplateTask, 'id' | 'created_at'>>
): Promise<TemplateTask | null> {
  try {
    const { data, error } = await supabase
      .from('template_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template task:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateTemplateTask:', error);
    throw error;
  }
}

export async function deleteTemplateTask(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('template_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template task:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteTemplateTask:', error);
    throw error;
  }
}

export async function getTemplateTasks(templateId: string): Promise<TemplateTask[]> {
  try {
    const { data, error } = await supabase
      .from('template_tasks')
      .select('*')
      .eq('template_id', templateId)
      .order('display_order');

    if (error) {
      console.error('Error fetching template tasks:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTemplateTasks:', error);
    return [];
  }
}

/**
 * Mark an affiliate conversion (admin only)
 */
export async function markAffiliateConversion(
  clickId: string,
  conversionAmount?: number
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('mark_affiliate_conversion', {
      p_click_id: clickId,
      p_conversion_amount: conversionAmount,
    });

    if (error) {
      console.error('Error marking affiliate conversion:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in markAffiliateConversion:', error);
    throw error;
  }
}

/**
 * Toggle admin status for a user (super admin only)
 */
export async function toggleUserAdminStatus(userId: string, isAdmin: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    if (error) {
      console.error('Error toggling admin status:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in toggleUserAdminStatus:', error);
    throw error;
  }
}
