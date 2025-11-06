import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
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

  useEffect(() => {
    loadData();
    updateDate();
  }, []);

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
        .select(`
          *,
          tasks (
            id,
            status,
            is_recurring
          )
        `)
        .or(`owner_id.eq.${user.id},loop_members.user_id.eq.${user.id}`);

      if (loopsError) throw loopsError;

      // Calculate folder data
      const folderMap: Record<LoopType, Folder> = {
        personal: { id: 'personal', name: 'Personal', color: FOLDER_COLORS.personal, icon: FOLDER_ICONS.personal, count: 0 },
        work: { id: 'work', name: 'Work', color: FOLDER_COLORS.work, icon: FOLDER_ICONS.work, count: 0 },
        daily: { id: 'daily', name: 'Daily', color: FOLDER_COLORS.daily, icon: FOLDER_ICONS.daily, count: 0 },
        shared: { id: 'shared', name: 'Shared', color: FOLDER_COLORS.shared, icon: FOLDER_ICONS.shared, count: 0 },
      };

      // Get user streaks
      const { data: streaks, error: streaksError } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user.id);

      if (!streaksError && streaks) {
        const total = streaks.reduce((sum, streak) => sum + streak.current_streak, 0);
        setTotalStreak(total);
      }

      // Categorize loops by type (simplified - you might want more complex logic)
      userLoops?.forEach((loop: any) => {
        // For now, assign loops to folders based on some criteria
        // You can enhance this logic based on your requirements
        const loopType: LoopType = 'personal'; // Default, you can determine based on loop properties
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
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.text,
          }}>
            Good morning! 🌅
          </Text>
          {totalStreak > 0 && (
            <View style={{
              backgroundColor: '#FFE066',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
            }}>
              <Text style={{
                fontSize: 14,
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
    </SafeAreaView>
  );
};
