import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  LearningService,
  SkillGapData,
  ProjectRecommendationData,
} from '../../services/learning.service';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

interface Props {
  navigation?: any;
}

export default function SkillGapScreen({ navigation }: Props) {
  const [gapData, setGapData] = useState<SkillGapData | null>(null);
  const [projects, setProjects] = useState<ProjectRecommendationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gaps, projList] = await Promise.all([
          LearningService.getSkillGaps(),
          LearningService.getRecommendedProjects(),
        ]);
        setGapData(gaps);
        setProjects(projList);
      } catch (err: any) {
        Alert.alert('Error', 'Failed to retrieve multi-signal skill gap analysis.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brand.purple} />
        <Text style={styles.loadingText}>Analyzing multi-signal skill requirements...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Multi-Signal Skill Gap Analysis</Text>
      <Text style={styles.subtitle}>
        Connected analysis comparing target role requirements against opportunity signals, mock
        interviews, and tracked applications.
      </Text>

      {/* Coverage Banner */}
      {gapData && (
        <View style={styles.bannerCard}>
          <View style={styles.bannerHeader}>
            <View>
              <Text style={styles.bannerRole}>{gapData.targetRole}</Text>
              <Text style={styles.bannerSubtitle}>
                {gapData.overallCoveragePercentage}% Role Coverage
              </Text>
            </View>
            <View style={styles.coverageBadge}>
              <Text style={styles.coverageBadgeText}>
                {gapData.strongSkills.length}/{gapData.totalRequiredSkills} Skills
              </Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${gapData.overallCoveragePercentage}%` }]}
            />
          </View>
        </View>
      )}

      {/* High-Impact Skills Highlight */}
      {gapData && gapData.highImpactSkills.length > 0 && (
        <View style={styles.highImpactSection}>
          <Text style={styles.sectionHeader}>⚡ High-Impact Opportunities</Text>
          <Text style={styles.sectionSub}>
            Skills that will unlock the most target internship matches when mastered.
          </Text>

          {gapData.highImpactSkills.map((sk) => (
            <View key={sk.id} style={styles.highImpactCard}>
              <View style={styles.highImpactHeader}>
                <Text style={styles.highImpactTitle}>{sk.name}</Text>
                <View style={styles.unlockBadge}>
                  <Text style={styles.unlockText}>+{sk.opportunitiesUnlockedCount} Matches</Text>
                </View>
              </View>
              <Text style={styles.highImpactReason}>{sk.reason}</Text>

              <TouchableOpacity
                style={styles.practiceBtn}
                onPress={() => navigation.navigate('InterviewCoachScreen')}
              >
                <Text style={styles.practiceBtnText}>Practice {sk.name} →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Missing Skills List */}
      {gapData && gapData.missingSkills.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Priority Skill Gaps ({gapData.missingSkills.length})</Text>
          {gapData.missingSkills.map((sk) => (
            <View key={sk.id} style={styles.gapRow}>
              <View style={styles.gapHeader}>
                <Text style={styles.gapName}>{sk.name}</Text>
                <View style={styles.impactBadge}>
                  <Text style={styles.impactBadgeText}>Impact: {sk.impactScore}</Text>
                </View>
              </View>
              <Text style={styles.gapReason}>{sk.reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommended Portfolio Projects */}
      {projects.length > 0 && (
        <View style={styles.projectsSection}>
          <Text style={styles.sectionHeader}>🛠️ Recommended Portfolio Projects</Text>
          <Text style={styles.sectionSub}>
            Demonstrate missing skills with end-to-end projects for your profile.
          </Text>

          {projects.map((p) => (
            <View key={p.id} style={styles.projectCard}>
              <View style={styles.projectHeader}>
                <Text style={styles.projectTitle}>{p.title}</Text>
                <Text style={styles.difficultyBadge}>{p.difficulty}</Text>
              </View>
              <Text style={styles.projectDesc}>{p.description}</Text>

              <View style={styles.projectSkillTags}>
                {p.targetSkillNames.map((s, idx) => (
                  <View key={idx} style={styles.pSkillTag}>
                    <Text style={styles.pSkillTagText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
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
    marginBottom: Spacing.lg,
  },
  bannerCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  bannerRole: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  bannerSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  coverageBadge: {
    backgroundColor: Colors.glass.surface,
    borderColor: Colors.glass.border,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  coverageBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.bold,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.background.tertiary,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.brand.purple,
    borderRadius: 4,
  },
  highImpactSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  highImpactCard: {
    backgroundColor: '#2A1F3D',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.brand.purple,
  },
  highImpactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  highImpactTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  unlockBadge: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unlockText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.text.primary,
  },
  highImpactReason: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  practiceBtn: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-end',
  },
  practiceBtnText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.extrabold,
  },
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  gapRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  gapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gapName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  impactBadge: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  impactBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.secondary,
  },
  gapReason: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  projectsSection: {
    marginBottom: Spacing.lg,
  },
  projectCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  difficultyBadge: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.brand.purpleLight,
    backgroundColor: Colors.glass.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  projectDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  projectSkillTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: Spacing.xs,
  },
  pSkillTag: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pSkillTagText: {
    fontSize: 9,
    color: Colors.text.secondary,
  },
});
