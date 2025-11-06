import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Loop {
  id: string;
  name: string;
  color: string;
  reset_rule: string;
  next_reset_at: string;
}

interface LoopSelectionModalProps {
  visible: boolean;
  loops: Loop[];
  folderName: string;
  onSelect: (loopId: string) => void;
  onClose: () => void;
}

export const LoopSelectionModal: React.FC<LoopSelectionModalProps> = ({
  visible,
  loops,
  folderName,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();

  const formatNextReset = (nextResetAt: string) => {
    const date = new Date(nextResetAt);
    if (isNaN(date.getTime())) return 'Not scheduled';
    
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 1) {
      return `${diffDays} days`;
    } else if (diffHours > 1) {
      return `${diffHours} hours`;
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Select a Loop
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {folderName} • {loops.length} {loops.length === 1 ? 'loop' : 'loops'}
            </Text>
          </View>

          {/* Loop List */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {loops.map((loop) => (
              <TouchableOpacity
                key={loop.id}
                style={[styles.loopCard, { backgroundColor: colors.background }]}
                onPress={() => onSelect(loop.id)}
                activeOpacity={0.7}
              >
                {/* Color indicator */}
                <View
                  style={[styles.colorIndicator, { backgroundColor: loop.color }]}
                />

                {/* Loop info */}
                <View style={styles.loopInfo}>
                  <Text style={[styles.loopName, { color: colors.text }]} numberOfLines={1}>
                    {loop.name}
                  </Text>
                  <Text style={[styles.loopDetails, { color: colors.textSecondary }]}>
                    Resets {loop.reset_rule} • Next: {formatNextReset(loop.next_reset_at)}
                  </Text>
                </View>

                {/* Chevron */}
                <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Cancel button */}
          <TouchableOpacity
            style={[styles.cancelButton, { borderTopColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  scrollView: {
    maxHeight: 400,
    paddingHorizontal: 12,
  },
  loopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 8,
  },
  colorIndicator: {
    width: 4,
    height: 44,
    borderRadius: 2,
    marginRight: 16,
  },
  loopInfo: {
    flex: 1,
  },
  loopName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  loopDetails: {
    fontSize: 13,
  },
  chevron: {
    fontSize: 28,
    fontWeight: '300',
    marginLeft: 8,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

