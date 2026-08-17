import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';

import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { opportunitiesService } from '../services/opportunities.service';
import type { DismissReason } from '../services/opportunities.service';
import { MatchScoreBadge, MatchScoreBreakdown } from '../components/opportunities/MatchScoreBadge';
import { DeadlineBadge } from '../components/opportunities/DeadlineBadge';
import { OpportunityCardSkeleton } from '../components/opportunities/OpportunityCard';
import { useCreateApplication, ApplicationStatus } from '../services/applications.service';

type RouteParams = { OpportunityDetails: { jobId: string } };

const DISMISS_REASONS: { label: string; value: DismissReason }[] = [
  { label: 'Not relevant to me', value: 'NOT_RELEVANT' },
  { label: 'Wrong location', value: 'WRONG_LOCATION' },
  { label: "I don't have the skills", value: 'MISSING_SKILLS' },
  { label: 'Already applied', value: 'ALREADY_APPLIED' },
  { label: 'Not interested', value: 'NOT_INTERESTED' },
  { label: 'Other', value: 'OTHER' },
];

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function OpportunityDetailsScreen(): React.ReactElement {
  const route = useRoute<RouteProp<RouteParams, 'OpportunityDetails'>>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { jobId } = route.params;

  const {
    data: job,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['opportunity', jobId],
    queryFn: () => opportunitiesService.getById(jobId),
    staleTime: 2 * 60 * 1000,
  });

  const { mutate: createApplication } = useCreateApplication();

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
      setIsSaved(!next); // revert
      Alert.alert('Error', 'Could not save this opportunity. Please try again.');
    }
  }, [job, currentlySaved, queryClient]);

  const handleApply = useCallback(async () => {
    if (!job?.applicationUrl) return;
    await opportunitiesService.trackInteraction('APPLY_CLICK', job.id);
    try {
      await Linking.openURL(job.applicationUrl);
      Alert.alert(
        'Application Tracking',
        'Did you apply for this role? Would you like to track it?',
        [
          { text: 'Not yet', style: 'cancel' },
          {
            text: 'Yes, track it',
            onPress: () => {
              createApplication(
                { jobId: job.id, status: ApplicationStatus.APPLIED },
                {
                  onSuccess: () => {
                    Alert.alert('Success', 'Application is now tracked in your Application Board.');
                  },
                },
              );
            },
          },
        ],
      );
    } catch {
      Alert.alert('Error', 'Could not open the application link.');
    }
  }, [job, createApplication]);

  const handleAiCopilot = useCallback(async () => {
    if (!job) return;
    await opportunitiesService.trackInteraction('AI_COPILOT_OPEN', job.id);
    navigation.navigate('AiCopilot', {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company?.name,
    });
  }, [job, navigation]);

  const handleDismiss = useCallback(() => {
    Alert.alert('Not Interested?', 'Tell us why — it helps us improve your recommendations.', [
      ...DISMISS_REASONS.map((r) => ({
        text: r.label,
        onPress: async () => {
          await opportunitiesService.dismiss(jobId, r.value);
          queryClient.invalidateQueries({ queryKey: ['opportunities', 'feed'] });
          navigation.goBack();
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [jobId, navigation, queryClient]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : Spacing.lg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
          <OpportunityCardSkeleton />
          <OpportunityCardSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorTitle}>Opportunity Not Found</Text>
        <Text style={styles.errorSubtitle}>This internship may no longer be available.</Text>
        <TouchableOpacity style={styles.backBtnLg} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnLgText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const postedDate = job.postedDate
    ? new Date(job.postedDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <View style={styles.container}>
      {/* Sticky Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : Spacing.lg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveHeaderBtn, currentlySaved && styles.saveHeaderBtnActive]}
        >
          <Text
            style={[styles.saveHeaderBtnText, currentlySaved && styles.saveHeaderBtnTextActive]}
          >
            {currentlySaved ? '♥ Saved' : '♡ Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Company hero */}
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

        {/* Job title + match score */}
        <View style={styles.titleRow}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <MatchScoreBadge matchScore={job.matchScore} size="lg" />
        </View>

        {/* Quick info chips */}
        <View style={styles.chipRow}>
          {job.location && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>📍 {job.location}</Text>
            </View>
          )}
          {job.workMode && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {job.workMode === 'REMOTE' ? '🌐' : job.workMode === 'HYBRID' ? '🏠' : '🏢'}{' '}
                {job.workMode}
              </Text>
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
          {job.employmentType && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>💼 {job.employmentType}</Text>
            </View>
          )}
        </View>

        {/* Deadline */}
        <View style={styles.card}>
          <DeadlineBadge deadline={job.deadline} urgency={job.deadlineUrgency} />
          <InfoRow label="Posted" value={postedDate} />
          {job.applicationUrl && (
            <InfoRow
              label="Apply"
              value={
                job.applicationUrl.length > 50
                  ? job.applicationUrl.slice(0, 47) + '...'
                  : job.applicationUrl
              }
            />
          )}
        </View>

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
            <Text style={styles.cardTitle}>⭐ Why This Role?</Text>
            {job.recommendation.reasons.slice(0, 5).map((r: any, i: number) => (
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
        {job.requirements.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔧 Requirements</Text>
            <View style={styles.skillsGrid}>
              {job.requirements.map((req: string) => (
                <View key={req} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{req}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Responsibilities */}
        {job.responsibilities.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📌 Responsibilities</Text>
            {job.responsibilities.map((r: string, i: number) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Benefits */}
        {job.benefits.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎁 Benefits</Text>
            {job.benefits.map((b: string, i: number) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bullet}>✓</Text>
                <Text style={[styles.bulletText, { color: Colors.success }]}>{b}</Text>
              </View>
            ))}
          </View>
        )}

        {/* About Company */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏢 About {job.company.name}</Text>
          {job.company.description && (
            <Text style={styles.bodyText}>{job.company.description}</Text>
          )}
          <View style={{ marginTop: Spacing.sm }}>
            <InfoRow label="HQ" value={job.company.headquarters} />
            <InfoRow label="Size" value={job.company.companySize} />
            <InfoRow label="Industry" value={job.company.industry} />
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity style={styles.dismissActionBtn} onPress={handleDismiss}>
          <Text style={styles.dismissActionText}>✕ Dismiss</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.aiBtn} onPress={handleAiCopilot}>
          <Text style={styles.aiBtnText}>🤖 AI Help</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
          <Text style={styles.applyBtnText}>Apply Now →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  centered: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  backBtn: { padding: Spacing.xs },
  backBtnText: {
    color: Colors.brand.purpleLight,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  saveHeaderBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  saveHeaderBtnActive: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: Colors.error },
  saveHeaderBtnText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  saveHeaderBtnTextActive: { color: Colors.error },
  scroll: { flex: 1 },
  heroSection: { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  companyLogo: { width: 72, height: 72, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  companyLogoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  companyLogoLetter: {
    color: Colors.brand.purpleLight,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  companyName: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  industryTag: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
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
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.extrabold,
    lineHeight: 28,
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
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
  },
  infoRow: { flexDirection: 'row', marginBottom: Spacing.xs, gap: Spacing.sm },
  infoLabel: { color: Colors.text.muted, fontSize: Typography.fontSize.sm, minWidth: 70 },
  infoValue: { flex: 1, color: Colors.text.secondary, fontSize: Typography.fontSize.sm },
  reasonRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
    alignItems: 'flex-start',
  },
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
    lineHeight: 20,
  },
  bodyText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, lineHeight: 22 },
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
  bulletRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: 6, alignItems: 'flex-start' },
  bullet: {
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.sm,
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  ctaBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    gap: Spacing.sm,
  },
  dismissActionBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissActionText: { color: Colors.text.muted, fontSize: Typography.fontSize.xs },
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
    fontSize: Typography.fontSize.sm,
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
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  errorEmoji: { fontSize: 64, marginBottom: Spacing.lg },
  errorTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  errorSubtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  backBtnLg: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.brand.purple,
  },
  backBtnLgText: { color: Colors.white, fontWeight: Typography.fontWeight.semibold },
});
