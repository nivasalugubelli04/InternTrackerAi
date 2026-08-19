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

export default function InterviewReportScreen(): React.ReactElement {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { sessionId } = (route.params as { sessionId: string }) || {};

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [expandedQIndex, setExpandedQIndex] = useState<number | null>(0);

  useEffect(() => {
    if (sessionId) {
      interviewsService
        .getSessionReport(sessionId)
        .then(setReport)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [sessionId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.purple} />
          <Text style={styles.loadingText}>Generating Performance Report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.loadingText}>Report could not be retrieved.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { session, job, questions, categoryBreakdown, weakAreas } = report;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interview Report</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Summary Banner */}
        <View style={styles.scoreBanner}>
          <Text style={styles.roleTitle}>{job?.title || 'Mock Interview'}</Text>
          <Text style={styles.companySub}>{job?.companyName || 'Technical Practice'}</Text>

          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{session.score}%</Text>
            <Text style={styles.scoreLabel}>OVERALL SCORE</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        {categoryBreakdown && categoryBreakdown.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Category Performance</Text>
            {categoryBreakdown.map((cat: any, idx: number) => (
              <View key={idx} style={styles.catRow}>
                <Text style={styles.catName}>{cat.category}</Text>
                <View style={styles.catBarBg}>
                  <View style={[styles.catBarFill, { width: `${cat.averageScore}%` }]} />
                </View>
                <Text style={styles.catScore}>{cat.averageScore}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Question-by-Question Analysis */}
        <Text style={styles.sectionTitle}>Question Breakdown ({questions?.length || 0})</Text>

        {(questions || []).map((q: any, idx: number) => {
          const isExpanded = expandedQIndex === idx;
          const score = q.overallScore ? Math.round(q.overallScore * 10) : q.score || 0;

          return (
            <View key={q.id || idx} style={styles.qCard}>
              <TouchableOpacity
                style={styles.qHeader}
                onPress={() => setExpandedQIndex(isExpanded ? null : idx)}
              >
                <View style={styles.qHeaderLeft}>
                  <Text style={styles.qIndex}>Q{idx + 1}</Text>
                  <Text style={styles.qTextPreview} numberOfLines={2}>
                    {q.question}
                  </Text>
                </View>
                <View style={styles.qHeaderRight}>
                  <Text
                    style={[
                      styles.qScore,
                      {
                        color:
                          score >= 75
                            ? Colors.success
                            : score >= 50
                              ? Colors.warning
                              : Colors.error,
                      },
                    ]}
                  >
                    {score}%
                  </Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.text.muted}
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.qBody}>
                  <Text style={styles.bodySectionTitle}>Your Answer:</Text>
                  <Text style={styles.answerText}>{q.answer || 'No answer provided'}</Text>

                  {/* STAR Components if available */}
                  {q.starAnalysis && (
                    <View style={styles.starBox}>
                      <Text style={styles.starTitle}>STAR Structure Detection:</Text>
                      <View style={styles.starChips}>
                        <StarChip label="S (Situation)" active={q.starAnalysis.situation} />
                        <StarChip label="T (Task)" active={q.starAnalysis.task} />
                        <StarChip label="A (Action)" active={q.starAnalysis.action} />
                        <StarChip label="R (Result)" active={q.starAnalysis.result} />
                      </View>
                      {q.starAnalysis.feedback && (
                        <Text style={styles.starFeedback}>{q.starAnalysis.feedback}</Text>
                      )}
                    </View>
                  )}

                  {/* Feedback */}
                  {q.feedback && (
                    <View style={styles.feedbackBox}>
                      <Text style={styles.bodySectionTitle}>AI Feedback:</Text>
                      <Text style={styles.feedbackText}>{q.feedback}</Text>
                    </View>
                  )}

                  {/* Model Answer */}
                  {q.modelAnswer && (
                    <View style={styles.modelAnswerBox}>
                      <Text style={styles.modelAnswerHeader}>💡 Model Answer Example:</Text>
                      <Text style={styles.modelAnswerText}>{q.modelAnswer}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Skill Gap Recommendations */}
        {weakAreas && weakAreas.length > 0 && (
          <View style={styles.gapCard}>
            <Text style={styles.gapTitle}>Detected Skill Gaps</Text>
            <Text style={styles.gapSub}>
              These areas require practice based on your session results:
            </Text>
            {weakAreas.map((skill: string, sIdx: number) => (
              <View key={sIdx} style={styles.gapItem}>
                <Ionicons name="alert-circle" size={18} color={Colors.warning} />
                <Text style={styles.gapText}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        {/* CTAs */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('MockInterview', { mode: 'QUICK_PRACTICE' })}
        >
          <Text style={styles.primaryBtnText}>Practice Weak Areas Again</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StarChip({ label, active }: { label: string; active: boolean }) {
  return (
    <View
      style={[
        styles.starChip,
        { backgroundColor: active ? Colors.success + '22' : Colors.background.tertiary },
      ]}
    >
      <Text style={[styles.starChipText, { color: active ? Colors.success : Colors.text.muted }]}>
        {active ? '✓ ' : '✗ '}
        {label}
      </Text>
    </View>
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
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  scrollContent: { padding: Spacing.md },
  scoreBanner: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glass.border,
    marginBottom: Spacing.lg,
  },
  roleTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  companySub: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.glass.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.brand.purpleLight,
  },
  scoreNumber: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.text.primary,
  },
  scoreLabel: {
    fontSize: 9,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  sectionHeader: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  catRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  catName: { flex: 2, fontSize: Typography.fontSize.xs, color: Colors.text.secondary },
  catBarBg: {
    flex: 3,
    height: 8,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  catBarFill: { height: '100%', backgroundColor: Colors.brand.purple, borderRadius: 4 },
  catScore: {
    width: 36,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
    textAlign: 'right',
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  qCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  qHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  qHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  qIndex: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.brand.purpleLight,
    marginRight: 8,
  },
  qTextPreview: { flex: 1, fontSize: Typography.fontSize.sm, color: Colors.text.primary },
  qHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  qScore: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginRight: 6,
  },
  qBody: {
    padding: Spacing.md,
    backgroundColor: Colors.background.tertiary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  bodySectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  answerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  starBox: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  starTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  starChips: { flexDirection: 'row', flexWrap: 'wrap' },
  starChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  starChipText: { fontSize: 11, fontWeight: Typography.fontWeight.semibold },
  starFeedback: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary, marginTop: 4 },
  feedbackBox: { marginBottom: Spacing.md },
  feedbackText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  modelAnswerBox: {
    backgroundColor: Colors.glass.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  modelAnswerHeader: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.brand.purpleLight,
    marginBottom: 4,
  },
  modelAnswerText: { fontSize: Typography.fontSize.sm, color: Colors.text.primary, lineHeight: 20 },
  gapCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  gapTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  gapSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  gapItem: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  gapText: { fontSize: Typography.fontSize.sm, color: Colors.text.primary, marginLeft: 6 },
  primaryBtn: {
    backgroundColor: Colors.brand.purple,
    borderRadius: BorderRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  primaryBtnText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.base,
  },
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  retryBtnText: { color: Colors.white, fontWeight: Typography.fontWeight.bold },
});
