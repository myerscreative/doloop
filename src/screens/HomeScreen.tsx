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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Folder, LoopType, FOLDER_ICONS, FOLDER_COLORS } from '../types/loop';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user, signOut, loading } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [totalStreak, setTotalStreak] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [newLoopName, setNewLoopName] = useState('');
  const [selectedLoopType, setSelectedLoopType] = useState<LoopType>('personal');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    updateDate();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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
        .eq('owner', user.id);

      if (loopsError) throw loopsError;

      // Calculate folder data
      const folderMap: Record<LoopType, Folder> = {
        personal: { id: 'personal', name: 'Personal', color: FOLDER_COLORS.personal, icon: FOLDER_ICONS.personal, count: 0 },
        work: { id: 'work', name: 'Work', color: FOLDER_COLORS.work, icon: FOLDER_ICONS.work, count: 0 },
        daily: { id: 'daily', name: 'Daily', color: FOLDER_COLORS.daily, icon: FOLDER_ICONS.daily, count: 0 },
        shared: { id: 'shared', name: 'Shared', color: FOLDER_COLORS.shared, icon: FOLDER_ICONS.shared, count: 0 },
      };

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

      // Categorize loops by type
      userLoops?.forEach((loop: any) => {
        const loopType: LoopType = loop.loop_type || 'personal'; // Use loop_type from database
        if (folderMap[loopType]) {
          folderMap[loopType].count += 1;
        }
      });

      setFolders(Object.values(folderMap).filter(folder => folder.count > 0));
    } catch (error) {
      console.error('Error loading home data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleFolderPress = (folderId: string) => {
    // Navigate to folder view - you might want to create a separate screen for this
    console.log('Folder pressed:', folderId);
  };

  const handleSignOut = async () => {
    await signOut();
    navigation.replace('Login');
  };

  const handleCreateLoop = async () => {
    if (!newLoopName.trim()) {
      Alert.alert('Error', 'Please enter a loop name');
      return;
    }

    setCreating(true);
    try {
      // Calculate next reset time based on reset rule
      const nextResetAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now for daily

      const { data, error } = await supabase
        .from('loops')
        .insert({
          name: newLoopName.trim(),
          owner: user?.id,
          loop_type: selectedLoopType,
          color: FOLDER_COLORS[selectedLoopType],
          reset_rule: 'daily',
          next_reset_at: nextResetAt,
        })
        .select()
        .single();

      if (error) throw error;

      setModalVisible(false);
      setNewLoopName('');
      setSelectedLoopType('personal');
      await loadData();
      
      // Navigate to the newly created loop
      if (data) {
        navigation.navigate('LoopDetail', { loopId: data.id });
      }
    } catch (error) {
      console.error('Error creating loop:', error);
      Alert.alert('Error', 'Failed to create loop');
    } finally {
      setCreating(false);
    }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{
          fontSize: 16,
          color: colors.textSecondary,
          marginBottom: 4,
        }}>
          {currentDate}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: colors.text,
            }}>
              Good morning! 🌅
            </Text>
          </View>
          {totalStreak > 0 && (
            <View style={{
              backgroundColor: '#FFE066',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#000',
              }}>
                🔥 {totalStreak}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Folders */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ padding: 20 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 16,
          }}>
            Your Loops
          </Text>

          {folders.map((folder) => (
            <TouchableOpacity
              key={folder.id}
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
              onPress={() => handleFolderPress(folder.id)}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: folder.color,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}>
                <Text style={{ fontSize: 20 }}>{folder.icon}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text,
                }}>
                  {folder.name}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                }}>
                  {folder.count} {folder.count === 1 ? 'loop' : 'loops'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {folders.length === 0 && (
            <View style={{
              alignItems: 'center',
              paddingVertical: 40,
            }}>
              <Text style={{
                fontSize: 16,
                color: colors.textSecondary,
                textAlign: 'center',
              }}>
                No loops yet. Create your first loop to get started!
              </Text>
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

      {/* Create Loop Modal */}
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
                Create New Loop
              </Text>

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
                {(['personal', 'work', 'daily', 'shared'] as LoopType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 2,
                      borderColor: selectedLoopType === type ? FOLDER_COLORS[type] : colors.border,
                      backgroundColor: selectedLoopType === type ? `${FOLDER_COLORS[type]}20` : 'transparent',
                    }}
                    onPress={() => setSelectedLoopType(type)}
                  >
                    <Text style={{ fontSize: 18, marginRight: 6 }}>{FOLDER_ICONS[type]}</Text>
                    <Text style={{
                      color: selectedLoopType === type ? colors.text : colors.textSecondary,
                      fontWeight: selectedLoopType === type ? 'bold' : 'normal',
                      textTransform: 'capitalize',
                    }}>
                      {type}
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
                  onPress={handleCreateLoop}
                  disabled={creating}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                    {creating ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};
