import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../../App';
import { BeeIcon } from './native/BeeIcon';
import { useAdmin } from '../hooks/useAdmin';

type HeaderNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface HeaderProps {
  currentDate: string;
  streak?: number;
  colors: {
    text: string;
    textSecondary: string;
    border: string;
    accentYellow: string;
    primary: string;
  };
}

export const Header: React.FC<HeaderProps> = ({ currentDate, streak = 0, colors }) => {
  const navigation = useNavigation<HeaderNavigationProp>();
  const { isAdmin } = useAdmin();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return { text: 'Good morning!', emoji: '🌅' };
    } else if (hour < 17) {
      return { text: 'Good afternoon!', emoji: '☀️' };
    } else {
      return { text: 'Good evening!', emoji: '🌙' };
    }
  };

  const greeting = getGreeting();

  return (
    <View
      style={[
        styles.header,
        {
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.date,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        {currentDate}
      </Text>
      <View style={styles.greetingRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BeeIcon size={32} />
          <Text
            style={[
              styles.greeting,
              {
                color: colors.text,
              },
            ]}
          >
            {greeting.text} {greeting.emoji}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {streak > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: colors.accentYellow }]}>
              <Text style={styles.streakText}>
                🔥 {streak}
              </Text>
            </View>
          )}
          {isAdmin && (
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                navigation.navigate('AdminDashboard');
              }}
              style={styles.settingsButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Open admin dashboard"
            >
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  date: {
    fontSize: 16,
    marginBottom: 4,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  streakBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


