import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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

  const handleLearnMore = () => {
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

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      personal: '🏡',
      work: '💼',
      daily: '☀️',
      shared: '👥',
    };
    return icons[category] || '📋';
  };

  const getCreatorInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFB800" />
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          {template.is_featured && (
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.featuredBadge}
            >
              <Text style={styles.featuredText}>⭐ FEATURED</Text>
            </LinearGradient>
          )}

          <Text style={styles.title}>{template.title}</Text>
          <Text style={styles.subtitle}>From: {template.book_course_title}</Text>
          <Text style={styles.description}>{template.description}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{template.taskCount}</Text>
              <Text style={styles.statLabel}>TASKS</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, styles.statValueGold]}>
                {template.popularity_score}
              </Text>
              <Text style={styles.statLabel}>USES</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {getCategoryIcon(template.category)} {template.category}
              </Text>
            </View>
          </View>
        </View>

        {/* Tasks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>What's in this Loop</Text>
          <View style={styles.taskList}>
            {template.tasks.map((task: TemplateTask, index: number) => (
              <View key={task.id} style={styles.taskItem}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.taskNumber}
                >
                  <Text style={styles.taskNumberText}>{index + 1}</Text>
                </LinearGradient>
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{task.description}</Text>
                  {task.is_recurring && (
                    <View style={styles.taskMeta}>
                      <Ionicons name="repeat" size={14} color="#999" />
                      <Text style={styles.taskMetaText}>Recurring</Text>
                    </View>
                  )}
                  {task.is_one_time && (
                    <View style={styles.taskMeta}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#999" />
                      <Text style={styles.taskMetaText}>One-time</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Creator Section */}
        {template.creator && (
          <View style={styles.section}>
            <Text style={styles.creatorHeader}>CREATED BY</Text>
            <View style={styles.creatorCard}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.creatorAvatar}
              >
                <Text style={styles.creatorInitials}>
                  {getCreatorInitials(template.creator.name)}
                </Text>
              </LinearGradient>
              <View style={styles.creatorInfo}>
                <Text style={styles.creatorName}>{template.creator.name}</Text>
                {template.creator.title && (
                  <Text style={styles.creatorTitle}>{template.creator.title}</Text>
                )}
                {template.creator.bio && (
                  <Text style={styles.creatorBio}>{template.creator.bio}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Spacer for fixed buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      <View style={styles.buttonContainer}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', '#ffffff', '#ffffff']}
          style={styles.buttonGradient}
        >
          <View style={styles.buttonRow}>
            {template.affiliate_link && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleLearnMore}
              >
                <Text style={styles.secondaryButtonText}>📖 Learn More</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButtonWrapper,
                !template.affiliate_link && styles.primaryButtonFull
              ]}
              onPress={handleAddToMyLoops}
              disabled={adding}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                {adding ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>+ Add to My Loops</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  backToLibraryButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  backToLibraryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Header Section
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 16,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  featuredText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: '#0066cc',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  stat: {
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statValueGold: {
    color: '#FFB800',
  },
  statLabel: {
    fontSize: 13,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
  },

  // Section
  section: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 12,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },

  // Tasks
  taskList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  taskNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  taskContent: {
    flex: 1,
    gap: 6,
  },
  taskTitle: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 21,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskMetaText: {
    fontSize: 13,
    color: '#999',
  },

  // Creator
  creatorHeader: {
    fontSize: 13,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 12,
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  creatorInfo: {
    flex: 1,
    gap: 2,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  creatorTitle: {
    fontSize: 13,
    color: '#666',
  },
  creatorBio: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },

  // Bottom Buttons
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  buttonGradient: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  primaryButtonWrapper: {
    flex: 1,
  },
  primaryButtonFull: {
    flex: 2,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
