import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { supabase } from '../lib/supabase';
import { LoopTemplateWithDetails, TemplateTask } from '../types/loop';
import { useAuth } from '../contexts/AuthContext';

type TemplateDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TemplateDetail'
>;

type TemplateDetailScreenRouteProp = RouteProp<RootStackParamList, 'TemplateDetail'>;

interface Props {
  navigation: TemplateDetailScreenNavigationProp;
  route: TemplateDetailScreenRouteProp;
}

export function TemplateDetailScreen({ navigation, route }: Props) {
  const { templateId } = route.params;
  const { user } = useAuth();
  const [template, setTemplate] = useState<LoopTemplateWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchTemplateDetails();
  }, [templateId]);

  const fetchTemplateDetails = async () => {
    try {
      setLoading(true);

      // Fetch template with creator and tasks
      const { data: templateData, error: templateError } = await supabase
        .from('loop_templates')
        .select(`
          *,
          creator:template_creators(*),
          tasks:template_tasks(*)
        `)
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Sort tasks by display_order
      const sortedTasks = (templateData.tasks || []).sort(
        (a: TemplateTask, b: TemplateTask) => a.display_order - b.display_order
      );

      const templateWithDetails: LoopTemplateWithDetails = {
        ...templateData,
        creator: Array.isArray(templateData.creator) ? templateData.creator[0] : templateData.creator,
        tasks: sortedTasks,
        taskCount: sortedTasks.length,
      };

      setTemplate(templateWithDetails);
    } catch (error) {
      console.error('Error fetching template details:', error);
      Alert.alert('Error', 'Failed to load template details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToMyLoops = async () => {
    if (!template || !user) {
      Alert.alert('Error', 'Please log in to add this template to your loops');
      return;
    }

    try {
      setAdding(true);

      // Create a new loop based on this template
      const { data: newLoop, error: loopError } = await supabase
        .from('loops')
        .insert([
          {
            owner_id: user.id,
            name: template.title,
            color: template.color,
            reset_rule: template.category === 'daily' ? 'daily' : 'manual',
            is_favorite: false,
          },
        ])
        .select()
        .single();

      if (loopError) throw loopError;

      // Copy all tasks from the template to the new loop
      const tasksToInsert = template.tasks.map((task: TemplateTask) => ({
        loop_id: newLoop.id,
        description: task.description,
        is_recurring: task.is_recurring,
        is_one_time: task.is_one_time,
        status: 'pending' as const,
      }));

      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(tasksToInsert);

      if (tasksError) throw tasksError;

      // Track that this user added this template
      const { error: usageError } = await supabase
        .from('user_template_usage')
        .insert([
          {
            user_id: user.id,
            template_id: template.id,
            loop_id: newLoop.id,
          },
        ]);

      if (usageError) {
        console.warn('Error tracking template usage:', usageError);
        // Don't fail the whole operation if usage tracking fails
      }

      Alert.alert(
        'Success!',
        `"${template.title}" has been added to your loops!`,
        [
          {
            text: 'View Loop',
            onPress: () => navigation.navigate('LoopDetail', { loopId: newLoop.id }),
          },
          {
            text: 'Browse More',
            onPress: () => navigation.goBack(),
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error adding template to loops:', error);
      Alert.alert('Error', 'Failed to add template to your loops. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleOpenAffiliateLink = () => {
    if (!template?.affiliate_link) return;

    Alert.alert(
      'Learn More',
      `This will open a link to "${template.book_course_title}" where you can learn more and support the creator.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Link',
          onPress: () => {
            Linking.openURL(template.affiliate_link!).catch((err) => {
              console.error('Error opening link:', err);
              Alert.alert('Error', 'Could not open the link');
            });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading template...</Text>
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>😕</Text>
        <Text style={styles.errorText}>Template not found</Text>
        <TouchableOpacity
          style={styles.backToLibraryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backToLibraryButtonText}>Back to Library</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Template Info */}
        <View style={styles.templateSection}>
          <View style={[styles.colorBar, { backgroundColor: template.color }]} />
          {template.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>⭐ FEATURED</Text>
            </View>
          )}
          <Text style={styles.templateTitle}>{template.title}</Text>
          <Text style={styles.bookTitle}>From: {template.book_course_title}</Text>
          <Text style={styles.description}>{template.description}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{template.taskCount}</Text>
              <Text style={styles.statLabel}>tasks</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{template.popularity_score}</Text>
              <Text style={styles.statLabel}>uses</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{getCategoryIcon(template.category)} {template.category}</Text>
            </View>
          </View>
        </View>

        {/* Creator Bio */}
        <View style={styles.creatorSection}>
          <Text style={styles.sectionTitle}>About the Creator</Text>
          <View style={styles.creatorCard}>
            {template.creator.photo_url && (
              <Image
                source={{ uri: template.creator.photo_url }}
                style={styles.creatorPhoto}
              />
            )}
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorName}>{template.creator.name}</Text>
              {template.creator.title && (
                <Text style={styles.creatorTitle}>{template.creator.title}</Text>
              )}
              <Text style={styles.creatorBio}>{template.creator.bio}</Text>
            </View>
          </View>
        </View>

        {/* Tasks Preview */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Tasks in this Loop ({template.taskCount})</Text>
          {template.tasks.map((task: TemplateTask, index: number) => (
            <View key={task.id} style={styles.taskItem}>
              <View style={styles.taskCheckbox}>
                <Text style={styles.taskNumber}>{index + 1}</Text>
              </View>
              <View style={styles.taskContent}>
                <Text style={styles.taskDescription}>{task.description}</Text>
                {task.is_recurring && (
                  <Text style={styles.taskBadge}>🔄 Recurring</Text>
                )}
                {task.is_one_time && (
                  <Text style={styles.taskBadge}>✓ One-time</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {template.affiliate_link && (
          <TouchableOpacity
            style={styles.learnMoreButton}
            onPress={handleOpenAffiliateLink}
          >
            <Text style={styles.learnMoreButtonText}>📚 Learn More</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.addButton, !template.affiliate_link && styles.addButtonFull]}
          onPress={handleAddToMyLoops}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>+ Add to My Loops</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    personal: '🏡',
    work: '💼',
    daily: '☀️',
    shared: '👥',
  };
  return icons[category] || '📋';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#333',
  },
  templateSection: {
    backgroundColor: '#fff',
    padding: 24,
    marginBottom: 12,
  },
  colorBar: {
    height: 4,
    width: 60,
    borderRadius: 2,
    marginBottom: 16,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  templateTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bookTitle: {
    fontSize: 15,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  categoryBadge: {
    marginLeft: 'auto',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  categoryText: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  creatorSection: {
    backgroundColor: '#fff',
    padding: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  creatorCard: {
    flexDirection: 'row',
    gap: 16,
  },
  creatorPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  creatorTitle: {
    fontSize: 14,
    color: '#667eea',
    marginBottom: 8,
  },
  creatorBio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tasksSection: {
    backgroundColor: '#fff',
    padding: 24,
    marginBottom: 12,
  },
  taskItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskCheckbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
  },
  taskContent: {
    flex: 1,
    gap: 4,
  },
  taskDescription: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  taskBadge: {
    fontSize: 11,
    color: '#999',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  learnMoreButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  learnMoreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#667eea',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonFull: {
    flex: 2,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  backToLibraryButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  backToLibraryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
