import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { opportunitiesService } from '../../services/opportunities.service';
import { useCreateApplication, ApplicationStatus } from '../../services/applications.service';
import { MatchScoreBadge, MatchScoreBreakdown } from './MatchScoreBadge';
import { DeadlineBadge } from './DeadlineBadge';

interface Props {
  jobId: string;
  isScreen?: boolean;
  onDismissSuccess?: () => void;
}

const DISMISS_REASONS = [
  { label: 'Not relevant to me', value: 'NOT_RELEVANT' },
  { label: 'Wrong location', value: 'WRONG_LOCATION' },
  { label: "I don't have the skills", value: 'MISSING_SKILLS' },
  { label: 'Already applied', value: 'ALREADY_APPLIED' },
  { label: 'Not interested', value: 'NOT_INTERESTED' },
];

export function OpportunityDetailPanel({
  jobId,
  isScreen = false,
  onDismissSuccess,
}: Props): React.ReactElement {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { mutate: createApplication } = useCreateApplication();

  const {
    data: job,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['opportunity', jobId],
    queryFn: () => opportunitiesService.getById(jobId),
    enabled: !!jobId,
    staleTime: 2 * 60 * 1000,
  });

  const [isSaved, setIsSaved] = React.useState<boolean | null>(null);
  const currentlySaved = isSaved ?? job?.isSaved ?? false;

  const handleSave = useCallback(async () => {
    if (!job) return;
    const next = !currentlySaved;
    setIsSaved(next);
    try {
      if (currentlySaved) {
        await opportunitiesService.unsave(job.id);
      } else {
        await opportunitiesService.save(job.id);
      }
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['career-center'] });
    } catch {
      setIsSaved(!next);
      Alert.alert('Error', 'Could not save opportunity.');
    }
  }, [job, currentlySaved, queryClient]);

  const handleApply = useCallback(async () => {
    if (!job?.applicationUrl) return;
    await opportunitiesService.trackInteraction('APPLY_CLICK', job.id);
    try {
      await Linking.openURL(job.applicationUrl);
      Alert.alert(
        'Application Tracking',
        'Did you apply for this role? Add to your tracker board.',
        [
          { text: 'Not yet', style: 'cancel' },
          {
            text: 'Yes, track it',
            onPress: () => {
              createApplication(
                { jobId: job.id, status: ApplicationStatus.APPLIED },
                {
                  onSuccess: () => {
                    Alert.alert('Success', 'Application added to board.');
                  },
                },
              );
            },
          },
        ],
      );
    } catch {
      Alert.alert('Error', 'Could not open application URL.');
    }
  }, [job, createApplication]);

  const handleDismiss = useCallback(() => {
    if (!job) return;
    Alert.alert('Not Interested?', 'Select a reason to dismiss this recommendation:', [
      ...DISMISS_REASONS.map((r) => ({
        text: r.label,
        onPress: async () => {
          await opportunitiesService.dismiss(job.id, r.value as any);
          queryClient.invalidateQueries({ queryKey: ['opportunities'] });
          if (onDismissSuccess) onDismissSuccess();
          else if (isScreen) navigation.goBack();
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [job, isScreen, navigation, onDismissSuccess, queryClient]);

  const handleLearnSkill = useCallback(
    (skillName: string) => {
      if (!job) return;
      navigation.navigate('AiChat', {
        initialMessage: `Help me learn ${skillName} for the ${job.title} internship role at ${job.company.name}.`,
      });
    },
    [job, navigation],
  );

  const handleGenerateRoadmap = useCallback(() => {
    if (!job) return;
    navigation.navigate('LearningRoadmap', {
      targetRole: job.title,
      targetCompany: job.company.name,
    });
  }, [job, navigation]);

  const handleAnalyzeSkillGap = useCallback(() => {
    if (!job) return;
    navigation.navigate('SkillGap', { jobId: job.id });
  }, [job, navigation]);

  const handleAiCopilot = useCallback(async () => {
    if (!job) return;
    await opportunitiesService.trackInteraction('AI_COPILOT_OPEN', job.id);
    navigation.navigate('AiCopilot', {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company?.name,
    });
  }, [job, navigation]);

  if (!jobId) {
    return (
      <View style={[styles.centered, { backgroundColor: Colors.background.primary }]}>
        <Text style={styles.emptyText}>Select an opportunity to view matching details</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: Colors.background.primary }]}>
        <ActivityIndicator size="large" color={Colors.brand.purple} />
        <Text style={styles.loadingText}>Analyzing match metrics...</Text>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={[styles.centered, { backgroundColor: Colors.background.primary }]}>
        <Text style={styles.errorText}>Failed to retrieve opportunity details</Text>
      </View>
    );
  }

  // Identify missing skills
  const missingSkills = job.missingSkills ?? [];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Company Header */}
        <View style={styles.heroSection}>
          {job.company.logoUrl ? (
            <Image
              source={{ uri: job.company.logoUrl }}
              style={styles.companyLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.companyLogoPlaceholder}>
              <Text style={styles.companyLogoLetter}>{job.company.name[0]?.toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.companyName}>{job.company.name}</Text>
          {job.company.industry && <Text style={styles.industryTag}>{job.company.industry}</Text>}
        </View>

        {/* Title & Badge */}
        <View style={styles.titleRow}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <MatchScoreBadge matchScore={job.matchScore} size="lg" />
        </View>

        {/* Meta Chips */}
        <View style={styles.chipRow}>
          {job.location && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>📍 {job.location}</Text>
            </View>
          )}
          {job.workMode && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>🌐 {job.workMode}</Text>
            </View>
          )}
          {job.stipend && (
            <View style={[styles.chip, styles.chipGreen]}>
              <Text style={[styles.chipText, { color: Colors.success }]}>
                ₹{(job.stipend / 1000).toFixed(0)}K/mo
              </Text>
            </View>
          )}
          {job.duration && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>⏱ {job.duration}</Text>
            </View>
          )}
        </View>

        {/* Deadline & Status */}
        <View style={styles.card}>
          <DeadlineBadge deadline={job.deadline} urgency={job.deadlineUrgency} />
          {job.postedDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Posted</Text>
              <Text style={styles.infoValue}>
                {new Date(job.postedDate).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Match Gaps (Missing Skills) */}
        {missingSkills.length > 0 && (
          <View style={[styles.card, styles.gapsCard]}>
            <Text style={styles.gapsTitle}>⚠️ Match Gaps Identified</Text>
            <Text style={styles.gapsSubtitle}>
              You are a strong fit, but you are missing: {missingSkills.join(', ')}
            </Text>
            <View style={styles.gapsChipsRow}>
              {missingSkills.map((skill: string) => (
                <TouchableOpacity
                  key={skill}
                  style={styles.learnSkillBtn}
                  onPress={() => handleLearnSkill(skill)}
                >
                  <Text style={styles.learnSkillText}>⚡ Learn {skill}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.gapActions}>
              <TouchableOpacity style={styles.gapActionBtn} onPress={handleGenerateRoadmap}>
                <Text style={styles.gapActionText}>🗓 Weekly Learning Roadmap</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gapActionBtn} onPress={handleAnalyzeSkillGap}>
                <Text style={styles.gapActionText}>📊 AI Skill Gap Analysis</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Match Score Breakdown */}
        {job.matchScore && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Match Score Breakdown</Text>
            <MatchScoreBreakdown matchScore={job.matchScore} />
          </View>
        )}

        {/* Why Recommended */}
        {job.recommendation?.reasons && job.recommendation.reasons.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⭐ AI Recommendations Insight</Text>
            {job.recommendation.reasons.map((r: any, i: number) => (
              <View key={i} style={styles.reasonRow}>
                <Text style={styles.reasonBullet}>✓</Text>
                <Text style={styles.reasonText}>{r.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        {job.description && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 About the Role</Text>
            <Text style={styles.bodyText}>{job.description}</Text>
          </View>
        )}

        {/* Requirements */}
        {job.requirements && job.requirements.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔧 Technical Requirements</Text>
            <View style={styles.skillsGrid}>
              {job.requirements.map((req: string) => (
                <View key={req} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{req}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.ctaBar}>
        <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
          <Text style={styles.dismissBtnText}>✕ Dismiss</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.aiBtn} onPress={handleAiCopilot}>
          <Text style={styles.aiBtnText}>🤖 AI Copilot</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
          <Text style={styles.applyBtnText}>Apply Now →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, currentlySaved && styles.saveBtnActive]}
          onPress={handleSave}
        >
          <Text style={[styles.saveBtnText, currentlySaved && styles.saveBtnTextActive]}>
            {currentlySaved ? '♥ Saved' : '♡ Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  scroll: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  loadingText: {
    color: Colors.text.muted,
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
  },
  emptyText: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
  errorText: { color: Colors.error, fontSize: Typography.fontSize.sm },
  heroSection: { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  companyLogo: { width: 64, height: 64, borderRadius: BorderRadius.md, marginBottom: Spacing.xs },
  companyLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  companyLogoLetter: {
    color: Colors.brand.purpleLight,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  companyName: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 2,
  },
  industryTag: { color: Colors.text.muted, fontSize: Typography.fontSize.xs },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  jobTitle: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.extrabold,
    lineHeight: 24,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  chipGreen: { borderColor: `${Colors.success}55`, backgroundColor: `${Colors.success}11` },
  chipText: { color: Colors.text.secondary, fontSize: Typography.fontSize.xs },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: Spacing.md,
  },
  cardTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  infoRow: { flexDirection: 'row', marginTop: Spacing.sm, gap: Spacing.sm },
  infoLabel: { color: Colors.text.muted, fontSize: Typography.fontSize.sm, minWidth: 70 },
  infoValue: { flex: 1, color: Colors.text.secondary, fontSize: Typography.fontSize.sm },
  bodyText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, lineHeight: 20 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  skillChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glass.surface,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  skillChipText: {
    color: Colors.brand.purpleLight,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  reasonRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: 8, alignItems: 'flex-start' },
  reasonBullet: {
    color: Colors.success,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 1,
  },
  reasonText: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
  },
  gapsCard: { borderColor: `${Colors.warning}66`, backgroundColor: `${Colors.warning}08` },
  gapsTitle: {
    color: Colors.warning,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  gapsSubtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  gapsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  learnSkillBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  learnSkillText: { color: Colors.white, fontSize: 11, fontWeight: Typography.fontWeight.bold },
  gapActions: { flexDirection: 'column', gap: Spacing.xs },
  gapActionBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  gapActionText: {
    color: Colors.brand.purpleLight,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  ctaBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  dismissBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: { color: Colors.text.muted, fontSize: Typography.fontSize.xs },
  aiBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    alignItems: 'center',
  },
  aiBtnText: {
    color: Colors.brand.purpleLight,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.brand.purple,
    alignItems: 'center',
  },
  applyBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  saveBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnActive: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: Colors.error },
  saveBtnText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  saveBtnTextActive: { color: Colors.error },
});
