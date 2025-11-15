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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { supabase } from '../lib/supabase';
import { LoopTemplateWithDetails } from '../types/loop';
import { useAuth } from '../contexts/AuthContext';

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

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text key={star} style={styles.star}>
            {star <= Math.round(rating) ? '★' : '☆'}
          </Text>
        ))}
      </View>
    );
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
          style={styles.templateCard}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            navigation.navigate('TemplateDetail', { templateId: item.id });
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {/* Color accent bar */}
          <View style={[styles.colorAccent, { backgroundColor: item.color }]} />

          <View style={styles.cardContentNew}>
            {/* Header with Creator Avatar & Favorite */}
            <View style={styles.cardHeader}>
              <View style={styles.creatorRow}>
                {item.creator.photo_url ? (
                  <Image
                    source={{ uri: item.creator.photo_url }}
                    style={styles.creatorAvatar}
                  />
                ) : (
                  <View style={[styles.creatorAvatar, styles.creatorAvatarPlaceholder]}>
                    <Text style={styles.creatorInitial}>
                      {item.creator.name.charAt(0)}
                    </Text>
                  </View>
                )}
                <View style={styles.creatorInfo}>
                  <Text style={styles.creatorNameNew}>{item.creator.name}</Text>
                  <Text style={styles.bookTitleNew}>{item.book_course_title}</Text>
                </View>
              </View>

              <Animated.View style={{ transform: [{ scale: favoriteScale }] }}>
                <TouchableOpacity
                  style={styles.favoriteButtonNew}
                  onPress={(e) => {
                    e.stopPropagation();
                    animateFavorite();
                    toggleFavorite(item.id, item.isFavorite || false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.favoriteIconNew}>
                    {item.isFavorite ? '❤️' : '🤍'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Title */}
            <Text style={styles.templateTitleNew}>{item.title}</Text>

            {/* Rating - Only show if has reviews */}
            {item.review_count > 0 && (
              <View style={styles.ratingRowNew}>
                {renderStars(item.average_rating)}
                <Text style={styles.ratingTextNew}>
                  {item.average_rating.toFixed(1)}
                </Text>
                <Text style={styles.reviewCount}>({item.review_count})</Text>
              </View>
            )}

            {/* Description */}
            <Text style={styles.descriptionNew} numberOfLines={2}>
              {item.description}
            </Text>

            {/* Footer with Stats & Badges */}
            <View style={styles.cardFooter}>
              <View style={styles.statsRowNew}>
                <View style={styles.statBadge}>
                  <Text style={styles.statIcon}>📋</Text>
                  <Text style={styles.statText}>{item.taskCount}</Text>
                </View>
                <View style={styles.statBadge}>
                  <Text style={styles.statIcon}>👥</Text>
                  <Text style={styles.statText}>{item.popularity_score}</Text>
                </View>
              </View>

              <View style={styles.badgesRow}>
                {item.is_featured && (
                  <View style={styles.featuredBadgeNew}>
                    <Text style={styles.badgeText}>FEATURED</Text>
                  </View>
                )}
                {item.isAdded && (
                  <View style={styles.addedBadgeNew}>
                    <Text style={styles.badgeTextAdded}>✓ ADDED</Text>
                  </View>
                )}
              </View>
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
    { id: null, label: 'All', icon: '📚' },
    { id: 'personal', label: 'Personal', icon: '🏡' },
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            navigation.goBack();
          }}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Loop Library</Text>
          <Text style={styles.headerSubtitle}>Discover loops from the best</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive,
            ]}
            onPress={() => handleTabPress(tab.id)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.tabTextActive,
            ]}>
              {tab.icon}
            </Text>
            <Text style={[
              styles.tabLabel,
              activeTab === tab.id && styles.tabLabelActive,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates, creators, books..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={item => item.id || 'all'}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item.id && styles.categoryChipActive,
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
                setSelectedCategory(item.id);
              }}
            >
              <Text style={styles.categoryChipIcon}>{item.icon}</Text>
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item.id && styles.categoryChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Templates List */}
      {loading ? (
        <View style={styles.listContent}>
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 32,
    color: '#1A1A1A',
    fontWeight: '300',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '400',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 4,
  },
  tabActive: {
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#667eea',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  categoryContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#667eea',
  },
  categoryChipIcon: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      } as any,
    }),
  },
  colorAccent: {
    height: 4,
    width: '100%',
  },
  cardContentNew: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  creatorAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  creatorInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  creatorInfo: {
    flex: 1,
  },
  creatorNameNew: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  bookTitleNew: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
  },
  favoriteButtonNew: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIconNew: {
    fontSize: 24,
  },
  templateTitleNew: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  ratingRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 14,
    color: '#FCD34D',
    marginRight: 1,
  },
  ratingTextNew: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  reviewCount: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  descriptionNew: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statsRowNew: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statIcon: {
    fontSize: 14,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  featuredBadgeNew: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addedBadgeNew: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  badgeTextAdded: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  // Skeleton styles
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
