import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { interviewsService } from '../../services/interviews.service';

export default function InterviewPrepScreen(): React.ReactElement {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { jobId } = (route.params as { jobId: string }) || {};

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'plan'>('overview');

  useEffect(() => {
    if (jobId) {
      interviewsService
        .getPreparationWorkspace(jobId)
        .then(setWorkspace)
        .catch((err) => console.error('Failed to load workspace:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [jobId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.purple} />
          <Text style={styles.loadingText}>Building Interview Workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workspace) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.warning} />
          <Text style={styles.loadingText}>No interview workspace found for this job.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { job, readiness, topics, userStrengths, missingSkills, preparationPlan } = workspace;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preparation Workspace</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('InterviewCoach', { jobId: job.id, jobTitle: job.title })
          }
          style={styles.coachIconBtn}
        >
          <Ionicons name="sparkles" size={20} color={Colors.brand.purpleLight} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'topics' && styles.activeTab]}
          onPress={() => setActiveTab('topics')}
        >
          <Text style={[styles.tabText, activeTab === 'topics' && styles.activeTabText]}>
            Topics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'plan' && styles.activeTab]}
          onPress={() => setActiveTab('plan')}
        >
          <Text style={[styles.tabText, activeTab === 'plan' && styles.activeTabText]}>
            Prep Plan
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.companyName}>
            {job.companyName} • {job.location || 'Remote'}
          </Text>

          <View style={styles.readinessRow}>
            <View style={styles.readinessBadge}>
              <Text style={styles.readinessScoreNum}>{readiness?.overallReadiness || 75}%</Text>
              <Text style={styles.readinessScoreLabel}>READINESS</Text>
            </View>
            <View style={styles.readinessMeta}>
              <Text style={styles.metaText}>Technical: {readiness?.technicalReadiness || 70}%</Text>
              <Text style={styles.metaText}>
                Behavioral: {readiness?.behavioralReadiness || 65}%
              </Text>
            </View>
          </View>
        </View>

        {activeTab === 'overview' && (
          <View>
            {/* Strengths vs Missing */}
            <Text style={styles.sectionTitle}>Skill Alignment</Text>
            <View style={styles.alignmentRow}>
              <View style={styles.alignmentCard}>
                <Text style={[styles.alignmentHeader, { color: Colors.success }]}>
                  Matching Skills ({userStrengths?.length || 0})
                </Text>
                {(userStrengths || []).slice(0, 4).map((s: string, idx: number) => (
                  <Text key={idx} style={styles.alignmentItem}>
                    ✓ {s}
                  </Text>
                ))}
              </View>

              <View style={styles.alignmentCard}>
                <Text style={[styles.alignmentHeader, { color: Colors.warning }]}>
                  Skill Gaps ({missingSkills?.length || 0})
                </Text>
                {(missingSkills || []).slice(0, 4).map((s: string, idx: number) => (
                  <Text key={idx} style={styles.alignmentItem}>
                    ⚠ {s}
                  </Text>
                ))}
              </View>
            </View>

            {/* Quick Coach Advice */}
            <View style={styles.coachCard}>
              <View style={styles.coachHeader}>
                <Ionicons name="sparkles" size={18} color={Colors.brand.purpleLight} />
                <Text style={styles.coachTitle}>AI Coach Strategy</Text>
              </View>
              <Text style={styles.coachText}>
                Focus your preparation on closing your key missing skills (
                {missingSkills?.[0] || 'core concepts'}). Complete 1 Full Mock Interview to elevate
                your behavioral STAR readiness.
              </Text>
              <TouchableOpacity
                style={styles.askCoachBtn}
                onPress={() =>
                  navigation.navigate('InterviewCoach', { jobId: job.id, jobTitle: job.title })
                }
              >
                <Text style={styles.askCoachBtnText}>Ask AI Coach →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'topics' && (
          <View>
            <Text style={styles.sectionTitle}>Expected Interview Topics</Text>
            {topics?.technicalTopics && (
              <View style={styles.topicCategoryCard}>
                <Text style={styles.topicCatHeader}>💻 Technical Topics</Text>
                <View style={styles.chipRow}>
                  {topics.technicalTopics.map((t: string, idx: number) => (
                    <View key={idx} style={styles.topicChip}>
                      <Text style={styles.topicChipText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {topics?.behavioralTopics && (
              <View style={styles.topicCategoryCard}>
                <Text style={styles.topicCatHeader}>🗣️ Behavioral Topics</Text>
                <View style={styles.chipRow}>
                  {topics.behavioralTopics.map((t: string, idx: number) => (
                    <View key={idx} style={styles.topicChip}>
                      <Text style={styles.topicChipText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'plan' && preparationPlan && (
          <View>
            <Text style={styles.sectionTitle}>Preparation Tasks</Text>
            {(preparationPlan.tasks || []).map((task: any, idx: number) => (
              <View key={task.id || idx} style={styles.taskCard}>
                <Ionicons
                  name={task.status === 'COMPLETED' ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={task.status === 'COMPLETED' ? Colors.success : Colors.brand.purpleLight}
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskMeta}>
                    {task.category} • {task.priority}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Start Mock CTA */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('MockInterview', { jobId: job.id })}
        >
          <Ionicons name="play" size={20} color={Colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Start Mock Interview</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.text.secondary, marginTop: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  coachIconBtn: { padding: Spacing.xs },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    padding: 4,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.sm },
  activeTab: { backgroundColor: Colors.background.tertiary },
  tabText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.muted,
    fontWeight: Typography.fontWeight.semibold,
  },
  activeTabText: { color: Colors.brand.purpleLight },
  scrollContent: { padding: Spacing.md },
  banner: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    marginBottom: Spacing.lg,
  },
  jobTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  companyName: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  readinessRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
  readinessBadge: {
    backgroundColor: Colors.glass.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  readinessScoreNum: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.text.primary,
  },
  readinessScoreLabel: {
    fontSize: 8,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.bold,
  },
  readinessMeta: { marginLeft: Spacing.md },
  metaText: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary, marginVertical: 1 },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  alignmentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  alignmentCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginRight: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  alignmentHeader: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  alignmentItem: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginVertical: 2,
  },
  coachCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    marginBottom: Spacing.lg,
  },
  coachHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  coachTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.brand.purpleLight,
    marginLeft: 6,
  },
  coachText: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary, lineHeight: 18 },
  askCoachBtn: { marginTop: Spacing.sm },
  askCoachBtnText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.bold,
  },
  topicCategoryCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  topicCatHeader: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  topicChip: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginRight: 6,
    marginVertical: 3,
  },
  topicChipText: { fontSize: 11, color: Colors.text.secondary },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  taskTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  taskMeta: { fontSize: 10, color: Colors.text.muted, marginTop: 2 },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.brand.purple,
    borderRadius: BorderRadius.full,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  primaryBtnText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.base,
  },
});
