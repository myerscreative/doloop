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
  getAllTemplateGroups,
  createTemplateGroup,
  updateTemplateGroup,
  deleteTemplateGroup,
  assignTemplateToGroup,
  unassignTemplateFromGroup,
  getGroupsForTemplate,
  TemplateGroup,
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
  const [groups, setGroups] = useState<TemplateGroup[]>([]);
  const [templateGroups, setTemplateGroups] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LoopTemplate | null>(null);
  const [editingGroup, setEditingGroup] = useState<TemplateGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
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
    await Promise.all([loadTemplates(), loadCreators(), loadGroups()]);
    setLoading(false);
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('loop_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTemplates(data);
      // Load group assignments for each template
      loadTemplateGroups(data.map(t => t.id));
    }
  };

  const loadCreators = async () => {
    const data = await getAllTemplateCreators();
    setCreators(data);
  };

  const loadGroups = async () => {
    const data = await getAllTemplateGroups();
    setGroups(data);
  };

  const loadTemplateGroups = async (templateIds: string[]) => {
    const groupMap: Record<string, string[]> = {};

    for (const templateId of templateIds) {
      const templateGroupsData = await getGroupsForTemplate(templateId);
      groupMap[templateId] = templateGroupsData.map(g => g.id);
    }

    setTemplateGroups(groupMap);
  };

  // Filter templates based on search and group
  const filteredTemplates = React.useMemo(() => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.book_course_title.toLowerCase().includes(query)
      );
    }

    // Filter by selected group
    if (selectedGroup) {
      filtered = filtered.filter(t =>
        templateGroups[t.id]?.includes(selectedGroup)
      );
    }

    return filtered;
  }, [templates, searchQuery, selectedGroup, templateGroups]);

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

  // Group Management Functions
  const handleOpenGroupModal = (group?: TemplateGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupName(group.name);
      setGroupDescription(group.description || '');
    } else {
      setEditingGroup(null);
      setGroupName('');
      setGroupDescription('');
    }
    setShowGroupModal(true);
  };

  const handleCloseGroupModal = () => {
    setShowGroupModal(false);
    setEditingGroup(null);
    setGroupName('');
    setGroupDescription('');
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }

    try {
      if (editingGroup) {
        await updateTemplateGroup(editingGroup.id, {
          name: groupName,
          description: groupDescription || null,
          display_order: editingGroup.display_order,
        });
        Alert.alert('Success', 'Group updated successfully');
      } else {
        await createTemplateGroup({
          name: groupName,
          description: groupDescription || null,
          display_order: groups.length,
        });
        Alert.alert('Success', 'Group created successfully');
      }
      handleCloseGroupModal();
      loadGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      Alert.alert('Error', 'Failed to save group');
    }
  };

  const handleDeleteGroup = async (group: TemplateGroup) => {
    if (Platform.OS === 'web') {
      if (!confirm(`Are you sure you want to delete "${group.name}"?`)) return;
    } else {
      Alert.alert(
        'Delete Group',
        `Are you sure you want to delete "${group.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTemplateGroup(group.id);
                Alert.alert('Success', 'Group deleted successfully');
                loadGroups();
                if (selectedGroup === group.id) {
                  setSelectedGroup(null);
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to delete group');
              }
            },
          },
        ]
      );
      return;
    }

    try {
      await deleteTemplateGroup(group.id);
      alert('Group deleted successfully');
      loadGroups();
      if (selectedGroup === group.id) {
        setSelectedGroup(null);
      }
    } catch (error) {
      alert('Failed to delete group');
    }
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

        {/* Search Field */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search templates..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Group Filters */}
        <View style={styles.groupFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupFilters}>
            <TouchableOpacity
              style={[
                styles.groupChip,
                !selectedGroup && { backgroundColor: colors.primary },
                !selectedGroup && styles.groupChipActive,
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
                setSelectedGroup(null);
              }}
            >
              <Text style={[styles.groupChipText, !selectedGroup && { color: '#fff' }]}>All</Text>
            </TouchableOpacity>
            {groups.map(group => (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.groupChip,
                  selectedGroup === group.id && { backgroundColor: colors.primary },
                  selectedGroup === group.id && styles.groupChipActive,
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.selectionAsync();
                  }
                  setSelectedGroup(group.id);
                }}
              >
                <Text style={[styles.groupChipText, selectedGroup === group.id && { color: '#fff' }]}>
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.groupChip, { borderStyle: 'dashed', borderColor: colors.primary }]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                handleOpenGroupModal();
              }}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.groupChipText, { color: colors.primary }]}>Manage Groups</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Templates List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredTemplates}
            renderItem={renderTemplate}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {searchQuery || selectedGroup ? 'No templates match your filters' : 'No templates yet. Create one!'}
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

        {/* Modal for Group Management */}
        <Modal
          visible={showGroupModal}
          animationType="slide"
          onRequestClose={handleCloseGroupModal}
          transparent={false}
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseGroupModal}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingGroup ? 'Edit Group' : 'Manage Groups'}
              </Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
              {/* Create/Edit Group Form */}
              <View style={styles.groupFormSection}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {editingGroup ? 'Edit Group' : 'Create New Group'}
                </Text>

                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Group name (e.g., Productivity)"
                  placeholderTextColor={colors.textSecondary}
                />

                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  placeholder="Description (optional)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[styles.saveGroupButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveGroup}
                >
                  <Text style={styles.saveGroupButtonText}>
                    {editingGroup ? 'Update Group' : 'Create Group'}
                  </Text>
                </TouchableOpacity>

                {editingGroup && (
                  <TouchableOpacity
                    style={styles.cancelEditButton}
                    onPress={() => {
                      setEditingGroup(null);
                      setGroupName('');
                      setGroupDescription('');
                    }}
                  >
                    <Text style={[styles.cancelEditButtonText, { color: colors.textSecondary }]}>
                      Cancel Edit
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Existing Groups List */}
              <View style={styles.existingGroupsSection}>
                <Text style={[styles.label, { color: colors.text, marginTop: 24, marginBottom: 12 }]}>
                  Existing Groups
                </Text>
                {groups.map(group => (
                  <View key={group.id} style={[styles.groupListItem, { backgroundColor: colors.card }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.groupListName, { color: colors.text }]}>{group.name}</Text>
                      {group.description && (
                        <Text style={[styles.groupListDescription, { color: colors.textSecondary }]}>
                          {group.description}
                        </Text>
                      )}
                    </View>
                    <View style={styles.groupListActions}>
                      <TouchableOpacity
                        onPress={() => handleOpenGroupModal(group)}
                        style={styles.groupActionButton}
                      >
                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteGroup(group)}
                        style={styles.groupActionButton}
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF1E88" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {groups.length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.textSecondary, textAlign: 'center', padding: 20 }]}>
                    No groups yet. Create one above!
                  </Text>
                )}
              </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    padding: 4,
  },
  groupFiltersContainer: {
    marginBottom: 8,
  },
  groupFilters: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  groupChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupChipActive: {
    borderColor: 'transparent',
  },
  groupChipText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  groupFormSection: {
    marginBottom: 24,
  },
  saveGroupButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveGroupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  cancelEditButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelEditButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  existingGroupsSection: {
    marginTop: 8,
  },
  groupListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  groupListName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  groupListDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  groupListActions: {
    flexDirection: 'row',
    gap: 8,
  },
  groupActionButton: {
    padding: 8,
  },
});
