import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface Task {
  id: string;
  description: string;
  notes?: string;
  is_one_time: boolean;
}

interface FABProps {
  onAddTask: (description: string, isOneTime: boolean, notes?: string) => Promise<void>;
  onEditTask?: (taskId: string, description: string, isOneTime: boolean, notes?: string) => Promise<void>;
  centered?: boolean;
  modalVisible?: boolean;
  setModalVisible?: (visible: boolean) => void;
  hideButton?: boolean;
  editingTask?: Task | null;
}

export const FAB: React.FC<FABProps> = ({ 
  onAddTask,
  onEditTask,
  centered = false,
  modalVisible: externalModalVisible,
  setModalVisible: externalSetModalVisible,
  hideButton = false,
  editingTask = null,
}) => {
  const { colors } = useTheme();
  const [internalModalVisible, setInternalModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isOneTime, setIsOneTime] = useState(false);
  const [loading, setLoading] = useState(false);

  // Use external control if provided, otherwise use internal state
  const modalVisible = externalModalVisible ?? internalModalVisible;
  const setModalVisible = externalSetModalVisible ?? setInternalModalVisible;

  // Pre-fill form when editing
  React.useEffect(() => {
    if (editingTask) {
      setDescription(editingTask.description);
      setNotes(editingTask.notes || '');
      setIsOneTime(editingTask.is_one_time);
    } else {
      setDescription('');
      setNotes('');
      setIsOneTime(false);
    }
  }, [editingTask]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a task description');
      return;
    }

    setLoading(true);
    try {
      if (editingTask && onEditTask) {
        await onEditTask(editingTask.id, description.trim(), isOneTime, notes.trim() || undefined);
      } else {
        await onAddTask(description.trim(), isOneTime, notes.trim() || undefined);
      }
      setModalVisible(false);
      setDescription('');
      setNotes('');
      setIsOneTime(false);
    } catch (error) {
      Alert.alert('Error', editingTask ? 'Failed to update task' : 'Failed to add task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!hideButton && (
        <TouchableOpacity
          style={centered ? {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          } : {
            position: 'absolute',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
          }}
          onPress={() => setModalVisible(true)}
        >
          <Text style={{ fontSize: centered ? 32 : 24, color: 'white', fontWeight: 'bold' }}>+</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              padding: 20,
            }}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: colors.text,
                  marginBottom: 16,
                }}
              >
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </Text>

              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: colors.text,
                  marginBottom: 12,
                }}
                placeholder="Task name (e.g., 'Call dentist')..."
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                onSubmitEditing={() => {
                  // Focus next field if exists, otherwise submit
                }}
                returnKeyType="next"
                blurOnSubmit={false}
                autoFocus
              />

              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  color: colors.text,
                  marginBottom: 16,
                }}
                placeholder="Add note (optional)..."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                onSubmitEditing={handleSubmit}
                returnKeyType="done"
                blurOnSubmit={false}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    backgroundColor: isOneTime ? colors.primary : 'transparent',
                    marginRight: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => setIsOneTime(!isOneTime)}
                >
                  {isOneTime && <Text style={{ color: 'white', fontSize: 12 }}>✓</Text>}
                </TouchableOpacity>
                <Text style={{ color: colors.text, fontSize: 16 }}>One-time only</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginLeft: 8 }}>
                  (Expires after check)
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                    {loading ? (editingTask ? 'Saving...' : 'Adding...') : (editingTask ? 'Save' : 'Add Task')}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};
