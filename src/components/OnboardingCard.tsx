import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
}

/**
 * Reusable Onboarding Card Component
 * - Full-screen snap scrolling
 * - Accessible labels
 * - Haptic feedback ready
 */
export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  children,
  title,
  subtitle,
  onNext,
  nextLabel = 'Next →',
  nextDisabled = false,
  showSkip = false,
  onSkip,
}) => {
  const { colors } = useTheme();

  const handleNext = () => {
    if (onNext && !nextDisabled) {
      AccessibilityInfo.announceForAccessibility('Moving to next screen');
      onNext();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      AccessibilityInfo.announceForAccessibility('Skipping onboarding');
      onSkip();
    }
  };

  return (
    <View
      style={[styles.card, { backgroundColor: colors.background }]}
      accessible={true}
      accessibilityRole="none"
    >
      {/* Skip button */}
      {showSkip && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          accessibilityHint="Skips the onboarding process"
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            Skip
          </Text>
        </TouchableOpacity>
      )}

      {/* Header */}
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && (
            <Text
              style={[styles.title, { color: colors.text }]}
              accessible={true}
              accessibilityRole="header"
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              accessible={true}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>{children}</View>

      {/* Next button */}
      {onNext && (
        <View style={[styles.footer, { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              {
                backgroundColor: nextDisabled ? colors.border : colors.primary,
              },
            ]}
            onPress={handleNext}
            disabled={nextDisabled}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            accessibilityState={{ disabled: nextDisabled }}
            accessibilityHint="Proceeds to the next onboarding step"
          >
            <Text
              style={[
                styles.nextButtonText,
                {
                  color: nextDisabled ? colors.textSecondary : '#000',
                },
              ]}
            >
              {nextLabel}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH,
    height: '100%',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    padding: 8,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter_600SemiBold',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: 'Inter_400Regular',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingTop: 24,
  },
  nextButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    fontFamily: 'Inter_700Bold',
  },
});

