import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../../App';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Task, LoopWithTasks } from '../types/loop';
import { AnimatedCircularProgress } from '../components/native/AnimatedCircularProgress';
import { FAB } from '../components/native/FAB';

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

  const loadLoopData = async () => {
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

      const completedCount = tasks?.filter(task => task.status === 'done' && task.is_recurring).length || 0;
      const totalCount = tasks?.filter(task => task.is_recurring).length || 0;

      setLoopData({
        ...loop,
        tasks: tasks || [],
        completedCount,
        totalCount,
      });
    } catch (error) {
      console.error('Error loading loop data:', error);
      Alert.alert('Error', 'Failed to load loop data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLoopData();
    setRefreshing(false);
  };

  const toggleTask = async (task: Task) => {
    try {
      const newStatus = task.status === 'done' ? 'pending' : 'done';

      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', task.id);

      if (error) throw error;

      // Haptic feedback
      if (newStatus === 'done') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Handle one-time tasks
      if (task.is_one_time && newStatus === 'done') {
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

      await loadLoopData();
    } catch (error) {
      console.error('Error toggling task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleAddTask = async (description: string, isOneTime: boolean) => {
    try {
      const { error } = await supabase.from('tasks').insert({
        loop_id: loopId,
        description,
        is_recurring: !isOneTime,
        is_one_time: isOneTime,
        status: 'pending',
        assigned_user_id: user?.id,
      });

      if (error) throw error;

      await loadLoopData();
      setShowAddTaskModal(false);
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const openAddTaskModal = () => {
    setShowAddTaskModal(true);
  };

  const handleReloop = async () => {
    if (showResetMenu) {
      // Manual reset override
      await resetLoop();
    } else {
      // Regular reloop - reset if scheduled
      const now = new Date();
      const nextReset = new Date(loopData?.next_reset_at || '');

      if (loopData?.reset_rule === 'manual' || now >= nextReset) {
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
              .select('id, status, is_recurring')
              .eq('loop_id', loop.id)
              .eq('is_recurring', true);

            const completed = tasks?.filter(t => t.status === 'done').length || 0;
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
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('loop_id', loopId)
        .eq('is_recurring', true);

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
  const recurringTasks = loopData.tasks.filter(task => task.is_recurring);
  const oneTimeTasks = loopData.tasks.filter(task => !task.is_recurring);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Progress Ring */}
        <View style={{
          alignItems: 'center',
          paddingVertical: 40,
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
            Resets {loopData.reset_rule} • Next: {formatNextReset(loopData.next_reset_at)}
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
            <Text style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: colors.text,
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
              <TouchableOpacity
                key={task.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
                onPress={() => toggleTask(task)}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: task.status === 'done' ? colors.primary : colors.border,
                  backgroundColor: task.status === 'done' ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  {task.status === 'done' && (
                    <Text style={{ color: 'white', fontSize: 14 }}>✓</Text>
                  )}
                </View>

                <Text style={{
                  flex: 1,
                  fontSize: 16,
                  color: colors.text,
                  textDecorationLine: task.status === 'done' ? 'line-through' : 'none',
                  opacity: task.status === 'done' ? 0.6 : 1,
                }}>
                  {task.description}
                </Text>
              </TouchableOpacity>
            ))}
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
                  borderColor: task.status === 'done' ? colors.primary : colors.border,
                  backgroundColor: task.status === 'done' ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  {task.status === 'done' && (
                    <Text style={{ color: 'white', fontSize: 14 }}>✓</Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    color: colors.text,
                    textDecorationLine: task.status === 'done' ? 'line-through' : 'none',
                    opacity: task.status === 'done' ? 0.6 : 1,
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
        <TouchableOpacity
          style={{
            backgroundColor: showResetMenu ? colors.error : (progress >= 100 ? loopData.color : colors.border),
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderRadius: 25,
            alignItems: 'center',
            opacity: (progress >= 100 || showResetMenu) ? 1 : 0.5,
          }}
          onPress={handleReloop}
          onLongPress={longPressReloop}
          delayLongPress={500}
          disabled={progress < 100 && !showResetMenu}
        >
          <Text style={{
            color: 'white',
            fontSize: 16,
            fontWeight: 'bold',
          }}>
            {showResetMenu ? 'Reset Now' : 'Reloop'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* FAB - Always visible */}
      <FAB 
        onAddTask={handleAddTask} 
        modalVisible={showAddTaskModal}
        setModalVisible={setShowAddTaskModal}
      />
    </SafeAreaView>
  );
};
