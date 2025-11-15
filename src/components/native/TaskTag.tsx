import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Tag } from '../../types/loop';

interface TaskTagProps {
  tag: Tag;
  onPress?: () => void;
  onRemove?: () => void;
  size?: 'small' | 'medium';
}

export const TaskTag: React.FC<TaskTagProps> = ({
  tag,
  onPress,
  onRemove,
  size = 'medium',
}) => {
  const fontSize = size === 'small' ? 11 : 13;
  const paddingVertical = size === 'small' ? 3 : 5;
  const paddingHorizontal = size === 'small' ? 8 : 10;

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      style={[
        styles.tag,
        {
          backgroundColor: `${tag.color}20`,
          borderColor: tag.color,
          paddingVertical,
          paddingHorizontal: onRemove ? paddingHorizontal - 2 : paddingHorizontal,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: tag.color,
            fontSize,
          },
        ]}
      >
        {tag.name}
      </Text>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.removeButton}
        >
          <Text style={[styles.removeText, { color: tag.color }]}>×</Text>
        </TouchableOpacity>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
  text: {
    fontWeight: '500',
  },
  removeButton: {
    marginLeft: 4,
  },
  removeText: {
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
});
