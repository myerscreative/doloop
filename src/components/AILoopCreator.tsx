/**
 * AI Loop Creator Component
 *
 * Provides a user interface for creating loops using AI with natural language.
 * Includes rate limiting display, loading states, and error handling.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import {
  generateAndCreateLoop,
  checkRateLimit,
  getAIQuota,
  type AIRateLimit,
  type AIQuota,
} from '../lib/aiService';

interface AILoopCreatorProps {
  visible: boolean;
  onClose: () => void;
  onLoopCreated: (loopId: string, loopName: string) => void;
}

export function AILoopCreator({
  visible,
  onClose,
  onLoopCreated,
}: AILoopCreatorProps) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimit, setRateLimit] = useState<AIRateLimit | null>(null);
  const [quota, setQuota] = useState<AIQuota | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(true);

  // Load rate limit and quota on mount
  useEffect(() => {
    if (visible && user) {
      loadQuotaInfo();
    }
  }, [visible, user]);

  const loadQuotaInfo = async () => {
    if (!user) return;

    setLoadingQuota(true);
    try {
      const [rateLimitData, quotaData] = await Promise.all([
        checkRateLimit(user.id),
        getAIQuota(user.id),
      ]);

      setRateLimit(rateLimitData);
      setQuota(quotaData);
    } catch (err) {
      console.error('Failed to load quota info:', err);
    } finally {
      setLoadingQuota(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to use AI generation');
      return;
    }

    if (!prompt.trim()) {
      Alert.alert('Error', 'Please enter a description for your loop');
      return;
    }

    // Check rate limit
    if (rateLimit && !rateLimit.allowed) {
      Alert.alert(
        'Rate Limit Reached',
        `You've reached your AI generation limit. Please try again later.\n\n` +
        `Hourly: ${rateLimit.hourly_used}/${rateLimit.hourly_limit}\n` +
        `Daily: ${rateLimit.daily_used}/${rateLimit.daily_limit}\n` +
        `Monthly: ${rateLimit.monthly_used}/${rateLimit.monthly_limit}`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await generateAndCreateLoop(prompt, user.id);

      if (result.success && result.loopId && result.loopName) {
        // Success!
        Alert.alert(
          'Loop Created! 🎉',
          `"${result.loopName}" has been created with AI-generated tasks.` +
          (result.meta ? `\n\nTokens: ${result.meta.tokensUsed} | Cost: $${result.meta.costUsd}` : ''),
          [
            {
              text: 'View Loop',
              onPress: () => {
                setPrompt('');
                onClose();
                onLoopCreated(result.loopId!, result.loopName!);
              },
            },
            {
              text: 'Create Another',
              onPress: () => {
                setPrompt('');
                loadQuotaInfo(); // Refresh quota
              },
            },
          ]
        );
      } else {
        setError(result.error || 'Failed to create loop');
        Alert.alert('Error', result.error || 'Failed to create loop');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPrompt('');
    setError(null);
    onClose();
  };

  const remainingDaily = quota ? quota.dailyLimit - quota.dailyRequestsUsed : 0;
  const remainingMonthly = quota ? quota.monthlyLimit - quota.monthlyRequestsUsed : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create Loop with AI ✨</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                disabled={loading}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Description */}
            <Text style={styles.description}>
              Describe the loop you want to create, and AI will generate tasks for you.
            </Text>

            {/* Examples */}
            <View style={styles.examplesContainer}>
              <Text style={styles.examplesTitle}>Examples:</Text>
              <TouchableOpacity
                onPress={() => setPrompt('Create a morning routine loop')}
                disabled={loading}
              >
                <Text style={styles.exampleText}>• "Create a morning routine loop"</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPrompt('Weekly workout plan for strength training')}
                disabled={loading}
              >
                <Text style={styles.exampleText}>• "Weekly workout plan for strength training"</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPrompt('Daily tasks for a software developer')}
                disabled={loading}
              >
                <Text style={styles.exampleText}>• "Daily tasks for a software developer"</Text>
              </TouchableOpacity>
            </View>

            {/* Input */}
            <TextInput
              style={styles.input}
              placeholder="E.g., Create a healthy lifestyle loop with diet and exercise"
              placeholderTextColor="#999"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!loading}
              textAlignVertical="top"
            />

            <Text style={styles.charCount}>
              {prompt.length}/500 characters
            </Text>

            {/* Rate Limit Display */}
            {!loadingQuota && quota && (
              <View style={styles.quotaContainer}>
                <Text style={styles.quotaTitle}>Your Usage:</Text>
                <View style={styles.quotaRow}>
                  <Text style={styles.quotaLabel}>Daily:</Text>
                  <Text style={styles.quotaValue}>
                    {remainingDaily} / {quota.dailyLimit} remaining
                  </Text>
                </View>
                <View style={styles.quotaRow}>
                  <Text style={styles.quotaLabel}>Monthly:</Text>
                  <Text style={styles.quotaValue}>
                    {remainingMonthly} / {quota.monthlyLimit} remaining
                  </Text>
                </View>
                <View style={styles.quotaRow}>
                  <Text style={styles.quotaLabel}>Total Cost:</Text>
                  <Text style={styles.quotaValue}>
                    ${quota.totalCostUsd.toFixed(4)}
                  </Text>
                </View>
              </View>
            )}

            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Generate Button */}
            <TouchableOpacity
              style={[
                styles.generateButton,
                (loading || !prompt.trim() || (rateLimit && !rateLimit.allowed)) &&
                  styles.generateButtonDisabled,
              ]}
              onPress={handleGenerate}
              disabled={loading || !prompt.trim() || (rateLimit && !rateLimit.allowed)}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.generateButtonText}>
                    Generating with AI...
                  </Text>
                </View>
              ) : (
                <Text style={styles.generateButtonText}>
                  Generate Loop with AI ✨
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {/* Info Footer */}
            <Text style={styles.infoText}>
              🔒 Your data is secure. AI requests are rate-limited and monitored.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 600 : '100%',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold' as const,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  examplesContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#0CB6CC',
    marginBottom: 4,
    paddingVertical: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    color: '#1a1a1a',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right' as const,
    marginTop: 4,
    marginBottom: 16,
  },
  quotaContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quotaTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  quotaRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },
  quotaLabel: {
    fontSize: 14,
    color: '#666',
  },
  quotaValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500' as const,
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  errorText: {
    color: '#cc0000',
    fontSize: 14,
  },
  generateButton: {
    backgroundColor: '#0CB6CC',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center' as const,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center' as const,
    marginTop: 12,
    lineHeight: 18,
  },
};
