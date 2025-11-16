import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TaskWithDetails } from '../../types/loop';
import { useTheme } from '../../contexts/ThemeContext';
import { PriorityBadge } from './PriorityBadge';
import { TaskTag } from './TaskTag';

interface EnhancedTaskCardProps {
  task: TaskWithDetails;
  onPress: () => void;
  onToggle: () => void;
}

export const EnhancedTaskCard: React.FC<EnhancedTaskCardProps> = ({
  task,
  onPress,
  onToggle,
}) => {
  const { colors } = useTheme();

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays}d`;
    return date.toLocaleDateString();
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks?.filter(st => st.status === 'done').length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        {/* Checkbox */}
        <TouchableOpacity
          onPress={onToggle}
          style={[
            styles.checkbox,
            {
              borderColor: task.status === 'done' ? colors.primary : colors.border,
              backgroundColor: task.status === 'done' ? colors.primary : 'transparent',
            },
          ]}
        >
          {task.status === 'done' && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </TouchableOpacity>

        {/* Task Content */}
        <View style={styles.content}>
          {/* Title and Priority Row */}
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.description,
                {
                  color: colors.text,
                  textDecorationLine: task.status === 'done' ? 'line-through' : 'none',
                  opacity: task.status === 'done' ? 0.6 : 1,
                },
              ]}
              numberOfLines={2}
            >
              {task.description}
            </Text>
            {task.priority !== 'none' && (
              <View style={styles.priorityContainer}>
                <PriorityBadge priority={task.priority} size="small" />
              </View>
            )}
          </View>

          {/* Tags */}
          {task.tag_details && task.tag_details.length > 0 && (
            <View style={styles.tagsRow}>
              {task.tag_details.map((tag) => (
                <TaskTag key={tag.id} tag={tag} size="small" />
              ))}
            </View>
          )}

          {/* Metadata Row */}
          <View style={styles.metadataRow}>
            {/* Due Date */}
            {task.due_date && (
              <View style={styles.metadataItem}>
                <Text
                  style={[
                    styles.metadataText,
                    {
                      color: isOverdue ? '#EF4444' : colors.textSecondary,
                    },
                  ]}
                >
                  📅 {formatDueDate(task.due_date)}
                </Text>
              </View>
            )}

            {/* Time Estimate */}
            {task.time_estimate_minutes && (
              <View style={styles.metadataItem}>
                <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                  ⏱️ {task.time_estimate_minutes}m
                </Text>
              </View>
            )}

            {/* Subtasks Progress */}
            {hasSubtasks && (
              <View style={styles.metadataItem}>
                <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                  ☑️ {completedSubtasks}/{totalSubtasks}
                </Text>
              </View>
            )}

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <View style={styles.metadataItem}>
                <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                  📎 {task.attachments.length}
                </Text>
              </View>
            )}

            {/* Reminder */}
            {task.reminder_at && !task.reminder?.is_sent && (
              <View style={styles.metadataItem}>
                <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                  🔔
                </Text>
              </View>
            )}
          </View>

          {/* Notes Preview */}
          {task.notes && (
            <Text
              style={[styles.notes, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {task.notes}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  description: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  priorityContainer: {
    marginLeft: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metadataItem: {
    marginRight: 12,
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 13,
  },
  notes: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
