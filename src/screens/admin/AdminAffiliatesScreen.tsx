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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useTheme } from '../../contexts/ThemeContext';
import { useAdmin } from '../../hooks/useAdmin';
import { getTemplatePerformance, TemplatePerformance } from '../../lib/admin';
import { AdminHelpModal } from '../../components/AdminHelpModal';
import { ADMIN_HELP_CONTENT } from '../../constants/adminHelp';

type AdminAffiliatesNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminAffiliates'>;

interface Props {
  navigation: AdminAffiliatesNavigationProp;
}

type SortKey = 'clicks' | 'conversions' | 'revenue' | 'rate';

export function AdminAffiliatesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [templates, setTemplates] = useState<TemplatePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('clicks');
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigation.navigate('Home');
    }
  }, [isAdmin, adminLoading, navigation]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getTemplatePerformance();
    setTemplates(data);
    setLoading(false);
  };

  const sortedTemplates = React.useMemo(() => {
    return [...templates].sort((a, b) => {
      switch (sortBy) {
        case 'clicks':
          return b.affiliate_clicks - a.affiliate_clicks;
        case 'conversions':
          return b.affiliate_conversions - a.affiliate_conversions;
        case 'revenue':
          return b.affiliate_revenue - a.affiliate_revenue;
        case 'rate':
          const rateA = a.affiliate_clicks > 0 ? (a.affiliate_conversions / a.affiliate_clicks) : 0;
          const rateB = b.affiliate_clicks > 0 ? (b.affiliate_conversions / b.affiliate_clicks) : 0;
          return rateB - rateA;
        default:
          return 0;
      }
    });
  }, [templates, sortBy]);

  const totalClicks = templates.reduce((sum, t) => sum + t.affiliate_clicks, 0);
  const totalConversions = templates.reduce((sum, t) => sum + t.affiliate_conversions, 0);
  const totalRevenue = templates.reduce((sum, t) => sum + t.affiliate_revenue, 0);
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  if (adminLoading || !isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const AffiliateCard = React.memo(({ item }: { item: TemplatePerformance }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    const convRate = item.affiliate_clicks > 0
      ? ((item.affiliate_conversions / item.affiliate_clicks) * 100).toFixed(1)
      : '0.0';

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
          style={[styles.templateCard, { backgroundColor: colors.card }]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.95}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        >
          <View style={styles.templateHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.templateTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.templateCreator, { color: colors.textSecondary }]}>
                by {item.creator_name}
              </Text>
            </View>
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Ionicons name="link" size={16} color={colors.primary} />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {item.affiliate_clicks}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Clicks</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {item.affiliate_conversions}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Conversions</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="trending-up" size={16} color="#FFA726" />
              <Text style={[styles.metricValue, { color: colors.text }]}>{convRate}%</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Rate</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="cash" size={16} color="#4CAF50" />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                ${item.affiliate_revenue.toFixed(2)}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Revenue</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  });

  const renderTemplate = ({ item }: { item: TemplatePerformance }) => <AffiliateCard item={item} />;

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Affiliate Performance</Text>
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
            <TouchableOpacity onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              loadData();
            }}>
              <Ionicons name="refresh" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Ionicons name="link" size={24} color={colors.primary} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {totalClicks.toLocaleString()}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Clicks</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {totalConversions.toLocaleString()}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Conversions</Text>
          </View>
        </View>
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Ionicons name="trending-up" size={24} color="#FFA726" />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {conversionRate.toFixed(1)}%
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Conversion Rate</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Ionicons name="cash" size={24} color="#4CAF50" />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              ${totalRevenue.toFixed(2)}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Revenue</Text>
          </View>
        </View>

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sort by:</Text>
          <View style={styles.sortButtons}>
            {[
              { key: 'clicks' as SortKey, label: 'Clicks' },
              { key: 'conversions' as SortKey, label: 'Conversions' },
              { key: 'rate' as SortKey, label: 'Rate' },
              { key: 'revenue' as SortKey, label: 'Revenue' },
            ].map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortButton,
                  {
                    backgroundColor: sortBy === option.key ? colors.primary : colors.card,
                  },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.selectionAsync();
                  }
                  setSortBy(option.key);
                }}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    { color: sortBy === option.key ? '#fff' : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Templates List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={sortedTemplates}
            renderItem={renderTemplate}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No affiliate data yet
                </Text>
              </View>
            }
          />
        )}

        {/* Help Modal */}
        <AdminHelpModal
          visible={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          content={ADMIN_HELP_CONTENT.affiliates}
        />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpButton: {
    padding: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
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
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  sortContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sortLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sortButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  templateCard: {
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
  templateHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  templateTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  templateCreator: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
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
