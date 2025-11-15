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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { supabase } from '../lib/supabase';
import { LoopTemplateWithDetails } from '../types/loop';

type TemplateLibraryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TemplateLibrary'
>;

interface Props {
  navigation: TemplateLibraryScreenNavigationProp;
}

export function TemplateLibraryScreen({ navigation }: Props) {
  const [templates, setTemplates] = useState<LoopTemplateWithDetails[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<LoopTemplateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [searchQuery, selectedCategory, templates]);

  const fetchTemplates = async () => {
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

      // Transform data to match our interface
      const templatesWithDetails: LoopTemplateWithDetails[] = (templateData || []).map((template: any) => ({
        ...template,
        creator: Array.isArray(template.creator) ? template.creator[0] : template.creator,
        tasks: template.tasks || [],
        taskCount: template.tasks?.length || 0,
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

      {/* Template Color Bar */}
      <View style={[styles.colorBar, { backgroundColor: item.color }]} />

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={styles.templateTitle}>{item.title}</Text>
        <Text style={styles.creatorName}>by {item.creator.name}</Text>
        <Text style={styles.bookTitle}>{item.book_course_title}</Text>
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
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{getCategoryIcon(item.category)} {item.category}</Text>
          </View>
        </View>
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
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>No templates found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'Check back soon for new templates'}
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
      },
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
