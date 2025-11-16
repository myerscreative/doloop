import { supabase } from './supabase';
import { Tag, TaskTag, Subtask, Attachment, TaskReminder, TaskWithDetails } from '../types/loop';

/**
 * Tag Management
 */

export async function createTag(userId: string, name: string, color: string): Promise<Tag | null> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: userId,
        name: name.trim(),
        color,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating tag:', error);
    return null;
  }
}

export async function getUserTags(userId: string): Promise<Tag[]> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

export async function addTagToTask(taskId: string, tagId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('task_tags')
      .insert({
        task_id: taskId,
        tag_id: tagId,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding tag to task:', error);
    return false;
  }
}

export async function removeTagFromTask(taskId: string, tagId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('task_tags')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', tagId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing tag from task:', error);
    return false;
  }
}

export async function getTaskTags(taskId: string): Promise<Tag[]> {
  try {
    const { data, error } = await supabase
      .from('task_tags')
      .select(`
        tag_id,
        tags (*)
      `)
      .eq('task_id', taskId);

    if (error) throw error;
    return data?.map((item: any) => item.tags).filter(Boolean) || [];
  } catch (error) {
    console.error('Error fetching task tags:', error);
    return [];
  }
}

/**
 * Subtask Management
 */

export async function createSubtask(
  parentTaskId: string,
  description: string,
  sortOrder: number = 0
): Promise<Subtask | null> {
  try {
    const { data, error } = await supabase
      .from('subtasks')
      .insert({
        parent_task_id: parentTaskId,
        description: description.trim(),
        status: 'pending',
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating subtask:', error);
    return null;
  }
}

export async function toggleSubtask(subtaskId: string, currentStatus: 'pending' | 'done'): Promise<boolean> {
  try {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    const { error } = await supabase
      .from('subtasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', subtaskId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error toggling subtask:', error);
    return false;
  }
}

export async function deleteSubtask(subtaskId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', subtaskId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting subtask:', error);
    return false;
  }
}

export async function getTaskSubtasks(taskId: string): Promise<Subtask[]> {
  try {
    const { data, error } = await supabase
      .from('subtasks')
      .select('*')
      .eq('parent_task_id', taskId)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return [];
  }
}

/**
 * Attachment Management
 */

export async function uploadAttachment(
  taskId: string,
  file: { name: string; type: string; size: number; uri: string },
  userId: string
): Promise<Attachment | null> {
  try {
    // Note: You'll need to implement actual file upload to Supabase Storage
    // This is a placeholder structure
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `attachments/${taskId}/${fileName}`;

    // TODO: Upload file to Supabase Storage
    // const { data: uploadData, error: uploadError } = await supabase.storage
    //   .from('task-attachments')
    //   .upload(filePath, file);

    // For now, just create the database record
    const { data, error } = await supabase
      .from('attachments')
      .insert({
        task_id: taskId,
        file_name: file.name,
        file_url: filePath, // Would be the public URL from storage
        file_type: file.type,
        file_size: file.size,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return null;
  }
}

export async function deleteAttachment(attachmentId: string): Promise<boolean> {
  try {
    // TODO: Also delete from Supabase Storage

    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return false;
  }
}

export async function getTaskAttachments(taskId: string): Promise<Attachment[]> {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return [];
  }
}

/**
 * Reminder Management
 */

export async function createReminder(
  taskId: string,
  userId: string,
  reminderAt: string
): Promise<TaskReminder | null> {
  try {
    const { data, error } = await supabase
      .from('task_reminders')
      .insert({
        task_id: taskId,
        user_id: userId,
        reminder_at: reminderAt,
        is_sent: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating reminder:', error);
    return null;
  }
}

export async function deleteReminder(reminderId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('task_reminders')
      .delete()
      .eq('id', reminderId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return false;
  }
}

export async function getTaskReminder(taskId: string): Promise<TaskReminder | null> {
  try {
    const { data, error } = await supabase
      .from('task_reminders')
      .select('*')
      .eq('task_id', taskId)
      .eq('is_sent', false)
      .order('reminder_at', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error fetching reminder:', error);
    return null;
  }
}

/**
 * Load task with all related data
 */

export async function getTaskWithDetails(taskId: string): Promise<TaskWithDetails | null> {
  try {
    // Fetch main task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError) throw taskError;

    // Fetch related data in parallel
    const [tags, subtasks, attachments, reminder] = await Promise.all([
      getTaskTags(taskId),
      getTaskSubtasks(taskId),
      getTaskAttachments(taskId),
      getTaskReminder(taskId),
    ]);

    return {
      ...task,
      tag_details: tags,
      subtasks,
      attachments,
      reminder: reminder || undefined,
    };
  } catch (error) {
    console.error('Error fetching task with details:', error);
    return null;
  }
}

/**
 * Update task with extended properties
 */

export async function updateTaskExtended(
  taskId: string,
  updates: Partial<TaskWithDetails>
): Promise<boolean> {
  try {
    // Separate tags from other updates
    const { tags: tagIds, tag_details, subtasks, attachments, reminder, ...taskUpdates } = updates;

    // Update main task fields
    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        ...taskUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (taskError) throw taskError;

    // Handle tags if provided
    if (tagIds !== undefined) {
      // Remove all existing tags
      await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', taskId);

      // Add new tags
      if (tagIds.length > 0) {
        const tagInserts = tagIds.map(tagId => ({
          task_id: taskId,
          tag_id: tagId,
        }));
        await supabase.from('task_tags').insert(tagInserts);
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating task:', error);
    return false;
  }
}
