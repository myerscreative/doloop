import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';

export interface AdminHelpContent {
  title: string;
  description: string;
  keyActions: string[];
  tips: string[];
}

interface AdminHelpModalProps {
  visible: boolean;
  onClose: () => void;
  content: AdminHelpContent;
}

export const AdminHelpModal: React.FC<AdminHelpModalProps> = ({ visible, onClose, content }) => {
  const { colors } = useTheme();

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      transparent={true}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="help-circle" size={32} color={colors.primary} />
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={[styles.title, { color: colors.text }]}>{content.title}</Text>

              {/* Description */}
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {content.description}
              </Text>

              {/* Key Actions */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Actions</Text>
                {content.keyActions.map((action, index) => (
                  <View key={index} style={styles.listItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    <Text style={[styles.listText, { color: colors.text }]}>{action}</Text>
                  </View>
                ))}
              </View>

              {/* Tips */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>💡 Pro Tips</Text>
                {content.tips.map((tip, index) => (
                  <View key={index} style={styles.listItem}>
                    <Ionicons name="bulb" size={20} color="#FFD700" />
                    <Text style={[styles.listText, { color: colors.text }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Footer */}
            <TouchableOpacity
              style={[styles.gotItButton, { backgroundColor: colors.primary }]}
              onPress={handleClose}
            >
              <Text style={styles.gotItButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    maxHeight: '85%',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerIcon: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    maxHeight: 500,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  gotItButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  gotItButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
