/**
 * DoLoop Onboarding Flow
 * 4-screen carousel with snap scrolling, dot indicators
 * - Screen 1: Welcome + Auth
 * - Screen 2: Quick Quiz (user type & main use)
 * - Screen 3: Vibe Picker
 * - Screen 4: Starter Loop with confetti
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../../App';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { OnboardingCard } from '../components/OnboardingCard';
import { BeeIcon } from '../components/native/BeeIcon';
import { DoLoopLogo } from '../components/native/DoLoopLogo';
import { AppleLogo } from '../components/native/AppleLogo';
import { GoogleLogo } from '../components/native/GoogleLogo';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Colors } from '../constants/Colors';
import {
  UserType,
  MainUse,
  VibeStyle,
  OnboardingData,
  StarterTask,
} from '../types/onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = '@doloop_onboarded';

type OnboardingNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const OnboardingScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<OnboardingNavigationProp>();
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Onboarding data
  const [userType, setUserType] = useState<UserType>();
  const [mainUse, setMainUse] = useState<MainUse>();
  const [vibe, setVibe] = useState<VibeStyle>();
  const [starterTasks, setStarterTasks] = useState<StarterTask[]>([
    { description: 'Wake up', emoji: '☀️', completed: false },
    { description: 'Drink water', emoji: '🚰', completed: false },
    { description: 'Check calendar', emoji: '📱', completed: false },
  ]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animated scroll position
  const scrollX = useSharedValue(0);

  const handleScroll = (event: any) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
  };

  const scrollToScreen = (screenIndex: number) => {
    scrollViewRef.current?.scrollTo({
      x: screenIndex * SCREEN_WIDTH,
      animated: true,
    });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // ===== SCREEN 1: WELCOME + AUTH =====
  const handleAuthPress = async (method: 'apple' | 'google' | 'email') => {
    setLoading(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      if (method === 'apple' || method === 'google') {
        // Check if user profile exists (auto-skip quiz)
        const hasProfile = true; // TODO: Check actual profile
        if (hasProfile) {
          await completeOnboarding();
          return;
        }
      }
      
      // Continue to quiz
      scrollToScreen(1);
    } catch {
      // Error handled silently for production
    } finally {
      setLoading(false);
    }
  };

  // ===== SCREEN 2: QUICK QUIZ =====
  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    AccessibilityInfo.announceForAccessibility(`Selected ${type}`);
  };

  const handleMainUseSelect = (use: MainUse) => {
    setMainUse(use);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    AccessibilityInfo.announceForAccessibility(`Selected ${use} loops`);
  };

  // ===== SCREEN 3: VIBE PICKER =====
  const handleVibeSelect = (selectedVibe: VibeStyle) => {
    setVibe(selectedVibe);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    AccessibilityInfo.announceForAccessibility(`Selected ${selectedVibe} style`);
  };

  // ===== SCREEN 4: STARTER LOOP =====
  const handleTaskCheck = (index: number) => {
    const newTasks = [...starterTasks];
    newTasks[index].completed = !newTasks[index].completed;
    setStarterTasks(newTasks);
    
    if (!newTasks[index].completed) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      AccessibilityInfo.announceForAccessibility('Task completed!');
    }
  };

  const createStarterLoop = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('loops')
        .insert({
          name: 'Morning Win',
          owner_id: user.id,
          loop_type: 'daily',
          color: Colors.light.primary,
          reset_rule: 'daily',
          next_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Insert starter tasks
      if (data) {
        const tasksToInsert = starterTasks.map((task, index) => ({
          loop_id: data.id,
          description: `${task.emoji} ${task.description}`,
          completed: task.completed,
          is_one_time: false,
          order_index: index,
        }));

        await supabase.from('tasks').insert(tasksToInsert);
      }

      return data;
    } catch {
      // Offline-first: queue for later
      await AsyncStorage.setItem('@doloop_pending_loop', JSON.stringify({
        name: 'Morning Win',
        tasks: starterTasks,
      }));
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      // Save onboarding data
      const onboardingData: OnboardingData = {
        userType,
        mainUse,
        vibe,
        completedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(onboardingData));

      // Create starter loop
      await createStarterLoop();

      // Navigate to loops
      navigation.replace('Home');
    } catch {
      // Error handled silently for production
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {showConfetti && (
        <ConfettiCannon
          count={80}
          origin={{ x: -10, y: 0 }}
          autoStart={true}
          fadeOut={true}
          colors={['#FFB800', '#00E5A2', '#FF6B6B']}
        />
      )}
      
      {/* Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="center"
        style={{ flex: 1 }}
        contentContainerStyle={{ flexDirection: 'row' }}
      >
        {/* SCREEN 1: WELCOME */}
        <OnboardingCard showSkip onSkip={() => navigation.replace('Home')}>
          <View style={[styles.welcomeContent, { maxWidth: 600, alignSelf: 'center' }]}>
            <DoLoopLogo size={126} color={colors.primary} showText={true} />
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Welcome to DoLoop!
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              Bee on Task.
            </Text>
            <View style={styles.beeContainer}>
              <BeeIcon size={100} />
            </View>

            <View style={styles.authButtons}>
              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.border }]}
                onPress={() => handleAuthPress('apple')}
                disabled={loading}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
              >
                <AppleLogo size={20} color="#000" />
                <Text style={[styles.authButtonTextDark, { color: colors.text, marginLeft: 12 }]}>
                  Continue with Apple
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.border }]}
                onPress={() => handleAuthPress('google')}
                disabled={loading}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                <GoogleLogo size={20} />
                <Text style={[styles.authButtonTextDark, { color: colors.text, marginLeft: 12 }]}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.border }]}
                onPress={() => handleAuthPress('email')}
                disabled={loading}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Continue with Email"
              >
                <Text style={{ fontSize: 20, marginRight: 12 }}>📧</Text>
                <Text style={[styles.authButtonTextDark, { color: colors.text }]}>
                  Continue with Email
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </OnboardingCard>

        {/* SCREEN 2: QUICK QUIZ */}
        <OnboardingCard
          title="Quick Quiz"
          onNext={() => scrollToScreen(2)}
          nextDisabled={!userType || !mainUse}
        >
          <View style={[styles.quizContent, { maxWidth: 600, alignSelf: 'center' }]}>
            {/* User Type */}
            <View style={styles.quizSection}>
              <Text style={[styles.quizQuestion, { color: colors.text }]}>
                Who are you?
              </Text>
              <View style={styles.iconRow}>
                <TouchableOpacity
                  style={[
                    styles.iconOption,
                    {
                      backgroundColor: userType === 'student' ? colors.primary : colors.surface,
                      borderColor: userType === 'student' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleUserTypeSelect('student')}
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: userType === 'student' }}
                  accessibilityLabel="Student"
                >
                  <Text style={styles.iconEmoji}>👨‍🎓</Text>
                  <Text style={[styles.iconLabel, { color: colors.text }]}>Student</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.iconOption,
                    {
                      backgroundColor: userType === 'pro' ? colors.primary : colors.surface,
                      borderColor: userType === 'pro' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleUserTypeSelect('pro')}
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: userType === 'pro' }}
                  accessibilityLabel="Professional"
                >
                  <Text style={styles.iconEmoji}>👩‍💼</Text>
                  <Text style={[styles.iconLabel, { color: colors.text }]}>Pro</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.iconOption,
                    {
                      backgroundColor: userType === 'parent' ? colors.primary : colors.surface,
                      borderColor: userType === 'parent' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleUserTypeSelect('parent')}
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: userType === 'parent' }}
                  accessibilityLabel="Parent"
                >
                  <Text style={styles.iconEmoji}>👨‍👩‍👧‍👦</Text>
                  <Text style={[styles.iconLabel, { color: colors.text }]}>Parent</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Use */}
            <View style={styles.quizSection}>
              <Text style={[styles.quizQuestion, { color: colors.text }]}>
                Main use?
              </Text>
              <View style={styles.useOptions}>
                {(['daily', 'shared', 'goals'] as MainUse[]).map((use) => (
                  <TouchableOpacity
                    key={use}
                    style={[
                      styles.useOption,
                      {
                        backgroundColor: mainUse === use ? colors.primary : colors.surface,
                        borderColor: mainUse === use ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleMainUseSelect(use)}
                    accessible={true}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: mainUse === use }}
                    accessibilityLabel={`${use} loops`}
                  >
                    <Text style={[styles.useLabel, { color: colors.text }]}>
                      {use.charAt(0).toUpperCase() + use.slice(1)} Loops
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </OnboardingCard>

        {/* SCREEN 3: VIBE PICKER */}
        <OnboardingCard
          title="Pick your style"
          subtitle="Swipe to browse styles, tap to select"
          onNext={() => scrollToScreen(3)}
          nextDisabled={!vibe}
          nextLabel="Select"
        >
          <View style={{ width: '100%', maxWidth: 960, alignSelf: 'center' }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              style={{ width: '100%' }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
            {(['playful', 'focus', 'family', 'pro'] as VibeStyle[]).map((vibeOption) => {
              const vibeConfig = {
                playful: { emoji: '🐝', bg: Colors.light.playful, accent: '#FF5252' },
                focus: { emoji: '🎯', bg: Colors.light.focus, accent: '#475569' },
                family: { emoji: '👨‍👩‍👧', bg: Colors.light.family, accent: '#FB923C' },
                pro: { emoji: '💼', bg: Colors.light.pro, accent: '#059669' },
              }[vibeOption];

              return (
                <TouchableOpacity
                  key={vibeOption}
                  style={[
                    styles.vibeCard,
                    {
                      backgroundColor: '#FFF',
                      borderWidth: vibe === vibeOption ? 3 : 1,
                      borderColor: vibe === vibeOption ? colors.primary : colors.border,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: vibe === vibeOption ? 0.15 : 0.05,
                      shadowRadius: vibe === vibeOption ? 12 : 4,
                      elevation: vibe === vibeOption ? 8 : 2,
                    },
                  ]}
                  onPress={() => handleVibeSelect(vibeOption)}
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: vibe === vibeOption }}
                  accessibilityLabel={`${vibeOption} style`}
                >
                  {/* Preview Header */}
                  <View style={[styles.vibePreviewHeader, { backgroundColor: vibeConfig.bg }]}>
                    <Text style={styles.vibeEmoji}>{vibeConfig.emoji}</Text>
                    <Text style={styles.vibeTitle}>{vibeOption.charAt(0).toUpperCase() + vibeOption.slice(1)}</Text>
                  </View>

                  {/* Preview List */}
                  <View style={styles.vibePreviewList}>
                    <View style={[styles.vibeTaskRow, { borderLeftColor: vibeConfig.accent }]}>
                      <View style={[styles.vibeCheckbox, { borderColor: vibeConfig.accent }]} />
                      <Text style={styles.vibeTaskText}>Morning routine</Text>
                    </View>
                    <View style={[styles.vibeTaskRow, { borderLeftColor: vibeConfig.accent }]}>
                      <View style={[styles.vibeCheckbox, { borderColor: vibeConfig.accent, backgroundColor: vibeConfig.accent }]}>
                        <Text style={{ color: '#FFF', fontSize: 10 }}>✓</Text>
                      </View>
                      <Text style={[styles.vibeTaskText, { opacity: 0.6 }]}>Check emails</Text>
                    </View>
                    <View style={[styles.vibeTaskRow, { borderLeftColor: vibeConfig.accent }]}>
                      <View style={[styles.vibeCheckbox, { borderColor: vibeConfig.accent }]} />
                      <Text style={styles.vibeTaskText}>Team meeting</Text>
                    </View>
                  </View>

                  {/* Selected Badge */}
                  {vibe === vibeOption && (
                    <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.selectedText}>✓ Selected</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            </ScrollView>
          </View>
        </OnboardingCard>

        {/* SCREEN 4: STARTER LOOP */}
        <OnboardingCard
          title='Your "Morning Win" Loop'
          onNext={completeOnboarding}
          nextDisabled={loading}
          nextLabel={loading ? 'Creating...' : "Let's Loop!"}
        >
          <View style={[styles.starterContent, { maxWidth: 600, alignSelf: 'center' }]}>
            <Text style={[styles.starterHint, { color: colors.textSecondary }]}>
              Check your first task to get started! 👇
            </Text>

            <View style={styles.taskList}>
              {starterTasks.map((task, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.taskItem,
                    {
                      backgroundColor: task.completed ? colors.success + '20' : colors.surface,
                      borderColor: task.completed ? colors.success : colors.border,
                    },
                  ]}
                  onPress={() => handleTaskCheck(index)}
                  accessible={true}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: task.completed }}
                  accessibilityLabel={`${task.emoji} ${task.description}`}
                  accessibilityHint="Double tap to toggle completion"
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: task.completed ? colors.success : 'transparent',
                        borderColor: task.completed ? colors.success : colors.border,
                      },
                    ]}
                  >
                    {task.completed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.taskEmoji]}>{task.emoji}</Text>
                  <Text
                    style={[
                      styles.taskText,
                      {
                        color: colors.text,
                        textDecorationLine: task.completed ? 'line-through' : 'none',
                        opacity: task.completed ? 0.6 : 1,
                      },
                    ]}
                  >
                    {task.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </OnboardingCard>
      </ScrollView>

      {/* Dot Indicators */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((index) => {
          const animatedStyle = useAnimatedStyle(() => {
            const inputRange = [
              (index - 1) * SCREEN_WIDTH,
              index * SCREEN_WIDTH,
              (index + 1) * SCREEN_WIDTH,
            ];
            const scale = interpolate(scrollX.value, inputRange, [0.8, 1.5, 0.8]);
            const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3]);

            return {
              transform: [{ scale }],
              opacity,
            };
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: colors.primary },
                animatedStyle,
              ]}
              accessible={true}
              accessibilityLabel={`Screen ${index + 1} of 4`}
              accessibilityRole="progressbar"
            />
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Welcome Screen
  welcomeContent: {
    alignItems: 'center',
    gap: 16,
  },
  beeContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    fontFamily: 'Inter_700Bold',
  },
  welcomeSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  authButtons: {
    width: '100%',
    gap: 12,
    marginTop: 20,
  },
  authButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  authButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  authButtonTextDark: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },

  // Quiz Screen
  quizContent: {
    width: '100%',
    gap: 48,
    paddingHorizontal: 0,
  },
  quizSection: {
    gap: 20,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  iconOption: {
    width: 110,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    minHeight: 130,
  },
  iconEmoji: {
    fontSize: 40,
  },
  iconLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
  useOptions: {
    gap: 12,
    alignItems: 'stretch',
  },
  useOption: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    minHeight: 56,
  },
  useLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },

  // Vibe Picker
  vibeScroll: {
    paddingHorizontal: 0,
  },
  vibeCard: {
  width: 220,
    height: 420,
    borderRadius: 20,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  marginHorizontal: 8,
  },
  vibePreviewHeader: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  vibeEmoji: {
    fontSize: 48,
  },
  vibeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
  },
  vibePreviewList: {
    padding: 20,
    gap: 12,
  },
  vibeTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 10,
    gap: 12,
    borderLeftWidth: 4,
  },
  vibeCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeTaskText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#1A1A1A',
  },
  selectedBadge: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  selectedText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },

  // Starter Loop
  starterContent: {
    width: '100%',
    gap: 24,
  },
  starterHint: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  taskList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  taskEmoji: {
    fontSize: 24,
  },
  taskText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'Inter_600SemiBold',
  },

  // Dot Indicators
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

