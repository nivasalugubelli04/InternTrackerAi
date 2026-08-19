import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  LearningService,
  AdaptiveRoadmapData,
  CareerReadinessData,
  DailyPlanData,
} from '../../services/learning.service';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

export default function LearningRoadmapScreen({ navigation }: any) {
  const [roadmap, setRoadmap] = useState<AdaptiveRoadmapData | null>(null);
  const [readiness, setReadiness] = useState<CareerReadinessData | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState<number>(60);
  const [expandedPhase, setExpandedPhase] = useState<number>(1);

  const loadData = async () => {
    try {
      const [rmData, crData, dpData] = await Promise.all([
        LearningService.getAdaptiveRoadmap(),
        LearningService.getCareerReadiness(),
        LearningService.getDailyPlan(),
      ]);
      setRoadmap(rmData);
      setReadiness(crData);
      setDailyPlan(dpData);
      setSelectedTimeline(rmData.timelineDays || 60);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load career roadmap.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTimelineChange = async (days: number) => {
    setSelectedTimeline(days);
    setIsLoading(true);
    try {
      const updated = await LearningService.generateAdaptiveRoadmap(
        roadmap?.targetRole || 'Software Engineer',
        days,
        'User adjusted target prep timeline',
      );
      setRoadmap(updated);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to adapt roadmap timeline.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand.purple} />
        <Text style={styles.loadingText}>Assembling AI Career Roadmap...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            loadData();
          }}
          colors={[Colors.brand.purple]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Career Roadmap</Text>
        <Text style={styles.subtitle}>
          Adaptive 7-phase skill building plan targeting your dream internship role.
        </Text>
      </View>

      {/* Career Readiness Card */}
      {readiness && (
        <View style={styles.readinessCard}>
          <View style={styles.readinessHeader}>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreValue}>{readiness.overallReadiness}%</Text>
              <Text style={styles.scoreLabel}>Readiness</Text>
            </View>
            <View style={styles.readinessTitleBox}>
              <Text style={styles.readinessRoleTitle}>{roadmap?.targetRole || 'Target Role'}</Text>
              <Text style={styles.readinessNarrative}>{readiness.narrativeSummary}</Text>
            </View>
          </View>

          {/* Breakdown Bars */}
          <View style={styles.breakdownGrid}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Skill Coverage</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${readiness.skillReadiness}%` }]} />
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Interview Prep</Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${readiness.interviewReadiness}%`, backgroundColor: '#34D399' },
                  ]}
                />
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Portfolio</Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${readiness.portfolioReadiness}%`, backgroundColor: '#FBBF24' },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Action to Skill Gap */}
          <TouchableOpacity
            style={styles.gapCTA}
            onPress={() => navigation.navigate('SkillGapScreen')}
          >
            <Text style={styles.gapCTAText}>View Skill Gap Analysis →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Daily Study Plan Widget */}
      {dailyPlan && (
        <View style={styles.dailyPlanCard}>
          <View style={styles.dailyPlanHeader}>
            <View>
              <Text style={styles.dailyPlanBadge}>TODAY'S SCHEDULE</Text>
              <Text style={styles.dailyPlanTitle}>{dailyPlan.dailyGoalTitle}</Text>
            </View>
            <Text style={styles.streakText}>🔥 {dailyPlan.streakDays}d streak</Text>
          </View>

          {dailyPlan.blocks.map((block, idx) => (
            <View key={idx} style={styles.dailyBlockRow}>
              <View
                style={[
                  styles.categoryPill,
                  block.category === 'CONCEPT'
                    ? styles.pillConcept
                    : block.category === 'PRACTICE'
                      ? styles.pillPractice
                      : styles.pillProject,
                ]}
              >
                <Text style={styles.categoryPillText}>{block.category}</Text>
              </View>
              <View style={styles.blockInfo}>
                <Text style={styles.blockTitle}>{block.title}</Text>
                <Text style={styles.blockAction}>{block.action}</Text>
              </View>
              <Text style={styles.blockDuration}>{block.durationMinutes}m</Text>
            </View>
          ))}
        </View>
      )}

      {/* Timeline Switcher Pills */}
      <View style={styles.timelinePillContainer}>
        <Text style={styles.timelinePillLabel}>Prep Horizon:</Text>
        {[30, 60, 90, 180].map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.timelinePill, selectedTimeline === days && styles.timelinePillActive]}
            onPress={() => handleTimelineChange(days)}
          >
            <Text
              style={[
                styles.timelinePillText,
                selectedTimeline === days && styles.timelinePillTextActive,
              ]}
            >
              {days} Days
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 7-Phase Vertical Timeline */}
      <Text style={styles.sectionHeader}>7-Phase Roadmap</Text>
      {roadmap?.phases.map((phase) => {
        const isExpanded = expandedPhase === phase.phase;
        const isCurrent = (roadmap.currentPhase || 1) === phase.phase;

        return (
          <View key={phase.phase} style={styles.phaseRow}>
            <View style={styles.timelineColumn}>
              <View
                style={[
                  styles.timelineDot,
                  isCurrent && styles.timelineDotCurrent,
                  phase.phase < (roadmap.currentPhase || 1) && styles.timelineDotCompleted,
                ]}
              />
              <View style={styles.timelineLine} />
            </View>

            <TouchableOpacity
              style={[styles.phaseCard, isCurrent && styles.phaseCardCurrent]}
              onPress={() => setExpandedPhase(isExpanded ? 0 : phase.phase)}
              activeOpacity={0.8}
            >
              <View style={styles.phaseHeaderRow}>
                <View>
                  <Text style={styles.phaseNumber}>PHASE {phase.phase}</Text>
                  <Text style={styles.phaseTitle}>{phase.title}</Text>
                </View>
                <Text style={styles.phaseHours}>{phase.estimatedHours} hrs</Text>
              </View>

              {/* Skills Tags */}
              <View style={styles.skillsTagRow}>
                {phase.skillsCovered.map((s, sIdx) => (
                  <View key={sIdx} style={styles.skillTag}>
                    <Text style={styles.skillTagText}>{s}</Text>
                  </View>
                ))}
              </View>

              {/* Expanded Milestones */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  {phase.milestones.map((ms, mIdx) => (
                    <View key={mIdx} style={styles.milestoneItem}>
                      <Text style={styles.milestoneTitle}>
                        • {ms.title} ({ms.estimatedMinutes}m)
                      </Text>
                      <Text style={styles.milestoneDesc}>{ms.description}</Text>
                      {ms.tasks.map((task, tIdx) => (
                        <Text key={tIdx} style={styles.taskBullet}>
                          - {task}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      })}

      {/* AI Coach Quick CTA */}
      <TouchableOpacity
        style={styles.coachBanner}
        onPress={() => navigation.navigate('InterviewCoachScreen')}
      >
        <Text style={styles.coachBannerTitle}>🤖 Ask AI Learning Coach</Text>
        <Text style={styles.coachBannerSubtitle}>
          Get instant concept explanations, code examples, hints, and practice questions.
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  readinessCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  readinessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.glass.surface,
    borderColor: Colors.glass.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  scoreValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.brand.purpleLight,
  },
  scoreLabel: {
    fontSize: 9,
    color: Colors.text.secondary,
  },
  readinessTitleBox: {
    flex: 1,
  },
  readinessRoleTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  readinessNarrative: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  breakdownGrid: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  breakdownItem: {
    marginBottom: Spacing.xs,
  },
  breakdownLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.background.tertiary,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.brand.purple,
    borderRadius: 3,
  },
  gapCTA: {
    marginTop: Spacing.md,
    alignSelf: 'flex-end',
  },
  gapCTAText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.bold,
  },
  dailyPlanCard: {
    backgroundColor: '#2A1F3D',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.brand.purple,
  },
  dailyPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  dailyPlanBadge: {
    fontSize: Typography.fontSize.xs,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.extrabold,
    letterSpacing: 0.5,
  },
  dailyPlanTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  streakText: {
    fontSize: Typography.fontSize.xs,
    color: '#F59E0B',
    fontWeight: Typography.fontWeight.bold,
  },
  dailyBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.tertiary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  pillConcept: { backgroundColor: '#312E81' },
  pillPractice: { backgroundColor: '#064E3B' },
  pillProject: { backgroundColor: '#78350F' },
  categoryPillText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.text.primary,
  },
  blockInfo: {
    flex: 1,
  },
  blockTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  blockAction: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  blockDuration: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.brand.purpleLight,
  },
  timelinePillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  timelinePillLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.semibold,
    marginRight: Spacing.xs,
  },
  timelinePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  timelinePillActive: {
    backgroundColor: Colors.brand.purple,
    borderColor: Colors.brand.purple,
  },
  timelinePillText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  timelinePillTextActive: {
    color: '#FFFFFF',
    fontWeight: Typography.fontWeight.bold,
  },
  sectionHeader: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
  },
  phaseRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineColumn: {
    width: 24,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border.subtle,
    marginTop: 4,
  },
  timelineDotCurrent: {
    backgroundColor: Colors.brand.purple,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  timelineDotCompleted: {
    backgroundColor: '#34D399',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border.subtle,
    marginTop: 4,
  },
  phaseCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  phaseCardCurrent: {
    borderColor: Colors.brand.purple,
    borderWidth: 1.5,
  },
  phaseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  phaseNumber: {
    fontSize: 10,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.extrabold,
  },
  phaseTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  phaseHours: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  skillsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: Spacing.xs,
  },
  skillTag: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillTagText: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  expandedContent: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  milestoneItem: {
    marginBottom: Spacing.sm,
  },
  milestoneTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  milestoneDesc: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  taskBullet: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
  },
  coachBanner: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.brand.purple,
  },
  coachBannerTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.bold,
  },
  coachBannerSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});
