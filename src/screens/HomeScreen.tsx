import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Folder, LoopType, FOLDER_ICONS, FOLDER_COLORS } from '../types/loop';
import { Header } from '../components/Header';
import { LoopSelectionModal } from '../components/LoopSelectionModal';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type FilterType = 'all' | 'manual' | 'daily' | 'weekly';

export const HomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user, signOut, loading } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [loops, setLoops] = useState<any[]>([]);
  const [filteredLoops, setFilteredLoops] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [totalStreak, setTotalStreak] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [newLoopName, setNewLoopName] = useState('');
  const [selectedLoopType, setSelectedLoopType] = useState<string>('manual');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [creating, setCreating] = useState(false);
  const [selectionModalVisible, setSelectionModalVisible] = useState(false);
  const [loopsToSelect, setLoopsToSelect] = useState<any[]>([]);
  const [selectedFolderName, setSelectedFolderName] = useState('');

  // AI Loop Creation state
  const [createMode, setCreateMode] = useState<'manual' | 'ai'>('manual');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLoop, setGeneratedLoop] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    updateDate();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    filterLoops();
  }, [loops, selectedFilter]);

  const filterLoops = () => {
    let filtered = [...loops];

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(loop => loop.reset_rule === selectedFilter);
    }

    setFilteredLoops(filtered);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigation.replace('Login');
    }
  }, [loading, user, navigation]);

  const updateDate = () => {
    const now = new Date();
    const formatted = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    setCurrentDate(formatted);
  };

  const loadData = async () => {
    if (!user) return;

    try {
      // Get all loops for the user
      const { data: userLoops, error: loopsError } = await supabase
        .from('loops')
        .select('*')
        .eq('owner_id', user.id);

      if (loopsError) throw loopsError;

      // Get global user streak
      const { data: streakData, error: streaksError } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .single();

      if (!streaksError && streakData) {
        setTotalStreak(streakData.current_streak || 0);
      } else {
        setTotalStreak(0);
      }

      setLoops(userLoops || []);
    } catch (error) {
      console.error('Error loading home data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLoopPress = (loop: any) => {
    navigation.navigate('LoopDetail', { loopId: loop.id });
  };

  const handleSignOut = async () => {
    await signOut();
    navigation.replace('Login');
  };

  const handleCreateLoop = async () => {
    console.log('[HomeScreen] Create loop button clicked');

    if (!newLoopName.trim()) {
      console.log('[HomeScreen] Empty loop name');
      Alert.alert('Error', 'Please enter a loop name');
      return;
    }

    console.log('[HomeScreen] Creating loop:', newLoopName, selectedLoopType);
    setCreating(true);

    try {
      // Calculate next reset time based on reset rule
      let nextResetAt: string | null = null;
      if (selectedLoopType === 'daily') {
        nextResetAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
      } else if (selectedLoopType === 'weekly') {
        nextResetAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
      }
      // Manual loops have next_reset_at = null

      console.log('[HomeScreen] Inserting into database...');
      const { data, error } = await supabase
        .from('loops')
        .insert({
          name: newLoopName.trim(),
          owner_id: user?.id,
          loop_type: 'personal', // Keep for backward compatibility
          color: selectedLoopType === 'manual' ? '#10B981' :
                 selectedLoopType === 'daily' ? '#F59E0B' : '#8B5CF6',
          reset_rule: selectedLoopType,
          next_reset_at: nextResetAt,
        })
        .select()
        .single();

      if (error) {
        console.error('[HomeScreen] Database error:', error);
        throw error;
      }

      console.log('[HomeScreen] Loop created successfully:', data);
      setModalVisible(false);
      setNewLoopName('');
      setSelectedLoopType('manual');
      await loadData();

      // Navigate to the newly created loop
      if (data) {
        console.log('[HomeScreen] Navigating to loop:', data.id);
        navigation.navigate('LoopDetail', { loopId: data.id });
      }
    } catch (error: any) {
      console.error('[HomeScreen] Error creating loop:', error);
      Alert.alert('Error', `Failed to create loop: ${error?.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('Required', 'Please describe what kind of loop you need');
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to use AI features');
      }

      const { data, error: functionError } = await supabase.functions.invoke('generate_ai_loop', {
        body: { prompt: aiPrompt },
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
      setAiError(err.message || 'Failed to generate loop. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateFromAI = async () => {
    if (!generatedLoop) return;

    setCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
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
          owner_id: user?.id,
          name: generatedLoop.name,
          color: generatedLoop.color,
          reset_rule: generatedLoop.resetRule,
          next_reset_at: nextResetAt,
          is_favorite: false,
          loop_type: 'personal',
        })
        .select()
        .single();

      if (loopError) throw loopError;

      // Create the tasks
      const tasksToInsert = generatedLoop.tasks.map((task: any, index: number) => ({
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

      // Reset modal state
      setModalVisible(false);
      setCreateMode('manual');
      setAiPrompt('');
      setGeneratedLoop(null);
      setAiError(null);
      await loadData();

      // Navigate to the new loop
      navigation.navigate('LoopDetail', { loopId: newLoop.id });
    } catch (err: any) {
      console.error('Error creating loop:', err);
      Alert.alert('Error', err.message || 'Failed to create loop. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setCreating(false);
    }
  };

  const handleRegenerateAI = () => {
    setGeneratedLoop(null);
    setAiError(null);
    handleGenerateAI();
  };

  const resetModalState = () => {
    setCreateMode('manual');
    setNewLoopName('');
    setAiPrompt('');
    setGeneratedLoop(null);
    setAiError(null);
    setModalVisible(false);
  };

  // Show loading screen while checking auth
  if (loading || !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{
        flex: 1,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
        backgroundColor: '#f5f5f5',
      }}>
        {/* Header */}
        <Header currentDate={currentDate} streak={totalStreak} colors={colors} />

        {/* Filter Tabs */}
        <View style={{
          backgroundColor: colors.surface,
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 16,
          }}>
            Your Loops
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {[
              { id: 'all' as FilterType, label: 'All', icon: '⭐' },
              { id: 'manual' as FilterType, label: 'Checklists', icon: '✓' },
              { id: 'daily' as FilterType, label: 'Daily', icon: '☀️' },
              { id: 'weekly' as FilterType, label: 'Weekly', icon: '🎯' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: selectedFilter === tab.id ? colors.primary : colors.border,
                  backgroundColor: selectedFilter === tab.id ? `${colors.primary}20` : 'transparent',
                }}
                onPress={() => setSelectedFilter(tab.id)}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: selectedFilter === tab.id ? 'bold' : 'normal',
                  color: selectedFilter === tab.id ? colors.primary : colors.textSecondary,
                }}>
                  {tab.icon} {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Loops */}
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
        <View style={{ padding: 20 }}>
          {filteredLoops.map((loop) => (
            <TouchableOpacity
              key={loop.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
              onPress={() => handleLoopPress(loop)}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: loop.color,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}>
                <Text style={{ fontSize: 20 }}>
                  {loop.reset_rule === 'manual' ? '✓' :
                   loop.reset_rule === 'daily' ? '☀️' : '🎯'}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.text,
                    marginRight: 8,
                  }}>
                    {loop.name}
                  </Text>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: loop.reset_rule === 'manual' ? '#10B981' :
                                   loop.reset_rule === 'daily' ? '#F59E0B' : '#8B5CF6',
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: 'white',
                    }}>
                      {loop.reset_rule === 'manual' ? '✓ Checklist' :
                       loop.reset_rule === 'daily' ? '☀️ Daily' : '🎯 Weekly'}
                    </Text>
                  </View>
                </View>
                {loop.is_favorite && (
                  <Text style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                  }}>
                    ⭐ Favorite
                  </Text>
                )}
              </View>

              <Text style={{
                fontSize: 20,
                color: colors.primary,
              }}>›</Text>
            </TouchableOpacity>
          ))}

          {filteredLoops.length === 0 && (
            <View style={{
              alignItems: 'center',
              paddingVertical: 40,
            }}>
              <Text style={{
                fontSize: 16,
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: 16,
              }}>
                {selectedFilter === 'all'
                  ? 'No loops yet. Create your first loop to get started!'
                  : `No ${selectedFilter === 'manual' ? 'checklists' : selectedFilter === 'daily' ? 'daily routines' : 'weekly goals'} yet.`}
              </Text>
              {selectedFilter !== 'all' && (
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: colors.primary,
                  }}
                  onPress={() => setSelectedFilter('all')}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: colors.primary,
                  }}>
                    View All Loops
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Loop Library Section */}
          <View style={{ marginTop: 32 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 16,
            }}>
              Discover Loops
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#667eea',
                padding: 20,
                borderRadius: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={() => navigation.navigate('TemplateLibrary')}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <Text style={{ fontSize: 28, marginRight: 12 }}>📚</Text>
                <Text style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#fff',
                  flex: 1,
                }}>
                  Loop Library
                </Text>
                <Text style={{ fontSize: 20, color: '#fff' }}>→</Text>
              </View>
              <Text style={{
                fontSize: 14,
                color: '#fff',
                opacity: 0.9,
                lineHeight: 20,
              }}>
                Explore loops inspired by top teachers, coaches, and business leaders
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>

        {/* Sign Out Button (temporary) */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 60,
            right: 20,
            padding: 8,
          }}
          onPress={handleSignOut}
        >
          <Text style={{ color: colors.textSecondary }}>Sign Out</Text>
        </TouchableOpacity>

        {/* FAB - Floating Action Button */}
        <TouchableOpacity
          style={{
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
          <Text style={{ fontSize: 24, color: 'white', fontWeight: 'bold' }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Create Loop Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={resetModalState}
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
              alignItems: 'center',
            }}
            activeOpacity={1}
            onPress={resetModalState}
          >
            <ScrollView
              style={{ flex: 1, width: '100%', maxWidth: 600 }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {}}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 20,
                  ...(Platform.OS === 'web' ? { maxHeight: '80vh' } : {}),
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
                  Create New Loop
                </Text>

                {/* Mode Toggle Tabs */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: createMode === 'manual' ? colors.primary : colors.border + '40',
                      alignItems: 'center',
                    }}
                    onPress={() => setCreateMode('manual')}
                  >
                    <Text style={{
                      color: createMode === 'manual' ? '#fff' : colors.textSecondary,
                      fontWeight: createMode === 'manual' ? 'bold' : 'normal',
                      fontSize: 15,
                    }}>
                      ✏️ Manual
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: createMode === 'ai' ? '#10b981' : colors.border + '40',
                      alignItems: 'center',
                    }}
                    onPress={() => setCreateMode('ai')}
                  >
                    <Text style={{
                      color: createMode === 'ai' ? '#fff' : colors.textSecondary,
                      fontWeight: createMode === 'ai' ? 'bold' : 'normal',
                      fontSize: 15,
                    }}>
                      ✨ AI Helper
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Manual Mode */}
                {createMode === 'manual' && (
                  <>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        color: colors.text,
                        marginBottom: 16,
                      }}
                      placeholder="Loop name..."
                      placeholderTextColor={colors.textSecondary}
                      value={newLoopName}
                      onChangeText={setNewLoopName}
                      autoFocus
                    />

                    <Text style={{ color: colors.text, fontSize: 16, marginBottom: 12 }}>
                      Loop Type:
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                      {[
                        { id: 'manual', label: 'Checklist', icon: '✓', description: 'Manual reset' },
                        { id: 'daily', label: 'Daily Routine', icon: '☀️', description: 'Resets daily' },
                        { id: 'weekly', label: 'Weekly Goal', icon: '🎯', description: 'Resets weekly' },
                      ].map((type) => (
                        <TouchableOpacity
                          key={type.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: selectedLoopType === type.id ? colors.primary : colors.border,
                            backgroundColor: selectedLoopType === type.id ? `${colors.primary}20` : 'transparent',
                          }}
                          onPress={() => setSelectedLoopType(type.id as LoopType)}
                        >
                          <Text style={{ fontSize: 18, marginRight: 6 }}>{type.icon}</Text>
                          <Text style={{
                            color: selectedLoopType === type.id ? colors.text : colors.textSecondary,
                            fontWeight: selectedLoopType === type.id ? 'bold' : 'normal',
                          }}>
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 6,
                        }}
                        onPress={resetModalState}
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
                        onPress={handleCreateLoop}
                        disabled={creating}
                      >
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                          {creating ? 'Creating...' : 'Create'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* AI Mode */}
                {createMode === 'ai' && !generatedLoop && (
                  <>
                    <Text style={{ color: colors.text, fontSize: 14, marginBottom: 8 }}>
                      Describe what you want to accomplish:
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
                      Examples: "morning routine for productivity", "weekly fitness plan", "project launch checklist"
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
                        minHeight: 100,
                        textAlignVertical: 'top',
                      }}
                      placeholder="Describe your loop..."
                      placeholderTextColor={colors.textSecondary}
                      value={aiPrompt}
                      onChangeText={setAiPrompt}
                      multiline
                      numberOfLines={4}
                      autoFocus
                    />

                    {aiError && (
                      <View style={{
                        backgroundColor: '#fee2e2',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: '#ef4444',
                      }}>
                        <Text style={{ color: '#991b1b', fontSize: 14 }}>
                          ⚠️ {aiError}
                        </Text>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 6,
                        }}
                        onPress={resetModalState}
                        disabled={isGenerating}
                      >
                        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          backgroundColor: '#10b981',
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 6,
                          minWidth: 120,
                          alignItems: 'center',
                        }}
                        onPress={handleGenerateAI}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                            ✨ Generate
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* AI Preview Mode */}
                {createMode === 'ai' && generatedLoop && (
                  <>
                    <View style={{
                      backgroundColor: colors.background,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                      borderLeftWidth: 4,
                      borderLeftColor: generatedLoop.color,
                    }}>
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
                        {generatedLoop.name}
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8, lineHeight: 20 }}>
                        {generatedLoop.description}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#10b981', fontWeight: '600', marginBottom: 12 }}>
                        {generatedLoop.resetRule === 'manual' ? '✓ Checklist' :
                         generatedLoop.resetRule === 'daily' ? '☀️ Daily Routine' : '🎯 Weekly Goal'}
                      </Text>

                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                        Tasks ({generatedLoop.tasks.length})
                      </Text>
                      {generatedLoop.tasks.map((task: any, index: number) => (
                        <View key={index} style={{ flexDirection: 'row', marginBottom: 8, gap: 10 }}>
                          <View style={{
                            width: 18,
                            height: 18,
                            borderRadius: 5,
                            borderWidth: 2,
                            borderColor: colors.border,
                            marginTop: 2,
                          }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>
                              {task.description}
                            </Text>
                            {task.notes && (
                              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 }}>
                                {task.notes}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: '#10b981',
                          alignItems: 'center',
                        }}
                        onPress={handleRegenerateAI}
                        disabled={isGenerating || creating}
                      >
                        {isGenerating ? (
                          <ActivityIndicator color="#10b981" />
                        ) : (
                          <Text style={{ color: '#10b981', fontSize: 16, fontWeight: '600' }}>
                            🔄 Regenerate
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          borderRadius: 6,
                          backgroundColor: '#10b981',
                          alignItems: 'center',
                        }}
                        onPress={handleCreateFromAI}
                        disabled={creating || isGenerating}
                      >
                        {creating ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                            ✓ Create Loop
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Loop Selection Modal */}
      <LoopSelectionModal
        visible={selectionModalVisible}
        loops={loopsToSelect}
        folderName={selectedFolderName}
        onSelect={(loopId) => {
          console.log('[HomeScreen] Loop selected from modal:', loopId);
          setSelectionModalVisible(false);
          navigation.navigate('LoopDetail', { loopId });
        }}
        onClose={() => setSelectionModalVisible(false)}
      />
    </SafeAreaView>
  );
};
