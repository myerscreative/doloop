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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useTheme } from '../../contexts/ThemeContext';
import { useAdmin } from '../../hooks/useAdmin';
import {
  getAllTemplateReviews,
  updateTemplateReview,
  deleteTemplateReview,
  TemplateReview,
} from '../../lib/admin';

type AdminReviewsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminReviews'>;

interface ReviewFormData {
  rating: number;
  review_text: string;
}

export const AdminReviewsScreen: React.FC = () => {
  const navigation = useNavigation<AdminReviewsNavigationProp>();
  const { colors } = useTheme();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [reviews, setReviews] = useState<TemplateReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReview, setEditingReview] = useState<TemplateReview | null>(null);
  const [formData, setFormData] = useState<ReviewFormData>({
    rating: 5,
    review_text: '',
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigation.navigate('Home');
    }
  }, [isAdmin, adminLoading, navigation]);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    const data = await getAllTemplateReviews();
    setReviews(data);
    setLoading(false);
  };

  const filteredReviews = React.useMemo(() => {
    let filtered = reviews;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(review =>
        review.user_email?.toLowerCase().includes(query) ||
        review.template_title?.toLowerCase().includes(query) ||
        review.review_text?.toLowerCase().includes(query)
      );
    }

    // Filter by rating
    if (selectedRating !== null) {
      filtered = filtered.filter(review => review.rating === selectedRating);
    }

    return filtered;
  }, [reviews, searchQuery, selectedRating]);

  const handleOpenModal = (review?: TemplateReview) => {
    if (review) {
      setEditingReview(review);
      setFormData({
        rating: review.rating,
        review_text: review.review_text || '',
      });
    } else {
      setEditingReview(null);
      setFormData({
        rating: 5,
        review_text: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingReview(null);
  };

  const handleSave = async () => {
    if (!editingReview) return;

    if (formData.rating < 1 || formData.rating > 5) {
      Alert.alert('Error', 'Rating must be between 1 and 5');
      return;
    }

    try {
      await updateTemplateReview(editingReview.id, {
        rating: formData.rating,
        review_text: formData.review_text || null,
      });
      Alert.alert('Success', 'Review updated successfully');
      handleCloseModal();
      loadReviews();
    } catch (error) {
      console.error('Error saving review:', error);
      Alert.alert('Error', 'Failed to save review');
    }
  };

  const handleDelete = async (review: TemplateReview) => {
    if (Platform.OS === 'web') {
      if (!confirm(`Are you sure you want to delete this review from ${review.user_email}?`)) return;
    } else {
      Alert.alert(
        'Delete Review',
        `Are you sure you want to delete this review from ${review.user_email}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTemplateReview(review.id);
                Alert.alert('Success', 'Review deleted successfully');
                loadReviews();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete review');
              }
            },
          },
        ]
      );
      return;
    }

    try {
      await deleteTemplateReview(review.id);
      alert('Review deleted successfully');
      loadReviews();
    } catch (error) {
      alert('Failed to delete review');
    }
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            disabled={!interactive}
            onPress={() => onRatingChange?.(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={rating >= star ? 'star' : 'star-outline'}
              size={16}
              color={rating >= star ? '#FFD700' : colors.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (adminLoading || !isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const ReviewCard = React.memo(({ item }: { item: TemplateReview }) => {
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
          style={[styles.reviewCard, { backgroundColor: colors.card }]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.95}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        >
          <View style={styles.reviewHeader}>
            <View style={styles.reviewMeta}>
              <Text style={[styles.templateTitle, { color: colors.text }]}>
                {item.template_title}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                by {item.user_email}
              </Text>
              <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.reviewActions}>
              {renderStars(item.rating)}
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
          {item.review_text && (
            <Text style={[styles.reviewText, { color: colors.text }]} numberOfLines={3}>
              {item.review_text}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  });

  const renderReview = ({ item }: { item: TemplateReview }) => <ReviewCard item={item} />;

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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Review Management</Text>
            <TouchableOpacity onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              loadReviews();
            }}>
              <Ionicons name="refresh" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Field */}
          <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search reviews..."
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

          {/* Rating Filter */}
          <View style={styles.filterContainer}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Filter by Rating:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ratingFilters}>
              <TouchableOpacity
                style={[
                  styles.ratingChip,
                  !selectedRating && { backgroundColor: colors.primary },
                  !selectedRating && styles.ratingChipActive,
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.selectionAsync();
                  }
                  setSelectedRating(null);
                }}
              >
                <Text style={[styles.ratingChipText, !selectedRating && { color: '#fff' }]}>All</Text>
              </TouchableOpacity>
              {[5, 4, 3, 2, 1].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingChip,
                    selectedRating === rating && { backgroundColor: colors.primary },
                    selectedRating === rating && styles.ratingChipActive,
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.selectionAsync();
                    }
                    setSelectedRating(rating);
                  }}
                >
                  {renderStars(rating)}
                  <Text style={[styles.ratingChipText, selectedRating === rating && { color: '#fff' }]}>
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{reviews.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Reviews</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Rating</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{filteredReviews.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Filtered</Text>
            </View>
          </View>

          {/* Reviews List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredReviews}
              renderItem={renderReview}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {searchQuery || selectedRating ? 'No reviews match your filters' : 'No reviews yet'}
                  </Text>
                </View>
              }
            />
          )}

          {/* Modal for Edit Review */}
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
                  Edit Review
                </Text>
                <TouchableOpacity onPress={handleSave}>
                  <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
                {editingReview && (
                  <View style={styles.reviewInfo}>
                    <Text style={[styles.infoLabel, { color: colors.text }]}>Template:</Text>
                    <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                      {editingReview.template_title}
                    </Text>
                    <Text style={[styles.infoLabel, { color: colors.text }]}>User:</Text>
                    <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                      {editingReview.user_email}
                    </Text>
                  </View>
                )}

                {/* Rating */}
                <Text style={[styles.label, { color: colors.text }]}>Rating *</Text>
                <View style={styles.ratingSelector}>
                  {renderStars(formData.rating, true, (rating) => setFormData({ ...formData, rating }))}
                  <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                    {formData.rating} star{formData.rating !== 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Review Text */}
                <Text style={[styles.label, { color: colors.text }]}>Review Text</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={formData.review_text}
                  onChangeText={text => setFormData({ ...formData, review_text: text })}
                  placeholder="Review text (optional)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={6}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
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
  filterContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  ratingFilters: {
    gap: 8,
  },
  ratingChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingChipActive: {
    borderColor: 'transparent',
  },
  ratingChipText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
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
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  reviewCard: {
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewMeta: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starContainer: {
    flexDirection: 'row',
  },
  starButton: {
    padding: 2,
  },
  actionButton: {
    padding: 8,
  },
  reviewText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
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
  reviewInfo: {
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
    marginTop: 12,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
    marginTop: 16,
  },
  ratingSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
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
