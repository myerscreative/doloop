/**
 * DoLoop Onboarding Flow
 * 2-screen carousel with snap scrolling, dot indicators
 * - Screen 1: Welcome + Auth
 * - Screen 2: Quick Quiz (user type & main use) -> goes directly to Template Library
 *
 * Note: Theme selection removed from onboarding - defaults to 'playful' (gold/bee theme)
 * Theme customization available in Settings after onboarding
 * Note: Starter loop creation removed - users go directly to template library
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Rect, Polyline } from 'react-native-svg';

import { RootStackParamList } from '../../App';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { OnboardingCard } from '../components/OnboardingCard';
import { BeeIcon } from '../components/native/BeeIcon';
import { DoLoopLogo } from '../components/native/DoLoopLogo';
import { AppleLogo } from '../components/native/AppleLogo';
import { GoogleLogo } from '../components/native/GoogleLogo';
import { Colors } from '../constants/Colors';
import {
  UserType,
  MainUse,
  UseCase,
  VibeStyle,
  OnboardingData,
} from '../types/onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = '@doloop_onboarded';

type OnboardingNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Custom Icon Components for Quiz Screen
const BookIcon = ({ size = 48, color = '#1a1a1a' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BriefcaseIcon = ({ size = 48, color = '#1a1a1a' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x={2}
      y={7}
      width={20}
      height={14}
      rx={2}
      ry={2}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HomeIcon = ({ size = 48, color = '#1a1a1a' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="9 22 9 12 15 12 15 22"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const OnboardingScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<OnboardingNavigationProp>();
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Onboarding data
  const [userType, setUserType] = useState<UserType>();
  const [mainUse, setMainUse] = useState<MainUse>();
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  // Vibe removed from onboarding - default to 'playful' (gold/bee theme)
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

  const handleUseCaseToggle = (useCase: UseCase) => {
    if (useCases.includes(useCase)) {
      setUseCases(useCases.filter((id) => id !== useCase));
    } else {
      setUseCases([...useCases, useCase]);
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    AccessibilityInfo.announceForAccessibility(
      useCases.includes(useCase) ? `Deselected ${useCase}` : `Selected ${useCase}`
    );
  };

  // Vibe selection removed from onboarding - default to 'playful' (gold/bee theme)


  const completeOnboarding = async () => {
    setLoading(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      // Save onboarding data
      // Default vibe to 'playful' (gold/bee theme) for all new users
      const onboardingData: OnboardingData = {
        userType,
        mainUse, // Legacy - keep for backward compatibility
        useCases, // New multi-select
        vibe: 'playful', // Default to gold/bee theme
        completedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(onboardingData));

      // Navigate to template library
      navigation.replace('TemplateLibrary');
    } catch {
      // Error handled silently for production
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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

        {/* SCREEN 2: QUICK QUIZ - IMPROVED */}
        <LinearGradient
          colors={['#fef9e7', '#fff5d7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: SCREEN_WIDTH, height: '100%' }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Floating Bee Decoration */}
            <View style={styles.beeDecoration}>
              <BeeIcon size={40} />
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.quizScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.quizHeader}>
                <Text style={styles.quizTitle}>Quick Quiz</Text>
                <Text style={styles.quizSubtitle}>Help us personalize your experience</Text>
              </View>

              {/* Content */}
              <View style={styles.quizContent}>
                {/* Question 1: Who are you? */}
                <View style={styles.questionSection}>
                  <Text style={styles.questionLabel}>Who are you?</Text>
                  <View style={styles.optionsGrid}>
                    {[
                      { id: 'student' as UserType, label: 'Student', icon: BookIcon },
                      { id: 'pro' as UserType, label: 'Pro', icon: BriefcaseIcon },
                      { id: 'parent' as UserType, label: 'Parent', icon: HomeIcon },
                    ].map((option) => {
                      const isSelected = userType === option.id;
                      const IconComponent = option.icon;
                      return (
                        <TouchableOpacity
                          key={option.id}
                          onPress={() => handleUserTypeSelect(option.id)}
                          activeOpacity={0.8}
                          accessible={true}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: isSelected }}
                          accessibilityLabel={option.label}
                        >
                          {isSelected ? (
                            <LinearGradient
                              colors={['#FFD700', '#FFA500']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.optionCardSelected}
                            >
                              <View style={styles.optionIcon}>
                                <IconComponent size={48} color="#000" />
                              </View>
                              <Text style={styles.optionLabelSelected}>{option.label}</Text>
                            </LinearGradient>
                          ) : (
                            <View style={styles.optionCard}>
                              <View style={styles.optionIcon}>
                                <IconComponent size={48} color="#1a1a1a" />
                              </View>
                              <Text style={styles.optionLabel}>{option.label}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Question 2: Where do you want to start? */}
                <View style={styles.questionSection}>
                  <Text style={styles.questionLabel}>Where do you want to start?</Text>
                  <View style={styles.checkboxGroup}>
                    {[
                      {
                        id: 'checklist' as UseCase,
                        label: 'Remember important tasks & checklists',
                        subtitle: 'Packing list, leaving house, pre-flight',
                        icon: 'checkmark-circle-outline' as const,
                      },
                      {
                        id: 'routines' as UseCase,
                        label: 'Build daily habits & routines',
                        subtitle: 'Morning routine, exercise, meditation',
                        icon: 'sunny-outline' as const,
                      },
                      {
                        id: 'goals' as UseCase,
                        label: 'Achieve long-term goals',
                        subtitle: 'Learn Spanish, get fit, save money',
                        icon: 'analytics-outline' as const,
                      },
                    ].map((option) => {
                      const isSelected = useCases.includes(option.id);
                      return (
                        <TouchableOpacity
                          key={option.id}
                          onPress={() => handleUseCaseToggle(option.id)}
                          activeOpacity={0.7}
                          accessible={true}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isSelected }}
                          accessibilityLabel={option.label}
                        >
                          <View
                            style={[
                              styles.checkboxOption,
                              isSelected && styles.checkboxOptionSelected,
                            ]}
                          >
                            <View
                              style={[
                                styles.checkboxIcon,
                                isSelected && styles.checkboxIconSelected,
                              ]}
                            >
                              {isSelected && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                            <View style={styles.checkboxIconWrapper}>
                              <Ionicons
                                name={option.icon}
                                size={24}
                                color={isSelected ? '#FFB800' : '#666'}
                              />
                            </View>
                            <View style={styles.checkboxContent}>
                              <Text style={styles.checkboxLabel}>{option.label}</Text>
                              <Text style={styles.checkboxSubtitle}>{option.subtitle}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Spacer for fixed footer */}
              <View style={{ height: 120 }} />
            </ScrollView>

            {/* Fixed Footer */}
            <View style={styles.quizFooter}>
              <View style={styles.quizFooterContent}>
                <TouchableOpacity
                  onPress={completeOnboarding}
                  disabled={!userType || useCases.length === 0}
                  activeOpacity={0.8}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !userType || useCases.length === 0 }}
                  accessibilityLabel="Get Started"
                >
                  {userType && useCases.length > 0 ? (
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.nextButton}
                    >
                      <Text style={styles.nextButtonText}>Get Started</Text>
                      <Ionicons name="arrow-forward" size={20} color="#000" />
                    </LinearGradient>
                  ) : (
                    <View style={styles.nextButtonInactive}>
                      <Text style={styles.nextButtonTextInactive}>Get Started</Text>
                      <Ionicons name="arrow-forward" size={20} color="#999" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Progress Dots */}
                <View style={styles.progressDots}>
                  {[0, 1].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === 1 && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

      </ScrollView>

      {/* Dot Indicators */}
      <View style={styles.dotsContainer}>
        {[0, 1].map((index) => {
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
              accessibilityLabel={`Screen ${index + 1} of 2`}
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

  // Quiz Screen - Improved
  beeDecoration: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    opacity: 0.6,
  },
  quizScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  quizHeader: {
    alignItems: 'center',
    marginBottom: 48,
    width: '100%',
    maxWidth: 600,
  },
  quizTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  quizSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
  },
  quizContent: {
    gap: 40,
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
  },
  questionSection: {
    gap: 20,
    width: '100%',
    alignItems: 'center',
  },
  questionLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#e5e5e5',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  optionCardSelected: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  optionIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    fontFamily: 'Inter_600SemiBold',
  },
  optionLabelSelected: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Inter_600SemiBold',
  },
  checkboxGroup: {
    gap: 12,
    width: '100%',
    alignItems: 'stretch',
  },
  checkboxOption: {
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#e5e5e5',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  checkboxOptionSelected: {
    borderColor: '#FFB800',
    backgroundColor: '#fff9e6',
  },
  checkboxIcon: {
    width: 28,
    height: 28,
    borderWidth: 3,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxIconSelected: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  checkboxIconWrapper: {
    width: 24,
    height: 24,
  },
  checkboxContent: {
    flex: 1,
    gap: 4,
    alignItems: 'flex-start',
  },
  checkboxLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'left',
  },
  checkboxSubtitle: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
    textAlign: 'left',
  },
  quizFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  quizFooterContent: {
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Inter_700Bold',
  },
  nextButtonInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: '#e5e5e5',
  },
  nextButtonTextInactive: {
    fontSize: 18,
    fontWeight: '700',
    color: '#999',
    fontFamily: 'Inter_700Bold',
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e5e5e5',
  },
  dotActive: {
    width: 28,
    backgroundColor: '#FFB800',
  },
  // Legacy Quiz Screen (keeping for reference)
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

