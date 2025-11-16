import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TaskPriority, PRIORITY_COLORS, PRIORITY_LABELS } from '../../types/loop';

interface PriorityBadgeProps {
  priority: TaskPriority;
  size?: 'small' | 'medium' | 'large';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'medium'
}) => {
  if (priority === 'none') return null;

  const fontSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;
  const paddingVertical = size === 'small' ? 2 : size === 'medium' ? 4 : 6;
  const paddingHorizontal = size === 'small' ? 6 : size === 'medium' ? 8 : 10;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${PRIORITY_COLORS[priority]}20`,
          borderColor: PRIORITY_COLORS[priority],
          paddingVertical,
          paddingHorizontal,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: PRIORITY_COLORS[priority],
            fontSize,
          },
        ]}
      >
        {PRIORITY_LABELS[priority]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
