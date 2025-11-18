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
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useTheme } from '../../contexts/ThemeContext';
import { useAdmin } from '../../hooks/useAdmin';
import {
  createTemplateCreator,
  updateTemplateCreator,
  deleteTemplateCreator,
  getAllTemplateCreators,
} from '../../lib/admin';
import { TemplateCreator } from '../../types/loop';

type AdminCreatorsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminCreators'>;

interface Props {
  navigation: AdminCreatorsNavigationProp;
}

interface CreatorFormData {
  name: string;
  bio: string;
  title: string;
  photo_url: string;
  website_url: string;
}

export function AdminCreatorsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [creators, setCreators] = useState<TemplateCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCreator, setEditingCreator] = useState<TemplateCreator | null>(null);
  const [formData, setFormData] = useState<CreatorFormData>({
    name: '',
    bio: '',
    title: '',
    photo_url: '',
    website_url: '',
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigation.navigate('Home');
    }
  }, [isAdmin, adminLoading, navigation]);

  useEffect(() => {
    loadCreators();
  }, []);

  const loadCreators = async () => {
    setLoading(true);
    const data = await getAllTemplateCreators();
    setCreators(data);
    setLoading(false);
  };

  const handleOpenModal = (creator?: TemplateCreator) => {
    if (creator) {
      setEditingCreator(creator);
      setFormData({
        name: creator.name,
        bio: creator.bio,
        title: creator.title || '',
        photo_url: creator.photo_url || '',
        website_url: creator.website_url || '',
      });
    } else {
      setEditingCreator(null);
      setFormData({
        name: '',
        bio: '',
        title: '',
        photo_url: '',
        website_url: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCreator(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.bio) {
      Alert.alert('Error', 'Please fill in name and bio');
      return;
    }

    try {
      if (editingCreator) {
        await updateTemplateCreator(editingCreator.id, formData);
        Alert.alert('Success', 'Creator updated successfully');
      } else {
        await createTemplateCreator(formData);
        Alert.alert('Success', 'Creator created successfully');
      }
      handleCloseModal();
      loadCreators();
    } catch (error) {
      console.error('Error saving creator:', error);
      Alert.alert('Error', 'Failed to save creator');
    }
  };

  const handleDelete = async (creator: TemplateCreator) => {
    if (Platform.OS === 'web') {
      if (!confirm(`Are you sure you want to delete "${creator.name}"?`)) return;
    } else {
      Alert.alert(
        'Delete Creator',
        `Are you sure you want to delete "${creator.name}"? This will also delete all their templates.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTemplateCreator(creator.id);
                Alert.alert('Success', 'Creator deleted successfully');
                loadCreators();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete creator');
              }
            },
          },
        ]
      );
      return;
    }

    try {
      await deleteTemplateCreator(creator.id);
      alert('Creator deleted successfully');
      loadCreators();
    } catch (error) {
      alert('Failed to delete creator');
    }
  };

  if (adminLoading || !isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderCreator = ({ item }: { item: TemplateCreator }) => {
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
          style={[styles.creatorCard, { backgroundColor: colors.card }]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.95}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        >
          <View style={styles.creatorContent}>
            {item.photo_url ? (
              <Image source={{ uri: item.photo_url }} style={styles.creatorPhoto} />
            ) : (
              <View style={[styles.creatorPhotoPlaceholder, { backgroundColor: colors.primary + '30' }]}>
                <Ionicons name="person" size={32} color={colors.primary} />
              </View>
            )}
            <View style={styles.creatorInfo}>
              <Text style={[styles.creatorName, { color: colors.text }]}>{item.name}</Text>
              {item.title && (
                <Text style={[styles.creatorTitle, { color: colors.textSecondary }]}>{item.title}</Text>
              )}
              <Text style={[styles.creatorBio, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.bio}
              </Text>
              {item.website_url && (
                <Text style={[styles.creatorWebsite, { color: colors.primary }]} numberOfLines={1}>
                  {item.website_url}
                </Text>
              )}
            </View>
            <View style={styles.creatorActions}>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Creators</Text>
          <TouchableOpacity onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            handleOpenModal();
          }}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Creators List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={creators}
            renderItem={renderCreator}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No creators yet. Create one!
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
                {editingCreator ? 'Edit Creator' : 'Create Creator'}
              </Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
              {/* Name */}
              <Text style={[styles.label, { color: colors.text }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={formData.name}
                onChangeText={text => setFormData({ ...formData, name: text })}
                placeholder="Enter creator name"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Title */}
              <Text style={[styles.label, { color: colors.text }]}>Title</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={formData.title}
                onChangeText={text => setFormData({ ...formData, title: text })}
                placeholder="e.g., Author & Speaker"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Bio */}
              <Text style={[styles.label, { color: colors.text }]}>Bio *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={formData.bio}
                onChangeText={text => setFormData({ ...formData, bio: text })}
                placeholder="Enter creator bio"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
              />

              {/* Photo URL */}
              <Text style={[styles.label, { color: colors.text }]}>Photo URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={formData.photo_url}
                onChangeText={text => setFormData({ ...formData, photo_url: text })}
                placeholder="https://example.com/photo.jpg"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />

              {/* Website URL */}
              <Text style={[styles.label, { color: colors.text }]}>Website URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={formData.website_url}
                onChangeText={text => setFormData({ ...formData, website_url: text })}
                placeholder="https://example.com"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
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
  creatorCard: {
    borderRadius: 16,
    marginBottom: 16,
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
  creatorContent: {
    flexDirection: 'row',
    gap: 12,
  },
  creatorPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  creatorPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  creatorTitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  creatorBio: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  creatorWebsite: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  creatorActions: {
    flexDirection: 'column',
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
