import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { portfolioService, PortfolioIntelligencePayload } from '../../services/portfolio.service';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

interface Props {
  navigation?: any;
}

export default function PortfolioIntelligenceScreen({ navigation: _navigation }: Props) {
  const [intel, setIntel] = useState<PortfolioIntelligencePayload | null>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [intelData, portData] = await Promise.all([
        portfolioService.getIntelligence(),
        portfolioService.getPortfolio(),
      ]);
      setIntel(intelData);
      setPortfolio(portData);
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve portfolio intelligence analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAnalyzeProject = async (id: string) => {
    setAnalyzingId(id);
    try {
      await portfolioService.analyzeProject(id);
      Alert.alert('Success', 'Project analysis completed. Portfolio health updated.');
      await fetchData();
    } catch (err) {
      Alert.alert('Error', 'Could not analyze this project.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleGenerateCaseStudy = async (id: string) => {
    try {
      const study = await portfolioService.generateCaseStudy(id);
      Alert.alert(
        'Case Study Generated',
        `Problem:\n${study.problem}\n\nApproach:\n${study.approach}\n\nResults:\n${study.results}`,
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to generate case study.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brand.purple} />
        <Text style={styles.loadingText}>Analyzing Portfolio Evidence...</Text>
      </View>
    );
  }

  const health = intel?.health || {
    overallScore: 0,
    coverageScore: 0,
    depthScore: 0,
    docScore: 0,
    recencyScore: 0,
  };
  const alignment = intel?.alignment || {
    targetRole: 'Software Engineer',
    alignmentScore: 0,
    strong: [],
    growing: [],
    missing: [],
  };
  const brand = intel?.brand || {
    brandIdentity: '',
    brandConsistency: { isConsistent: true, gaps: [], suggestions: [] },
  };
  const projects = portfolio?.contentJson?.projects || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>AI Portfolio Intelligence</Text>
      <Text style={styles.subtitle}>
        Verify whether your professional achievements and projects actually prove target role
        alignment.
      </Text>

      {/* Portfolio Health Card */}
      <View style={styles.healthCard}>
        <Text style={styles.cardLabel}>PORTFOLIO EVIDENCE STRENGTH</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreNum}>{health.overallScore}%</Text>
          <View style={styles.scoreTextCol}>
            <Text style={styles.scoreLabel}>Health Assessment</Text>
            <Text style={styles.scoreSub}>
              Based on project depth, tech variety, and documented evidence.
            </Text>
          </View>
        </View>

        {/* Health dimensions */}
        <View style={styles.metricRow}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Skill Coverage</Text>
            <Text style={styles.metricValue}>{health.coverageScore}%</Text>
          </View>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${health.coverageScore}%`, backgroundColor: '#246BFE' },
              ]}
            />
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Technical Complexity</Text>
            <Text style={styles.metricValue}>{health.depthScore}%</Text>
          </View>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${health.depthScore}%`, backgroundColor: '#79F28A' },
              ]}
            />
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Documentation Completeness</Text>
            <Text style={styles.metricValue}>{health.docScore}%</Text>
          </View>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${health.docScore}%`, backgroundColor: '#F59E0B' },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Target Role Alignment */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Role Alignment: {alignment.targetRole}</Text>
        <Text style={styles.alignmentScoreLabel}>Score: {alignment.alignmentScore}%</Text>

        <View style={styles.skillGroup}>
          <Text style={styles.groupLabel}>Strong Evidence</Text>
          {alignment.strong.length > 0 ? (
            <View style={styles.chipsContainer}>
              {alignment.strong.map((s) => (
                <View key={s} style={[styles.chip, styles.chipStrong]}>
                  <Text style={styles.chipTextStrong}>{s}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyGroupText}>No strong project evidence verified yet.</Text>
          )}
        </View>

        <View style={styles.skillGroup}>
          <Text style={styles.groupLabel}>Growing Confidence</Text>
          {alignment.growing.length > 0 ? (
            <View style={styles.chipsContainer}>
              {alignment.growing.map((s) => (
                <View key={s} style={[styles.chip, styles.chipGrowing]}>
                  <Text style={styles.chipTextGrowing}>{s}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyGroupText}>No growing credentials identified.</Text>
          )}
        </View>

        <View style={styles.skillGroup}>
          <Text style={styles.groupLabel}>Missing Project Evidence</Text>
          {alignment.missing.length > 0 ? (
            <View style={styles.chipsContainer}>
              {alignment.missing.map((s) => (
                <View key={s} style={[styles.chip, styles.chipMissing]}>
                  <Text style={styles.chipTextMissing}>{s}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyGroupText}>
              All required role skills have supporting evidence!
            </Text>
          )}
        </View>
      </View>

      {/* Personal Brand Identity */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📢 Personal Brand Health</Text>
        <Text style={styles.brandDesc}>{brand.brandIdentity}</Text>

        {brand.brandConsistency.gaps.length > 0 && (
          <View style={styles.brandWarningCard}>
            <Text style={styles.warningTitle}>⚠️ Inconsistencies Detected:</Text>
            {brand.brandConsistency.gaps.map((gap, i) => (
              <Text key={i} style={styles.warningText}>
                • {gap}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.brandSubTitle}>Branding Recommendations:</Text>
        {brand.brandConsistency.suggestions.map((sug, i) => (
          <Text key={i} style={styles.sugText}>
            • {sug}
          </Text>
        ))}
      </View>

      {/* Projects List Section */}
      <Text style={styles.sectionHeader}>Projects Portfolio</Text>
      {projects.length > 0 ? (
        projects.map((p: any) => (
          <View key={p.id} style={styles.projectCard}>
            <View style={styles.projectHeader}>
              <Text style={styles.projectTitle}>{p.title}</Text>
              <Text style={styles.projectStack}>Stack: {p.technologies?.join(', ')}</Text>
            </View>
            <Text style={styles.projectDesc}>{p.description}</Text>

            <View style={styles.projectActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleAnalyzeProject(p.id)}
                disabled={analyzingId === p.id}
              >
                {analyzingId === p.id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.actionBtnText}>Analyze Project</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline]}
                onPress={() => handleGenerateCaseStudy(p.id)}
              >
                <Text style={styles.actionBtnOutlineText}>Draft Case Study</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Your projects are where your skills become evidence.</Text>
          <Text style={styles.emptySubText}>
            Add your projects to measure target role alignment.
          </Text>
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
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  healthCard: {
    backgroundColor: 'rgba(36, 107, 254, 0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(36, 107, 254, 0.3)',
    marginBottom: Spacing.lg,
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: '#246BFE',
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  scoreNum: {
    fontSize: 36,
    fontWeight: Typography.fontWeight.bold,
    color: 'white',
    marginRight: Spacing.md,
  },
  scoreTextCol: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  scoreSub: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  metricRow: {
    marginTop: Spacing.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  metricValue: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  progressBg: {
    height: 4,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  alignmentScoreLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  skillGroup: {
    marginBottom: Spacing.md,
  },
  groupLabel: {
    fontSize: 10,
    color: Colors.text.muted,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 6,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  chipStrong: {
    backgroundColor: 'rgba(121, 242, 138, 0.15)',
  },
  chipTextStrong: {
    fontSize: 10,
    color: '#79F28A',
    fontWeight: Typography.fontWeight.semibold,
  },
  chipGrowing: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  chipTextGrowing: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: Typography.fontWeight.semibold,
  },
  chipMissing: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  chipTextMissing: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyGroupText: {
    fontSize: 10,
    color: Colors.text.muted,
  },
  brandDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  brandWarningCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.md,
  },
  warningTitle: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
    color: '#EF4444',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  brandSubTitle: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  sugText: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  sectionHeader: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  projectCard: {
    backgroundColor: Colors.background.secondary,
    borderColor: Colors.border.subtle,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  projectHeader: {
    marginBottom: 6,
  },
  projectTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  projectStack: {
    fontSize: 10,
    color: Colors.brand.purpleLight,
    marginTop: 2,
  },
  projectDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  projectActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.md,
  },
  actionBtn: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  actionBtnText: {
    fontSize: 10,
    color: 'white',
    fontWeight: Typography.fontWeight.bold,
  },
  actionBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  actionBtnOutlineText: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  emptyCard: {
    backgroundColor: Colors.background.secondary,
    borderColor: Colors.border.subtle,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 11,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: 4,
  },
});
