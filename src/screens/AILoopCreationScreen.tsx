import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase, getCurrentUser } from '../lib/supabase';
import { Loop } from '../types/loop';

type RootStackParamList = {
  Home: undefined;
  LoopDetail: { loopId: string };
  AILoopCreation: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GeneratedTask {
  description: string;
  notes?: string;
}

interface GeneratedLoop {
  name: string;
  description: string;
  color: string;
  resetRule: 'manual' | 'daily' | 'weekly';
  tasks: GeneratedTask[];
}

export default function AILoopCreationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedLoop, setGeneratedLoop] = useState<GeneratedLoop | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Required', 'Please describe what kind of loop you need');
      return;
    }

    setIsGenerating(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Get the current user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to use AI features');
      }

      // Call the Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('generate_ai_loop', {
        body: { prompt },
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate loop');
      }

      setGeneratedLoop(data.loop);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error('Error generating loop:', err);
      setError(err.message || 'Failed to generate loop. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateLoop = async () => {
    if (!generatedLoop) return;

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('You must be logged in to create loops');
      }

      // Calculate next reset time based on reset rule
      let nextResetAt: string;
      const now = new Date();

      if (generatedLoop.resetRule === 'daily') {
        nextResetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      } else if (generatedLoop.resetRule === 'weekly') {
        nextResetAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        nextResetAt = new Date('2099-12-31').toISOString(); // Far future for manual
      }

      // Create the loop
      const { data: newLoop, error: loopError } = await supabase
        .from('loops')
        .insert({
          owner_id: user.id,
          name: generatedLoop.name,
          color: generatedLoop.color,
          reset_rule: generatedLoop.resetRule,
          next_reset_at: nextResetAt,
          is_favorite: false,
        })
        .select()
        .single();

      if (loopError) throw loopError;

      // Create the tasks
      const tasksToInsert = generatedLoop.tasks.map((task, index) => ({
        loop_id: newLoop.id,
        description: task.description,
        notes: task.notes || null,
        completed: false,
        is_one_time: generatedLoop.resetRule === 'manual',
        order_index: index,
      }));

      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(tasksToInsert);

      if (tasksError) throw tasksError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to the new loop
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Home' },
          { name: 'LoopDetail', params: { loopId: newLoop.id } },
        ],
      });
    } catch (err: any) {
      console.error('Error creating loop:', err);
      Alert.alert('Error', err.message || 'Failed to create loop. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRegenerate = () => {
    setGeneratedLoop(null);
    setError(null);
    handleGenerate();
  };

  const getResetRuleLabel = (rule: string) => {
    switch (rule) {
      case 'daily':
        return '☀️ Daily Routine';
      case 'weekly':
        return '🎯 Weekly Goal';
      case 'manual':
        return '✓ Checklist';
      default:
        return rule;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>✨ AI Loop Creator</Text>
          <Text style={styles.headerSubtitle}>
            Describe what you need, and AI will create it
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!generatedLoop ? (
          // Input phase
          <View style={styles.inputSection}>
            <Text style={styles.label}>What do you want to accomplish?</Text>
            <Text style={styles.hint}>
              Examples: "morning routine for productivity", "weekly fitness plan", "reading habit tracker"
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Describe your loop..."
              placeholderTextColor="#999"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isGenerating}
            />

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
              onPress={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.generateButtonText}>✨ Generate Loop</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Preview phase
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Generated Loop Preview</Text>

            <View style={[styles.loopCard, { borderLeftColor: generatedLoop.color }]}>
              <Text style={styles.loopName}>{generatedLoop.name}</Text>
              <Text style={styles.loopDescription}>{generatedLoop.description}</Text>
              <Text style={styles.loopResetRule}>{getResetRuleLabel(generatedLoop.resetRule)}</Text>

              <View style={styles.tasksContainer}>
                <Text style={styles.tasksHeader}>Tasks ({generatedLoop.tasks.length})</Text>
                {generatedLoop.tasks.map((task, index) => (
                  <View key={index} style={styles.taskItem}>
                    <View style={styles.taskCheckbox} />
                    <View style={styles.taskContent}>
                      <Text style={styles.taskDescription}>{task.description}</Text>
                      {task.notes && (
                        <Text style={styles.taskNotes}>{task.notes}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.regenerateButton]}
                onPress={handleRegenerate}
                disabled={isGenerating || isCreating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#667eea" />
                ) : (
                  <Text style={styles.regenerateButtonText}>🔄 Regenerate</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.createButton]}
                onPress={handleCreateLoop}
                disabled={isCreating || isGenerating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>✓ Create Loop</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    gap: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  inputSection: {
    gap: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  hint: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
  generateButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  previewSection: {
    gap: 20,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  loopCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  loopDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  loopResetRule: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 16,
  },
  tasksContainer: {
    gap: 12,
  },
  tasksHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
    gap: 4,
  },
  taskDescription: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 20,
  },
  taskNotes: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  regenerateButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  regenerateButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#10b981',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
