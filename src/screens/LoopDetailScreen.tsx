import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Task, LoopWithTasks } from '../types/loop';
import { AnimatedCircularProgress } from '../components/native/AnimatedCircularProgress';
import { FAB } from '../components/native/FAB';
import { AddTaskIcon } from '../components/native/AddTaskIcon';
import { BeeIcon } from '../components/native/BeeIcon';

type LoopDetailScreenRouteProp = RouteProp<RootStackParamList, 'LoopDetail'>;
type LoopDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LoopDetail'>;

export const LoopDetailScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<LoopDetailScreenNavigationProp>();
  const route = useRoute<LoopDetailScreenRouteProp>();
  const { loopId } = route.params;

  const [loopData, setLoopData] = useState<LoopWithTasks | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showResetMenu, setShowResetMenu] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showThemePrompt, setShowThemePrompt] = useState(false);

  const THEME_PROMPT_SHOWN_KEY = '@doloop_theme_prompt_shown';

  const formatNextReset = (nextResetAt: string | null) => {
    if (!nextResetAt) return 'Not scheduled';
    
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
    } else if (diffHours < -24) {
      return 'Overdue';
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  useEffect(() => {
    loadLoopData();
  }, [loopId]);

  const loadLoopData = async (): Promise<LoopWithTasks | null> => {
    try {
      const { data: loop, error: loopError } = await supabase
        .from('loops')
        .select('*')
        .eq('id', loopId)
        .single();

      if (loopError) throw loopError;

      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('loop_id', loopId)
        .order('created_at', { ascending: true });

      if (tasksError) throw tasksError;

      const completedCount = tasks?.filter(task => task.completed && !task.is_one_time).length || 0;
      const totalCount = tasks?.filter(task => !task.is_one_time).length || 0;

      const loopWithTasks: LoopWithTasks = {
        ...loop,
        tasks: tasks || [],
        completedCount,
        totalCount,
      };

      setLoopData(loopWithTasks);
      return loopWithTasks;
    } catch (error) {
      console.error('Error loading loop data:', error);
      Alert.alert('Error', 'Failed to load loop data');
      return null;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLoopData();
    setRefreshing(false);
  };

  const toggleTask = async (task: Task) => {
    try {
      const newCompleted = !task.completed;

      const { error } = await supabase
        .from('tasks')
        .update({ completed: newCompleted })
        .eq('id', task.id);

      if (error) throw error;

      // Haptic feedback
      if (newCompleted) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Handle one-time tasks
      if (task.is_one_time && newCompleted) {
        // Archive the task
        await supabase.from('archived_tasks').insert({
          original_task_id: task.id,
          loop_id: task.loop_id,
          description: task.description,
          completed_at: new Date().toISOString(),
        });

        // Remove from tasks
        await supabase.from('tasks').delete().eq('id', task.id);
      }

      const updatedLoopData = await loadLoopData();
      
      // Check if this is the first loop completion and show theme prompt
      if (updatedLoopData) {
        await checkAndShowThemePrompt(updatedLoopData);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const checkAndShowThemePrompt = async (currentLoopData: LoopWithTasks) => {
    if (!currentLoopData || !user) return;

    // Check if loop is complete
    const isComplete = currentLoopData.completedCount === currentLoopData.totalCount && currentLoopData.totalCount > 0;
    if (!isComplete) return;

    // Check if prompt has been shown before
    const promptShown = await AsyncStorage.getItem(THEME_PROMPT_SHOWN_KEY);
    if (promptShown === 'true') return;

    // Check if this is the user's first completed loop
    // Count completed loops (loops where all tasks are done)
    const { data: allLoops } = await supabase
      .from('loops')
      .select('id')
      .eq('owner_id', user.id);

    if (!allLoops || allLoops.length === 0) return;

    let completedLoopsCount = 0;
    for (const loop of allLoops) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, completed, is_one_time')
        .eq('loop_id', loop.id)
        .eq('is_one_time', false);

      const completed = tasks?.filter(t => t.completed).length || 0;
      const total = tasks?.length || 0;
      
      if (total > 0 && completed === total) {
        completedLoopsCount++;
      }
    }

    // Show prompt only if this is the first completed loop
    if (completedLoopsCount === 1) {
      setShowThemePrompt(true);
    }
  };

  const handleThemePromptCustomize = () => {
    setShowThemePrompt(false);
    AsyncStorage.setItem(THEME_PROMPT_SHOWN_KEY, 'true');
    navigation.navigate('Settings');
  };

  const handleThemePromptLater = async () => {
    setShowThemePrompt(false);
    await AsyncStorage.setItem(THEME_PROMPT_SHOWN_KEY, 'true');
  };

  const handleAddTask = async (description: string, isOneTime: boolean, notes?: string) => {
    try {
      console.log('[LoopDetail] Adding task:', { description, isOneTime, notes });
      const { error } = await supabase.from('tasks').insert({
        loop_id: loopId,
        description,
        notes: notes || null,
        is_one_time: isOneTime,
        completed: false,
      });

      if (error) {
        console.error('[LoopDetail] Database error:', error);
        throw error;
      }

      console.log('[LoopDetail] Task added successfully');
      await loadLoopData();
      setShowAddTaskModal(false);
    } catch (error) {
      console.error('[LoopDetail] Error adding task:', error);
      throw error;
    }
  };

  const handleEditTask = async (taskId: string, description: string, isOneTime: boolean, notes?: string) => {
    try {
      console.log('[LoopDetail] Editing task:', { taskId, description, isOneTime, notes });
      const { error } = await supabase
        .from('tasks')
        .update({
          description,
          notes: notes || null,
          is_one_time: isOneTime,
        })
        .eq('id', taskId);

      if (error) {
        console.error('[LoopDetail] Database error:', error);
        throw error;
      }

      console.log('[LoopDetail] Task updated successfully');
      await loadLoopData();
      setShowAddTaskModal(false);
      setEditingTask(null);
    } catch (error) {
      console.error('[LoopDetail] Error updating task:', error);
      throw error;
    }
  };

  const openAddTaskModal = () => {
    setEditingTask(null);
    setShowAddTaskModal(true);
  };

  const handleLongPressTask = (task: Task) => {
    Alert.alert(
      task.description,
      'Choose an action',
      [
        {
          text: 'Edit',
          onPress: () => {
            setEditingTask(task);
            setShowAddTaskModal(true);
          },
        },
        {
          text: 'Delete',
          onPress: () => handleDeleteTask(task),
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleDeleteTask = async (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.description}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', task.id);

              if (error) throw error;

              await loadLoopData();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const handleReloop = async () => {
    if (loopData?.reset_rule === 'manual') {
      // For manual loops, always allow reset
      await resetLoop();
    } else if (showResetMenu) {
      // Manual reset override for scheduled loops
      await resetLoop();
    } else {
      // Regular reloop - reset if scheduled
      const now = new Date();
      const nextReset = new Date(loopData?.next_reset_at || '');

      if (now >= nextReset) {
        await resetLoop();
      } else {
        Alert.alert(
          'Not yet',
          `This loop resets ${loopData.reset_rule} at ${nextReset.toLocaleTimeString()}`
        );
      }
    }
  };

  const resetLoop = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // === STREAK LOGIC: Update global user streak for daily loops ===
      if (loopData?.reset_rule === 'daily' && loopData.completedCount === loopData.totalCount) {
        // Check if ALL daily loops are complete
        const { data: allDailyLoops } = await supabase
          .from('loops')
          .select('id')
          .eq('owner', user?.id)
          .eq('reset_rule', 'daily');

        let allDailyLoopsComplete = true;
        
        if (allDailyLoops && allDailyLoops.length > 0) {
          for (const loop of allDailyLoops) {
            const { data: tasks } = await supabase
              .from('tasks')
              .select('id, completed, is_one_time')
              .eq('loop_id', loop.id)
              .eq('is_one_time', false);

            const completed = tasks?.filter(t => t.completed).length || 0;
            const total = tasks?.length || 0;
            
            if (total > 0 && completed < total && loop.id !== loopId) {
              allDailyLoopsComplete = false;
              break;
            }
          }
        }

        // Update streak if all daily loops are complete
        if (allDailyLoopsComplete) {
          const today = new Date().toISOString().split('T')[0];
          
          const { data: currentStreak } = await supabase
            .from('user_streaks')
            .select('*')
            .eq('user_id', user?.id)
            .single();

          let newStreak = 1;
          let longestStreak = 1;

          if (currentStreak) {
            const lastDate = currentStreak.last_completed_date?.split('T')[0];
            
            if (lastDate && lastDate !== today) {
              // Check if it was yesterday
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];
              
              if (lastDate === yesterdayStr) {
                newStreak = currentStreak.current_streak + 1;
              } else {
                newStreak = 1; // Streak broken
              }
            } else if (lastDate === today) {
              newStreak = currentStreak.current_streak; // Already counted today
            }
            
            longestStreak = Math.max(newStreak, currentStreak.longest_streak || 0);
          }

          await supabase
            .from('user_streaks')
            .upsert({
              user_id: user?.id,
              current_streak: newStreak,
              longest_streak: longestStreak,
              last_completed_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        }
      }

      // Reset tasks
      const { error } = await supabase
        .from('tasks')
        .update({
          completed: false
        })
        .eq('loop_id', loopId)
        .eq('is_one_time', false);

      if (error) throw error;

      // Update next reset time if scheduled
      if (loopData?.reset_rule !== 'manual') {
        let nextResetAt: string;
        if (loopData.reset_rule === 'daily') {
          nextResetAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        } else { // weekly
          nextResetAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        }

        await supabase
          .from('loops')
          .update({ next_reset_at: nextResetAt })
          .eq('id', loopId);
      }

      await loadLoopData();
      setShowResetMenu(false);
    } catch (error) {
      console.error('Error resetting loop:', error);
      Alert.alert('Error', 'Failed to reset loop');
    }
  };

  const longPressReloop = () => {
    setShowResetMenu(true);
    // Auto-hide after a delay
    setTimeout(() => setShowResetMenu(false), 3000);
  };

  if (!loopData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const progress = loopData.totalCount > 0 ? (loopData.completedCount / loopData.totalCount) * 100 : 0;
  const recurringTasks = loopData.tasks.filter(task => !task.is_one_time);
  const oneTimeTasks = loopData.tasks.filter(task => task.is_one_time);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{
        flex: 1,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
        backgroundColor: '#f5f5f5',
      }}>
        {/* Back Button */}
        <View style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 8,
              marginLeft: -8,
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{
              fontSize: 28,
              color: colors.primary,
              lineHeight: 28,
            }}>‹</Text>
            <Text style={{
              fontSize: 17,
              color: colors.primary,
              marginLeft: 4,
              fontWeight: '500',
            }}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
        {/* Header with Progress Ring */}
        <View style={{
          alignItems: 'center',
          paddingVertical: 20,
          paddingHorizontal: 20,
        }}>
          <AnimatedCircularProgress
            size={90}
            width={8}
            fill={progress}
            tintColor={loopData.color}
            backgroundColor={colors.border}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: colors.text,
              textAlign: 'center',
              paddingHorizontal: 4,
            }}>
              {loopData.name}
              {loopData.is_favorite && ' ⭐'}
            </Text>
          </AnimatedCircularProgress>

          {/* Reset Info */}
          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 12,
            textAlign: 'center',
          }}>
            {loopData.reset_rule === 'manual'
              ? 'Manual checklist • Complete when ready'
              : `Resets ${loopData.reset_rule} • Next: ${formatNextReset(loopData.next_reset_at)}`}
          </Text>
        </View>

        {/* Recurring Tasks or Empty State */}
        {recurringTasks.length === 0 ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
            paddingVertical: 80,
            minHeight: 400,
          }}>
            <BeeIcon size={120} />
            <Text style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: colors.text,
              marginTop: 24,
              marginBottom: 12,
              textAlign: 'center',
              letterSpacing: -0.5,
            }}>
              No steps yet
            </Text>
            <Text style={{
              fontSize: 17,
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: 40,
              lineHeight: 24,
            }}>
              Tap the + button to add your first step
            </Text>
            <TouchableOpacity
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                elevation: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
              }}
              onPress={openAddTaskModal}
              activeOpacity={0.8}
            >
              <Text style={{ 
                color: '#fff', 
                fontSize: 40, 
                fontWeight: '300',
                marginTop: -2,
              }}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 12,
            }}>
              Tasks ({loopData.completedCount}/{loopData.totalCount})
            </Text>

            {recurringTasks.map((task) => (
              <View
                key={task.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flex: 1,
                  }}
                  onPress={() => toggleTask(task)}
                  onLongPress={() => handleLongPressTask(task)}
                  delayLongPress={500}
                >
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: task.completed ? colors.primary : colors.border,
                    backgroundColor: task.completed ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    {task.completed && (
                      <Text style={{ color: 'white', fontSize: 14 }}>✓</Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      color: colors.text,
                      textDecorationLine: task.completed ? 'line-through' : 'none',
                      opacity: task.completed ? 0.6 : 1,
                    }}>
                      {task.description}
                    </Text>
                    {task.notes && (
                      <Text style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 4,
                        opacity: task.completed ? 0.5 : 0.8,
                      }}>
                        {task.notes}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Edit/Delete Buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingTask(task);
                      setShowAddTaskModal(true);
                    }}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={{ fontSize: 18, color: colors.primary }}>✎</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteTask(task)}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={{ fontSize: 18, color: colors.error || '#ff4444' }}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add Task Button */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'transparent',
                padding: 16,
                borderRadius: 8,
                marginBottom: 8,
                borderWidth: 2,
                borderColor: colors.primary,
                borderStyle: 'dashed',
              }}
              onPress={openAddTaskModal}
              activeOpacity={0.7}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>+</Text>
              </View>

              <Text style={{
                flex: 1,
                fontSize: 16,
                color: colors.primary,
                fontWeight: '500',
              }}>
                Add Task
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* One-time Tasks */}
        {oneTimeTasks.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 12,
            }}>
              One-time Tasks
            </Text>

            {oneTimeTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  opacity: 0.8,
                }}
                onPress={() => toggleTask(task)}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: task.completed ? colors.primary : colors.border,
                  backgroundColor: task.completed ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  {task.completed && (
                    <Text style={{ color: 'white', fontSize: 14 }}>✓</Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    color: colors.text,
                    textDecorationLine: task.completed ? 'line-through' : 'none',
                    opacity: task.completed ? 0.6 : 1,
                  }}>
                    {task.description}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginTop: 4,
                  }}>
                    Expires after check
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        </ScrollView>

        {/* Reloop Button */}
        <View style={{
          position: 'absolute',
          bottom: 100,
          left: 20,
          right: 20,
        }}>
          {(() => {
            const isManual = loopData?.reset_rule === 'manual';
            const canReset = isManual ? progress >= 100 : (progress >= 100 || showResetMenu);
            const buttonText = showResetMenu ? 'Reset Now' : (isManual ? 'Complete Checklist' : 'Reloop');

            return (
              <TouchableOpacity
                style={{
                  backgroundColor: showResetMenu ? colors.error : (canReset ? loopData.color : colors.border),
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 25,
                  alignItems: 'center',
                  opacity: canReset ? 1 : 0.5,
                }}
                onPress={handleReloop}
                onLongPress={longPressReloop}
                delayLongPress={500}
                disabled={!canReset}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}>
                  {buttonText}
                </Text>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* Theme Customization Prompt Modal */}
        <Modal
          visible={showThemePrompt}
          transparent={true}
          animationType="slide"
          onRequestClose={handleThemePromptLater}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalEmoji, { fontSize: 64 }]}>🎉</Text>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Nice work!
              </Text>
              <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                Want to personalize your DoLoop theme?
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={handleThemePromptLater}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Maybe later"
                >
                  <Text style={[styles.modalButtonTextSecondary, { color: colors.textSecondary }]}>
                    Maybe Later
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalButtonPrimary}
                  onPress={handleThemePromptCustomize}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Customize theme"
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primary + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonTextPrimary}>
                      Customize Theme
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Task Modal (no button, just the modal) */}
        <FAB 
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          modalVisible={showAddTaskModal}
          setModalVisible={setShowAddTaskModal}
          hideButton={true}
          editingTask={editingTask}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalEmoji: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  modalButtonPrimary: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Inter_700Bold',
  },
});
