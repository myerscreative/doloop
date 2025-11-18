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
  TextInput,
  Alert,
  Platform,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useTheme } from '../../contexts/ThemeContext';
import { useAdmin } from '../../hooks/useAdmin';
import { supabase } from '../../lib/supabase';
import {
  createLoopTemplate,
  updateLoopTemplate,
  deleteLoopTemplate,
  getAllTemplateCreators,
  getTemplateTasks,
  CreateLoopTemplateInput,
} from '../../lib/admin';
import { LoopTemplate, TemplateCreator, TemplateTask } from '../../types/loop';

type AdminTemplatesNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminTemplates'>;

interface Props {
  navigation: AdminTemplatesNavigationProp;
}

interface TemplateFormData {
  creator_id: string;
  title: string;
  description: string;
  book_course_title: string;
  affiliate_link: string;
  color: string;
  category: string;
  is_featured: boolean;
  tasks: Array<{ description: string; display_order: number }>;
}

export function AdminTemplatesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [templates, setTemplates] = useState<LoopTemplate[]>([]);
  const [creators, setCreators] = useState<TemplateCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LoopTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    creator_id: '',
    title: '',
    description: '',
    book_course_title: '',
    affiliate_link: '',
    color: '#667eea',
    category: 'personal',
    is_featured: false,
    tasks: [{ description: '', display_order: 1 }],
  });

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
    await Promise.all([loadTemplates(), loadCreators()]);
    setLoading(false);
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('loop_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTemplates(data);
    }
  };

  const loadCreators = async () => {
    const data = await getAllTemplateCreators();
    setCreators(data);
  };

  const handleOpenModal = async (template?: LoopTemplate) => {
    if (template) {
      setEditingTemplate(template);
      const tasks = await getTemplateTasks(template.id);
      setFormData({
        creator_id: template.creator_id,
        title: template.title,
        description: template.description,
        book_course_title: template.book_course_title,
        affiliate_link: template.affiliate_link || '',
        color: template.color,
        category: template.category,
        is_featured: template.is_featured,
        tasks: tasks.map(t => ({ description: t.description, display_order: t.display_order })),
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        creator_id: creators[0]?.id || '',
        title: '',
        description: '',
        book_course_title: '',
        affiliate_link: '',
        color: '#667eea',
        category: 'personal',
        is_featured: false,
        tasks: [{ description: '', display_order: 1 }],
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description || !formData.book_course_title || !formData.creator_id) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.tasks.length === 0 || formData.tasks.some(t => !t.description)) {
      Alert.alert('Error', 'Please add at least one task with a description');
      return;
    }

    try {
      if (editingTemplate) {
        // Update existing template
        await updateLoopTemplate(editingTemplate.id, {
          creator_id: formData.creator_id,
          title: formData.title,
          description: formData.description,
          book_course_title: formData.book_course_title,
          affiliate_link: formData.affiliate_link || undefined,
          color: formData.color,
          category: formData.category,
          is_featured: formData.is_featured,
        });

        // For tasks, delete all and recreate (simpler approach)
        const existingTasks = await getTemplateTasks(editingTemplate.id);
        await Promise.all(existingTasks.map(t => supabase.from('template_tasks').delete().eq('id', t.id)));

        const tasksToInsert = formData.tasks.map((task, index) => ({
          template_id: editingTemplate.id,
          description: task.description,
          is_recurring: true,
          is_one_time: false,
          display_order: index + 1,
        }));
        await supabase.from('template_tasks').insert(tasksToInsert);

        Alert.alert('Success', 'Template updated successfully');
      } else {
        // Create new template
        await createLoopTemplate(
          {
            creator_id: formData.creator_id,
            title: formData.title,
            description: formData.description,
            book_course_title: formData.book_course_title,
            affiliate_link: formData.affiliate_link || undefined,
            color: formData.color,
            category: formData.category,
            is_featured: formData.is_featured,
          },
          formData.tasks.map((task, index) => ({
            description: task.description,
            is_recurring: true,
            is_one_time: false,
            display_order: index + 1,
          }))
        );
        Alert.alert('Success', 'Template created successfully');
      }

      handleCloseModal();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const handleDelete = async (template: LoopTemplate) => {
    if (Platform.OS === 'web') {
      if (!confirm(`Are you sure you want to delete "${template.title}"?`)) return;
    } else {
      Alert.alert(
        'Delete Template',
        `Are you sure you want to delete "${template.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteLoopTemplate(template.id);
                Alert.alert('Success', 'Template deleted successfully');
                loadTemplates();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete template');
              }
            },
          },
        ]
      );
      return;
    }

    try {
      await deleteLoopTemplate(template.id);
      alert('Template deleted successfully');
      loadTemplates();
    } catch (error) {
      alert('Failed to delete template');
    }
  };

  const addTask = () => {
    setFormData({
      ...formData,
      tasks: [...formData.tasks, { description: '', display_order: formData.tasks.length + 1 }],
    });
  };

  const removeTask = (index: number) => {
    const newTasks = formData.tasks.filter((_, i) => i !== index);
    setFormData({ ...formData, tasks: newTasks });
  };

  const updateTask = (index: number, description: string) => {
    const newTasks = [...formData.tasks];
    newTasks[index].description = description;
    setFormData({ ...formData, tasks: newTasks });
  };

  if (adminLoading || !isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const TemplateCard = React.memo(({ item }: { item: LoopTemplate }) => {
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
          <View style={[styles.colorBar, { backgroundColor: item.color }]} />
          <View style={styles.templateContent}>
            <View style={styles.templateHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.templateTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.templateMeta, { color: colors.textSecondary }]}>
                  {item.category} • {item.is_featured ? '⭐ Featured' : 'Not Featured'}
                </Text>
                <Text style={[styles.templateDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
              <View style={styles.templateActions}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    handleOpenModal(item);
                  }}
                  style={styles.actionButton}
                >
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    handleDelete(item);
                  }}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF1E88" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  });

  const renderTemplate = ({ item }: { item: LoopTemplate }) => <TemplateCard item={item} />;

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Templates</Text>
          <TouchableOpacity onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            handleOpenModal();
          }}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Templates List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={templates}
            renderItem={renderTemplate}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No templates yet. Create one!
                </Text>
              </View>
            }
          />
        )}

        {/* Modal for Create/Edit */}
        <Modal
          visible={showModal}
          animationType="slide"
          onRequestClose={handleCloseModal}
          transparent={false}
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
              {/* Creator Selection */}
              <Text style={[styles.label, { color: colors.text }]}>Creator *</Text>
              <View style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  value={creators.find(c => c.id === formData.creator_id)?.name || 'Select Creator'}
                  editable={false}
                  style={{ color: colors.text }}
                />
              </View>

              {/* Title */}
              <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={formData.title}
                onChangeText={text => setFormData({ ...formData, title: text })}
                placeholder="Enter template title"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Description */}
              <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={formData.description}
                onChangeText={text => setFormData({ ...formData, description: text })}
                placeholder="Enter template description"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />

              {/* Book/Course Title */}
              <Text style={[styles.label, { color: colors.text }]}>Book/Course Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={formData.book_course_title}
                onChangeText={text => setFormData({ ...formData, book_course_title: text })}
                placeholder="e.g., Atomic Habits"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Affiliate Link */}
              <Text style={[styles.label, { color: colors.text }]}>Affiliate Link</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={formData.affiliate_link}
                onChangeText={text => setFormData({ ...formData, affiliate_link: text })}
                placeholder="https://amazon.com/..."
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />

              {/* Color */}
              <Text style={[styles.label, { color: colors.text }]}>Color</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={formData.color}
                onChangeText={text => setFormData({ ...formData, color: text })}
                placeholder="#667eea"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Category */}
              <Text style={[styles.label, { color: colors.text }]}>Category</Text>
              <View style={styles.categoryButtons}>
                {['personal', 'work', 'daily', 'shared'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      { backgroundColor: formData.category === cat ? colors.primary : colors.card },
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat })}
                  >
                    <Text style={[styles.categoryButtonText, { color: formData.category === cat ? '#fff' : colors.text }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Featured */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData({ ...formData, is_featured: !formData.is_featured })}
              >
                <Ionicons
                  name={formData.is_featured ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>Featured Template</Text>
              </TouchableOpacity>

              {/* Tasks */}
              <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>Tasks *</Text>
              {formData.tasks.map((task, index) => (
                <View key={index} style={styles.taskRow}>
                  <TextInput
                    style={[styles.taskInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    value={task.description}
                    onChangeText={text => updateTask(index, text)}
                    placeholder={`Task ${index + 1}`}
                    placeholderTextColor={colors.textSecondary}
                  />
                  {formData.tasks.length > 1 && (
                    <TouchableOpacity onPress={() => removeTask(index)}>
                      <Ionicons name="close-circle" size={24} color="#FF1E88" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addTaskButton} onPress={addTask}>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.addTaskText, { color: colors.primary }]}>Add Task</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
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
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  templateCard: {
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
  colorBar: {
    height: 4,
  },
  templateContent: {
    padding: 16,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  templateTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  templateMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  templateDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  taskInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addTaskText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
