import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Share,
  Alert,
  Image,
  Animated,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { supabase } from '../lib/supabase';
import { LoopTemplateWithDetails } from '../types/loop';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type TemplateLibraryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TemplateLibrary'
>;

interface Props {
  navigation: TemplateLibraryScreenNavigationProp;
}

type TabType = 'browse' | 'mylibrary' | 'favorites';

// Skeleton loader component
const SkeletonCard = () => {
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.templateCard}>
      <Animated.View style={[styles.skeletonBar, { opacity }]} />
      <View style={styles.cardContent}>
        <Animated.View style={[styles.skeletonTitle, { opacity }]} />
        <Animated.View style={[styles.skeletonText, { opacity, width: '60%', marginTop: 8 }]} />
        <Animated.View style={[styles.skeletonText, { opacity, width: '40%', marginTop: 4 }]} />
        <Animated.View style={[styles.skeletonText, { opacity, marginTop: 12 }]} />
        <Animated.View style={[styles.skeletonText, { opacity, width: '80%' }]} />
      </View>
    </View>
  );
};

export function TemplateLibraryScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [templates, setTemplates] = useState<LoopTemplateWithDetails[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<LoopTemplateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('browse');

  useEffect(() => {
    fetchTemplates();
  }, [activeTab]);

  useEffect(() => {
    filterTemplates();
  }, [searchQuery, selectedCategory, templates, activeTab]);

  const fetchTemplates = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: templateData, error: templateError } = await supabase
        .from('loop_templates')
        .select(`
          *,
          creator:template_creators(*),
          tasks:template_tasks(*)
        `)
        .order('is_featured', { ascending: false })
        .order('popularity_score', { ascending: false });

      if (templateError) throw templateError;

      const { data: favoritesData } = await supabase
        .from('template_favorites')
        .select('template_id')
        .eq('user_id', user.id);

      const favoriteIds = new Set(favoritesData?.map(f => f.template_id) || []);

      const { data: usageData } = await supabase
        .from('user_template_usage')
        .select('template_id')
        .eq('user_id', user.id);

      const addedIds = new Set(usageData?.map(u => u.template_id) || []);

      const { data: ratingsData } = await supabase
        .from('template_reviews')
        .select('template_id, rating')
        .eq('user_id', user.id);

      const userRatings = new Map(ratingsData?.map(r => [r.template_id, r.rating]) || []);

      const templatesWithDetails: LoopTemplateWithDetails[] = (templateData || []).map((template: any) => ({
        ...template,
        creator: Array.isArray(template.creator) ? template.creator[0] : template.creator,
        tasks: template.tasks || [],
        taskCount: template.tasks?.length || 0,
        isFavorite: favoriteIds.has(template.id),
        isAdded: addedIds.has(template.id),
        userRating: userRatings.get(template.id),
        average_rating: template.average_rating || 0,
        review_count: template.review_count || 0,
      }));

      setTemplates(templatesWithDetails);
      setFilteredTemplates(templatesWithDetails);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    if (activeTab === 'mylibrary') {
      filtered = filtered.filter(t => t.isAdded);
    } else if (activeTab === 'favorites') {
      filtered = filtered.filter(t => t.isFavorite);
    }

    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.creator.name.toLowerCase().includes(query) ||
          t.book_course_title.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const toggleFavorite = async (templateId: string, currentlyFavorited: boolean) => {
    if (!user) return;

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      if (currentlyFavorited) {
        await supabase
          .from('template_favorites')
          .delete()
          .eq('template_id', templateId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('template_favorites')
          .insert([{ template_id: templateId, user_id: user.id }]);
      }

      await fetchTemplates();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const shareTemplate = async (template: LoopTemplateWithDetails) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await Share.share({
        message: `Check out this loop template: "${template.title}" by ${template.creator.name}. Based on "${template.book_course_title}". Add it to your DoLoop app!`,
        title: template.title,
      });
    } catch (error) {
      console.error('Error sharing template:', error);
    }
  };

  const TemplateCard = ({ item }: { item: LoopTemplateWithDetails }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    const favoriteScale = React.useRef(new Animated.Value(1)).current;

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

    const animateFavorite = () => {
      Animated.sequence([
        Animated.timing(favoriteScale, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(favoriteScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    };

    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={styles.loopCard}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            navigation.navigate('TemplateDetail', { templateId: item.id });
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
        >
          <View style={styles.loopCardHeader}>
            {item.is_featured && (
              <LinearGradient
                colors={[colors.accentYellow, '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featuredBadgeSmall}
              >
                <Text style={styles.featuredBadgeText}>⭐ FEATURED</Text>
              </LinearGradient>
            )}
            {!item.is_featured && <View />}
            <Animated.View style={{ transform: [{ scale: favoriteScale }] }}>
              <TouchableOpacity
                style={[
                  styles.favoriteButton,
                  item.isFavorite && styles.favoriteButtonActive,
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  animateFavorite();
                  toggleFavorite(item.id, item.isFavorite || false);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={item.isFavorite ? 'heart' : 'heart-outline'}
                  size={18}
                  color={item.isFavorite ? '#ff4444' : '#999'}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Text style={styles.loopTitle}>{item.title}</Text>
          <Text style={styles.loopSubtitleSmall}>
            From: {item.book_course_title}
          </Text>
          <Text style={styles.loopDescription}>{item.description}</Text>

          <View style={styles.loopFooter}>
            <View style={styles.loopStats}>
              <View style={styles.loopStat}>
                <Text style={styles.loopStatValue}>{item.taskCount}</Text>
                <Text style={styles.loopStatLabel}> tasks</Text>
              </View>
              <View style={styles.loopStat}>
                <Text style={[styles.loopStatValue, styles.loopStatValueGold]}>
                  {item.popularity_score}
                </Text>
                <Text style={styles.loopStatLabel}> uses</Text>
              </View>
            </View>
            <View style={styles.loopCategory}>
              <Text style={styles.loopCategoryText}>
                {getCategoryIcon(item.category)} {item.category}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      personal: '🏡',
      work: '💼',
      daily: '☀️',
      shared: '👥',
    };
    return icons[category] || '📋';
  };

  const categories = [
    { id: null, label: 'All', icon: '⭐' },
    { id: 'personal', label: 'Personal', icon: '🌱' },
    { id: 'work', label: 'Work', icon: '💼' },
    { id: 'daily', label: 'Daily', icon: '☀️' },
    { id: 'shared', label: 'Shared', icon: '👥' },
  ];

  const tabs = [
    { id: 'browse' as TabType, label: 'Browse', icon: '📚' },
    { id: 'mylibrary' as TabType, label: 'My Library', icon: '📖' },
    { id: 'favorites' as TabType, label: 'Favorites', icon: '❤️' },
  ];

  const handleTabPress = (tabId: TabType) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setActiveTab(tabId);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar barStyle="dark-content" />
      <View style={{
        flex: 1,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
        backgroundColor: '#f5f5f5',
      }}>

        {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              navigation.goBack();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.pageTitle}>Loop Library</Text>
            <Text style={styles.pageSubtitle}>Discover loops from the best</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => handleTabPress(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.id && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
              {activeTab === tab.id && (
                <LinearGradient
                  colors={[colors.accentYellow, '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabIndicator}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates, creators, books..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {categories.map((filter) => (
            <TouchableOpacity
              key={filter.id || 'all'}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
                setSelectedCategory(filter.id);
              }}
            >
              {selectedCategory === filter.id ? (
                <LinearGradient
                  colors={[colors.accentYellow, '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.filterChipActive}
                >
                  <Text style={styles.filterChipTextActive}>
                    {filter.icon} {filter.label}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>
                    {filter.icon} {filter.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Templates List */}
      {loading ? (
        <View style={styles.content}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : filteredTemplates.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>
            {activeTab === 'mylibrary' ? '📖' : activeTab === 'favorites' ? '💜' : '🔍'}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'mylibrary'
              ? 'No templates yet'
              : activeTab === 'favorites'
              ? 'No favorites yet'
              : 'No templates found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'mylibrary'
              ? 'Browse templates and add them to your library'
              : activeTab === 'favorites'
              ? 'Tap the heart to save your favorites'
              : searchQuery
              ? 'Try a different search term'
              : 'Check back soon for new templates'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTemplates}
          renderItem={({ item }) => <TemplateCard item={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  // Header
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#999',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    paddingBottom: 12,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  tabLabelActive: {
    color: '#1a1a1a',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  // Search
  searchSection: {
    padding: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  searchInput: {
    paddingVertical: 14,
    paddingLeft: 44,
    paddingRight: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
    color: '#1a1a1a',
  },

  // Filters
  filtersSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    backgroundColor: '#ffffff',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterChipActive: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  filterChipTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },

  // Content
  content: {
    padding: 20,
    gap: 16,
  },

  // Loop Card
  loopCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  loopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featuredBadgeSmall: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButtonActive: {
    backgroundColor: '#ffe5e5',
  },
  loopTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
    lineHeight: 23,
  },
  loopSubtitleSmall: {
    fontSize: 13,
    color: '#0066cc',
    marginBottom: 8,
  },
  loopDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
    marginBottom: 16,
  },
  loopFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loopStats: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  loopStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loopStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  loopStatValueGold: {
    color: '#FFB800',
  },
  loopStatLabel: {
    fontSize: 13,
    color: '#999',
  },
  loopCategory: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  loopCategoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },

  // Skeleton styles
  templateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
  },
  skeletonBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  skeletonTitle: {
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
