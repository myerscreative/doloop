/**
 * Settings Screen
 * Theme customization and app settings
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { RootStackParamList } from '../../App';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { VibeStyle } from '../types/onboarding';
import { Colors } from '../constants/Colors';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export const SettingsScreen: React.FC = () => {
  const { colors, vibe, setVibe } = useTheme();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigation = useNavigation<SettingsScreenNavigationProp>();

  const vibeOptions: Array<{ id: VibeStyle; label: string; emoji: string; description: string }> = [
    { id: 'playful', label: 'Playful', emoji: '🐝', description: 'Gold & bee theme (default)' },
    { id: 'focus', label: 'Focus', emoji: '🎯', description: 'Slate & professional' },
    { id: 'family', label: 'Family', emoji: '👨‍👩‍👧', description: 'Warm & friendly' },
    { id: 'pro', label: 'Pro', emoji: '💼', description: 'Mint & modern' },
  ];

  const handleVibeSelect = async (selectedVibe: VibeStyle) => {
    await setVibe(selectedVibe);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Theme & Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme & Appearance</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Choose a theme that matches your style
          </Text>

          <View style={styles.vibeGrid}>
            {vibeOptions.map((option) => {
              const isSelected = vibe === option.id;
              const vibeConfig = {
                playful: { bg: Colors.light.playful, accent: '#FF5252' },
                focus: { bg: Colors.light.focus, accent: '#475569' },
                family: { bg: Colors.light.family, accent: '#FB923C' },
                pro: { bg: Colors.light.pro, accent: '#059669' },
              }[option.id];

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.vibeCard,
                    {
                      backgroundColor: colors.surface,
                      borderWidth: isSelected ? 3 : 1,
                      borderColor: isSelected ? colors.primary : colors.border,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isSelected ? 0.15 : 0.05,
                      shadowRadius: isSelected ? 8 : 4,
                      elevation: isSelected ? 6 : 2,
                    },
                  ]}
                  onPress={() => handleVibeSelect(option.id)}
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`${option.label} theme`}
                >
                  {/* Preview Header */}
                  <View style={[styles.vibePreviewHeader, { backgroundColor: vibeConfig.bg }]}>
                    <Text style={styles.vibeEmoji}>{option.emoji}</Text>
                    <Text style={styles.vibeTitle}>{option.label}</Text>
                  </View>

                  {/* Description */}
                  <View style={styles.vibeContent}>
                    <Text style={[styles.vibeDescription, { color: colors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>

                  {/* Selected Badge */}
                  {isSelected && (
                    <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.selectedText}>✓ Selected</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Admin Section - Only visible to admins */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Admin</Text>
            <TouchableOpacity
              style={[styles.adminButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('AdminDashboard')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Open Admin Dashboard"
            >
              <Ionicons name="shield-checkmark" size={24} color="#fff" />
              <Text style={styles.adminButtonText}>Admin Dashboard</Text>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          {user?.email && (
            <View style={[styles.accountRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>Email</Text>
              <Text style={[styles.accountValue, { color: colors.text }]}>{user.email}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.signOutButton, { borderColor: colors.border }]}
            onPress={signOut}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Inter_700Bold',
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 20,
    fontFamily: 'Inter_400Regular',
  },
  vibeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vibeCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 180,
  },
  vibePreviewHeader: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  vibeEmoji: {
    fontSize: 32,
  },
  vibeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
  },
  vibeContent: {
    padding: 12,
  },
  vibeDescription: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  selectedBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  selectedText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  accountLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  accountValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  signOutButton: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  adminButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
});

