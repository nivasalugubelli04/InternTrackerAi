import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { betaService } from '../../services/beta.service';

const THEME = {
  primary: '#246BFE',
  deep: '#1456D9',
  sky: '#EAF3FF',
  soft: '#F3F7FF',
  white: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  border: '#E7EAF0',
  green: '#79F28A',
  softGreen: '#E9FBEA',
  error: '#EF4444',
};

type FeedbackMode = 'GENERAL' | 'BUG' | 'FEATURE_REQUEST' | 'EXPERIENCE_RATING';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialFeature?: string;
}

export const BetaFeedbackModal: React.FC<Props> = ({
  visible,
  onClose,
  initialFeature = 'GENERAL',
}) => {
  const [mode, setMode] = useState<FeedbackMode>('GENERAL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [selectedFeature, setSelectedFeature] = useState(initialFeature);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const features = [
    'Opportunity Discovery',
    'Application Tracking',
    'AI Career Copilot',
    'Skill Intelligence',
    'Career Execution Engine',
    'Career Simulation',
    'General Experience',
  ];

  const handleSubmit = async () => {
    if (!message.trim() && mode !== 'EXPERIENCE_RATING') {
      setErrorMessage('Please provide some details before submitting.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'BUG') {
        await betaService.reportBug({
          title: title.trim() || 'Bug Report',
          description: message.trim(),
          affectedFeature: selectedFeature,
          severity: 'P2',
        });
      } else if (mode === 'EXPERIENCE_RATING') {
        await betaService.submitContextualRating({
          feature: selectedFeature,
          rating,
          comment: message.trim() || undefined,
        });
      } else {
        await betaService.submitFeedback({
          type: mode === 'FEATURE_REQUEST' ? 'FEATURE_REQUEST' : 'GENERAL',
          category: selectedFeature.toUpperCase().replace(/\s+/g, '_'),
          title: title.trim() || undefined,
          message: message.trim(),
          rating,
        });
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setTitle('');
        setMessage('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || 'Failed to submit feedback. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Help Improve InternTracker AI</Text>
              <Text style={styles.headerSubtitle}>Beta Feedback & Direct Input</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close feedback modal"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {isSuccess ? (
            <View style={styles.successState}>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successTitle}>Thank You for Your Feedback!</Text>
              <Text style={styles.successDesc}>
                Your insights help our product team improve InternTracker AI for all students.
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Mode Selector Tabs */}
              <View style={styles.tabsRow}>
                <TouchableOpacity
                  style={[styles.tab, mode === 'GENERAL' && styles.tabActive]}
                  onPress={() => setMode('GENERAL')}
                >
                  <Text style={[styles.tabText, mode === 'GENERAL' && styles.tabTextActive]}>
                    💬 Feedback
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tab, mode === 'BUG' && styles.tabActive]}
                  onPress={() => setMode('BUG')}
                >
                  <Text style={[styles.tabText, mode === 'BUG' && styles.tabTextActive]}>
                    🐞 Report Bug
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tab, mode === 'FEATURE_REQUEST' && styles.tabActive]}
                  onPress={() => setMode('FEATURE_REQUEST')}
                >
                  <Text
                    style={[styles.tabText, mode === 'FEATURE_REQUEST' && styles.tabTextActive]}
                  >
                    💡 Suggest Feature
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Feature Category Selector */}
              <Text style={styles.inputLabel}>Affected Area / Feature</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {features.map((feat) => (
                  <TouchableOpacity
                    key={feat}
                    style={[styles.chip, selectedFeature === feat && styles.chipActive]}
                    onPress={() => setSelectedFeature(feat)}
                  >
                    <Text
                      style={[styles.chipText, selectedFeature === feat && styles.chipTextActive]}
                    >
                      {feat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title input (for bug / feature request) */}
              {(mode === 'BUG' || mode === 'FEATURE_REQUEST') && (
                <>
                  <Text style={styles.inputLabel}>Summary / Title</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={
                      mode === 'BUG'
                        ? 'e.g. Filters reset unexpectedly'
                        : 'e.g. Add 1-click apply sync'
                    }
                    placeholderTextColor={THEME.secondary}
                    value={title}
                    onChangeText={setTitle}
                  />
                </>
              )}

              {/* Experience Rating */}
              <Text style={styles.inputLabel}>How is your experience with this feature?</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={[styles.starBtn, rating >= star && styles.starBtnActive]}
                    onPress={() => setRating(star)}
                  >
                    <Text style={styles.starIcon}>{rating >= star ? '⭐' : '☆'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description Input */}
              <Text style={styles.inputLabel}>
                {mode === 'BUG' ? 'What happened vs what you expected?' : 'Details & Suggestions'}
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Share your honest thoughts. Be as detailed as you like..."
                placeholderTextColor={THEME.secondary}
                multiline
                numberOfLines={4}
                value={message}
                onChangeText={setMessage}
              />

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={THEME.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Submit to Product Team →</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.deep,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.soft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: THEME.secondary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: THEME.soft,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: THEME.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.secondary,
  },
  tabTextActive: {
    color: THEME.primary,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: THEME.soft,
    borderWidth: 1,
    borderColor: THEME.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: THEME.sky,
    borderColor: THEME.primary,
  },
  chipText: {
    fontSize: 12,
    color: THEME.secondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: THEME.deep,
    fontWeight: '700',
  },
  starRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  starBtn: {
    padding: 6,
    marginRight: 6,
  },
  starBtnActive: {},
  starIcon: {
    fontSize: 24,
  },
  textInput: {
    backgroundColor: THEME.soft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: THEME.text,
    marginBottom: 16,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: THEME.error,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.white,
  },
  successState: {
    padding: 40,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 13,
    color: THEME.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
