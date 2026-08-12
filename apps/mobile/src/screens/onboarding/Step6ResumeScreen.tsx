import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { StepProgressBar } from '../../components/common/StepProgressBar';
import { StepHeader } from '../../components/common/StepHeader';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { resumeApi, type Resume } from '../../services/profile.service';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Step6Resume'>;

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Step6ResumeScreen({ navigation }: Props): React.ReactElement {
  const [resume, setResume] = useState<Resume | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickResume = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      // Validate size
      if (file.size && file.size > MAX_SIZE) {
        Alert.alert('File too large', 'Please select a file smaller than 5 MB.');
        return;
      }

      // Get actual size if not provided
      let fileSize = file.size ?? 0;
      if (!fileSize && file.uri) {
        const info = await FileSystem.getInfoAsync(file.uri);
        if (info.exists) fileSize = info.size ?? 0;
      }

      if (fileSize > MAX_SIZE) {
        Alert.alert('File too large', 'Please select a file smaller than 5 MB.');
        return;
      }

      setUploading(true);

      // Simulate progress animation
      const interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 15, 90));
      }, 200);

      // In Phase 2 we register the file metadata with a placeholder URL.
      // Phase 3 will upload to S3 and return a real URL.
      const placeholderUrl = `https://storage.interntracker.ai/resumes/${Date.now()}-${file.name}`;

      const mimeType = file.mimeType ?? 'application/pdf';

      try {
        const uploaded = await resumeApi.upload({
          fileName: file.name,
          fileUrl: placeholderUrl,
          fileSize,
          mimeType,
        });

        clearInterval(interval);
        setUploadProgress(100);
        setResume(uploaded);
      } catch (err: unknown) {
        clearInterval(interval);
        setUploadProgress(0);
        Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        setUploading(false);
      }
    } catch {
      Alert.alert('Error', 'Could not open document picker.');
    }
  };

  const deleteResume = async (): Promise<void> => {
    try {
      await resumeApi.delete();
      setResume(null);
      setUploadProgress(0);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete resume.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StepProgressBar currentStep={6} totalSteps={8} stepLabel="Resume" />
      <View style={styles.content}>
        <StepHeader emoji="📄" title="Upload Resume" subtitle="PDF or DOCX • Maximum 5 MB" />

        {resume ? (
          <View style={styles.fileCard}>
            <View style={styles.fileIcon}>
              <Text style={styles.fileIconText}>
                {resume.mimeType.includes('pdf') ? '📄' : '📝'}
              </Text>
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>{resume.fileName}</Text>
              <Text style={styles.fileSize}>{formatSize(resume.fileSize)}</Text>
              <Text style={styles.fileDate}>Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity onPress={() => { void deleteResume(); }} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.dropZone, uploading && styles.dropZoneUploading]}
            onPress={() => { void pickResume(); }}
            activeOpacity={0.7}
            disabled={uploading}
          >
            <Text style={styles.dropZoneEmoji}>📁</Text>
            <Text style={styles.dropZoneTitle}>
              {uploading ? 'Uploading...' : 'Tap to select file'}
            </Text>
            <Text style={styles.dropZoneSubtitle}>PDF or DOCX • Max 5 MB</Text>

            {uploading ? (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
            ) : null}
          </TouchableOpacity>
        )}

        {resume ? (
          <TouchableOpacity style={styles.replaceBtn} onPress={() => { void pickResume(); }} disabled={uploading}>
            <Text style={styles.replaceText}>↩ Replace resume</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Tips for a great resume:</Text>
          {['Keep it to 1–2 pages', 'Use a professional format', 'Highlight projects & achievements', 'Include your GitHub / portfolio link'].map((tip) => (
            <Text key={tip} style={styles.tip}>• {tip}</Text>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate('Step7Notifications')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <PrimaryButton
          title="Continue →"
          onPress={() => navigation.navigate('Step7Notifications')}
          style={{ flex: 1, marginLeft: Spacing.md }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  content: { flex: 1, paddingHorizontal: Spacing.xl },
  fileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.md, marginBottom: Spacing.md,
  },
  fileIcon: { width: 48, height: 48, backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  fileIconText: { fontSize: 24 },
  fileInfo: { flex: 1 },
  fileName: { color: Colors.text.primary, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium },
  fileSize: { color: Colors.text.muted, fontSize: Typography.fontSize.xs },
  fileDate: { color: Colors.text.muted, fontSize: Typography.fontSize.xs },
  deleteBtn: { padding: Spacing.sm },
  deleteText: { color: Colors.error, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
  dropZone: {
    borderWidth: 2, borderColor: Colors.border.default, borderStyle: 'dashed',
    borderRadius: BorderRadius.lg, padding: Spacing['2xl'],
    alignItems: 'center', marginBottom: Spacing.md, backgroundColor: Colors.background.secondary,
  },
  dropZoneUploading: { borderColor: Colors.brand.purple },
  dropZoneEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  dropZoneTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, marginBottom: 4 },
  dropZoneSubtitle: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
  progressTrack: { width: '100%', height: 4, backgroundColor: Colors.background.tertiary, borderRadius: BorderRadius.full, overflow: 'hidden', marginTop: Spacing.md },
  progressFill: { height: '100%', backgroundColor: Colors.brand.purple, borderRadius: BorderRadius.full },
  replaceBtn: { alignItems: 'center', marginBottom: Spacing.md },
  replaceText: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.sm },
  tips: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.md },
  tipsTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.sm },
  tip: { color: Colors.text.muted, fontSize: Typography.fontSize.sm, marginBottom: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  skipBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  skipText: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
});
