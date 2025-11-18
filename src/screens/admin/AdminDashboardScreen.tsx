import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useTheme } from '../../contexts/ThemeContext';
import { useAdmin } from '../../hooks/useAdmin';
import { getAdminDashboardStats, DashboardStats } from '../../lib/admin';
import { AdminHelpModal } from '../../components/AdminHelpModal';
import { ADMIN_HELP_CONTENT } from '../../constants/adminHelp';

type AdminDashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminDashboard'>;

interface Props {
  navigation: AdminDashboardNavigationProp;
}

export function AdminDashboardScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      // Not an admin, redirect to home
      navigation.navigate('Home');
    }
  }, [isAdmin, adminLoading, navigation]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const data = await getAdminDashboardStats();
    setStats(data);
    setLoading(false);
  };

  if (adminLoading || !isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const menuItems = [
    {
      title: 'Templates',
      icon: 'albums-outline' as const,
      screen: 'AdminTemplates' as const,
      color: '#667eea',
      description: 'Manage loop templates',
    },
    {
      title: 'Creators',
      icon: 'people-outline' as const,
      screen: 'AdminCreators' as const,
      color: '#FEC041',
      description: 'Manage template creators',
    },
    {
      title: 'Users',
      icon: 'person-outline' as const,
      screen: 'AdminUsers' as const,
      color: '#2EC4B6',
      description: 'View and manage users',
    },
    {
      title: 'Affiliates',
      icon: 'link-outline' as const,
      screen: 'AdminAffiliates' as const,
      color: '#FF1E88',
      description: 'Track affiliate performance',
    },
  ];

  const StatCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: keyof typeof Ionicons.glyphMap; color: string }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  const MenuItem = ({ item }: { item: typeof menuItems[0] }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card }]}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            navigation.navigate(item.screen as any);
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[item.color + '30', item.color + '10']}
            style={styles.menuIconContainer}
          >
            <Ionicons name={item.icon} size={32} color={item.color} />
          </LinearGradient>
          <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={colors.statusBar} />
      <View style={{
        flex: 1,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
        backgroundColor: colors.background,
      }}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              navigation.goBack();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Dashboard</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowHelpModal(true);
              }}
              style={styles.helpButton}
            >
              <Ionicons name="help-circle-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                loadStats();
              }}
            >
              <Ionicons name="refresh" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : stats ? (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Users"
                value={stats.total_users.toLocaleString()}
                icon="people"
                color="#667eea"
              />
              <StatCard
                title="New Users (30d)"
                value={stats.new_users_30d.toLocaleString()}
                icon="person-add"
                color="#2EC4B6"
              />
              <StatCard
                title="Total Loops"
                value={stats.total_loops.toLocaleString()}
                icon="infinite"
                color="#FEC041"
              />
              <StatCard
                title="Templates"
                value={stats.total_templates.toLocaleString()}
                icon="albums"
                color="#9B51E0"
              />
            </View>

            {/* Affiliate Stats */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Affiliate Performance</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Clicks"
                value={stats.total_affiliate_clicks.toLocaleString()}
                icon="link"
                color="#FF1E88"
              />
              <StatCard
                title="Conversions"
                value={stats.total_conversions.toLocaleString()}
                icon="checkmark-circle"
                color="#4CAF50"
              />
              <StatCard
                title="Conversion Rate"
                value={
                  stats.total_affiliate_clicks > 0
                    ? `${((stats.total_conversions / stats.total_affiliate_clicks) * 100).toFixed(1)}%`
                    : '0%'
                }
                icon="trending-up"
                color="#FFA726"
              />
              <StatCard
                title="Total Revenue"
                value={`$${stats.total_revenue.toFixed(2)}`}
                icon="cash"
                color="#4CAF50"
              />
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              Failed to load statistics
            </Text>
          </View>
        )}

        {/* Management Menu */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>Management</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <MenuItem key={index} item={item} />
          ))}
        </View>
      </ScrollView>

      {/* Help Modal */}
      <AdminHelpModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        content={ADMIN_HELP_CONTENT.dashboard}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 150 : '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  menuItem: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 200 : '47%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  menuIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
