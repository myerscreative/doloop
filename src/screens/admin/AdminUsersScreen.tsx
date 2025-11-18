import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useTheme } from '../../contexts/ThemeContext';
import { useAdmin } from '../../hooks/useAdmin';
import { getUserSummary, UserSummary, toggleUserAdminStatus } from '../../lib/admin';

type AdminUsersNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminUsers'>;

interface Props {
  navigation: AdminUsersNavigationProp;
}

export function AdminUsersScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigation.navigate('Home');
    }
  }, [isAdmin, adminLoading, navigation]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getUserSummary();
    setUsers(data);
    setLoading(false);
  };

  const handleToggleAdmin = async (user: UserSummary) => {
    const newStatus = !user.is_admin;
    const action = newStatus ? 'grant' : 'revoke';

    if (Platform.OS === 'web') {
      if (!confirm(`Are you sure you want to ${action} admin access for ${user.email}?`)) return;
    } else {
      Alert.alert(
        'Toggle Admin',
        `Are you sure you want to ${action} admin access for ${user.email}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                await toggleUserAdminStatus(user.id, newStatus);
                Alert.alert('Success', `Admin status updated for ${user.email}`);
                loadUsers();
              } catch (error) {
                Alert.alert('Error', 'Failed to update admin status');
              }
            },
          },
        ]
      );
      return;
    }

    try {
      await toggleUserAdminStatus(user.id, newStatus);
      alert(`Admin status updated for ${user.email}`);
      loadUsers();
    } catch (error) {
      alert('Failed to update admin status');
    }
  };

  if (adminLoading || !isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const renderUser = ({ item }: { item: UserSummary }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
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
          style={[styles.userCard, { backgroundColor: colors.card }]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.95}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        >
          <View style={styles.userContent}>
            <View style={styles.userInfo}>
              <View style={styles.userHeader}>
                <Text style={[styles.userEmail, { color: colors.text }]}>{item.email}</Text>
                {item.is_admin && (
                  <View style={[styles.adminBadge, { backgroundColor: colors.primary + '30' }]}>
                    <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                    <Text style={[styles.adminBadgeText, { color: colors.primary }]}>Admin</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
                Joined: {formatDate(item.created_at)}
              </Text>
              <View style={styles.userStats}>
                <Text style={[styles.userStat, { color: colors.textSecondary }]}>
                  {item.loop_count} loops • {item.task_count} tasks • {item.templates_used} templates
                </Text>
              </View>
              <Text style={[styles.userActivity, { color: colors.textSecondary }]}>
                Last activity: {formatDate(item.last_activity)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.adminButton, { backgroundColor: item.is_admin ? '#FF1E88' : colors.primary }]}
              onPress={(e) => {
                e.stopPropagation();
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                handleToggleAdmin(item);
              }}
            >
              <Ionicons
                name={item.is_admin ? 'shield-outline' : 'shield-checkmark-outline'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
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
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            navigation.goBack();
          }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>User Management</Text>
          <TouchableOpacity onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            loadUsers();
          }}>
            <Ionicons name="refresh" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Stats Summary */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{users.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Users</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {users.filter(u => u.is_admin).length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Admins</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {users.filter(u => new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>New (30d)</Text>
          </View>
        </View>

        {/* Users List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
              </View>
            }
          />
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    flex: 1,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  userCard: {
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
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
  userContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  adminBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  userMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  userStats: {
    marginBottom: 4,
  },
  userStat: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  userActivity: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  adminButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
