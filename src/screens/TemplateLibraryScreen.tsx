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
} from 'react-native';
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

      // Fetch templates with creator info and tasks
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

      // Fetch user's favorites
      const { data: favoritesData } = await supabase
        .from('template_favorites')
        .select('template_id')
        .eq('user_id', user.id);

      const favoriteIds = new Set(favoritesData?.map(f => f.template_id) || []);

      // Fetch user's added templates
      const { data: usageData } = await supabase
        .from('user_template_usage')
        .select('template_id')
        .eq('user_id', user.id);

      const addedIds = new Set(usageData?.map(u => u.template_id) || []);

      // Fetch user's ratings
      const { data: ratingsData } = await supabase
        .from('template_reviews')
        .select('template_id, rating')
        .eq('user_id', user.id);

      const userRatings = new Map(ratingsData?.map(r => [r.template_id, r.rating]) || []);

      // Transform data to match our interface
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

    // Filter by tab
    if (activeTab === 'mylibrary') {
      filtered = filtered.filter(t => t.isAdded);
    } else if (activeTab === 'favorites') {
      filtered = filtered.filter(t => t.isFavorite);
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by search query
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

    try {
      if (currentlyFavorited) {
        // Remove favorite
        await supabase
          .from('template_favorites')
          .delete()
          .eq('template_id', templateId)
          .eq('user_id', user.id);
      } else {
        // Add favorite
        await supabase
          .from('template_favorites')
          .insert([{ template_id: templateId, user_id: user.id }]);
      }

      // Refresh templates
      await fetchTemplates();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const shareTemplate = async (template: LoopTemplateWithDetails) => {
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
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={styles.star}>
          {i <= Math.round(rating) ? '⭐' : '☆'}
        </Text>
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderTemplateCard = ({ item }: { item: LoopTemplateWithDetails }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => navigation.navigate('TemplateDetail', { templateId: item.id })}
      activeOpacity={0.7}
    >
      {/* Featured Badge */}
      {item.is_featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>⭐ FEATURED</Text>
        </View>
      )}

      {/* Favorite Button */}
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={(e) => {
          e.stopPropagation();
          toggleFavorite(item.id, item.isFavorite || false);
        }}
      >
        <Text style={styles.favoriteIcon}>{item.isFavorite ? '❤️' : '🤍'}</Text>
      </TouchableOpacity>

      {/* Template Color Bar */}
      <View style={[styles.colorBar, { backgroundColor: item.color }]} />

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={styles.templateTitle}>{item.title}</Text>
        <Text style={styles.creatorName}>by {item.creator.name}</Text>
        <Text style={styles.bookTitle}>{item.book_course_title}</Text>

        {/* Rating */}
        {item.review_count > 0 && (
          <View style={styles.ratingRow}>
            {renderStars(item.average_rating)}
            <Text style={styles.ratingText}>
              {item.average_rating.toFixed(1)} ({item.review_count} reviews)
            </Text>
          </View>
        )}

        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.taskCount}</Text>
            <Text style={styles.statLabel}>tasks</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.popularity_score}</Text>
            <Text style={styles.statLabel}>uses</Text>
          </View>
          {item.isAdded && (
            <View style={styles.addedBadge}>
              <Text style={styles.addedText}>✓ Added</Text>
            </View>
          )}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{getCategoryIcon(item.category)} {item.category}</Text>
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={(e) => {
            e.stopPropagation();
            shareTemplate(item);
          }}
        >
          <Text style={styles.shareButtonText}>📤 Share</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Loop Library</Text>
          <Text style={styles.headerSubtitle}>Loops inspired by the best</Text>
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
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.tabTextActive,
            ]}>
              {tab.icon} {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search templates, creators, books..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
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
                styles.categoryButton,
                selectedCategory === item.id && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(item.id)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === item.id && styles.categoryButtonTextActive,
                ]}
              >
                {item.icon} {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Templates List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading templates...</Text>
        </View>
      ) : filteredTemplates.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>
            {activeTab === 'mylibrary' ? '📖' : activeTab === 'favorites' ? '❤️' : '📚'}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'mylibrary'
              ? 'No templates added yet'
              : activeTab === 'favorites'
              ? 'No favorites yet'
              : 'No templates found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'mylibrary'
              ? 'Browse templates and add them to your library'
              : activeTab === 'favorites'
              ? 'Tap the heart icon to favorite templates'
              : searchQuery
              ? 'Try a different search term'
              : 'Check back soon for new templates'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTemplates}
          renderItem={renderTemplateCard}
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 28,
    color: '#333',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#667eea',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    height: 44,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  categoryContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
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
      } as any,
    }),
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  favoriteIcon: {
    fontSize: 20,
  },
  colorBar: {
    height: 6,
    width: '100%',
  },
  cardContent: {
    padding: 20,
  },
  templateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 2,
  },
  bookTitle: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  star: {
    fontSize: 12,
    marginRight: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  addedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  addedText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  categoryBadge: {
    marginLeft: 'auto',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  shareButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  shareButtonText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
