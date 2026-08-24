import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import {
  ScenarioResult,
  SimulationSessionResponse,
  simulationService,
} from '../../services/simulation.service';

interface Props {
  navigation?: any;
}

export default function CareerLabScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'STUDIO' | 'COMPARE' | 'FORECASTS'>('STUDIO');
  const [session, setSession] = useState<SimulationSessionResponse | null>(null);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isActivationModalVisible, setIsActivationModalVisible] = useState(false);

  useEffect(() => {
    fetchOrCreateSimulation();
  }, []);

  const fetchOrCreateSimulation = async () => {
    setIsLoading(true);
    try {
      const data = await simulationService.createSimulation();
      setSession(data);
      // Default to recommended scenario if present
      const recIdx = data.scenarios.findIndex((s) => s.isRecommended);
      if (recIdx !== -1) {
        setSelectedScenarioIndex(recIdx);
      }
    } catch (err: any) {
      Alert.alert('Simulation Error', 'Failed to load career simulation session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunNewSimulation = async (scenarioType?: string) => {
    setIsSimulating(true);
    try {
      const data = await simulationService.createSimulation({
        title: scenarioType ? `What-If: ${scenarioType}` : undefined,
      });
      setSession(data);
      setSelectedScenarioIndex(0);
    } catch (err) {
      Alert.alert('Simulation Failed', 'Could not run simulation scenario.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleActivatePlan = async () => {
    if (!session || !session.scenarios[selectedScenarioIndex]?.id) {
      Alert.alert('Error', 'No scenario available for activation.');
      return;
    }
    const scenario = session.scenarios[selectedScenarioIndex];
    setIsActivating(true);
    try {
      await simulationService.activateScenario(session.simulation.id, scenario.id!);
      setIsActivationModalVisible(false);
      Alert.alert(
        'Sprint Activated 🚀',
        `Scenario "${scenario.title}" has been converted into your active Phase 45 Career Sprint.`,
        [
          {
            text: 'Go to Execution Board',
            onPress: () => navigation?.navigate('CareerExecutionDashboard'),
          },
          { text: 'Stay in Lab', style: 'cancel' },
        ],
      );
    } catch (err) {
      Alert.alert('Activation Failed', 'Could not activate scenario as sprint.');
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand.purple} />
        <Text style={styles.loadingText}>Initializing Career What-If Studio...</Text>
      </View>
    );
  }

  const currentScenario = session?.scenarios[selectedScenarioIndex];
  const comparison = session?.comparison;

  return (
    <View style={styles.container}>
      {/* ── Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>🧪 Career Lab</Text>
            <Text style={styles.headerSubtitle}>What-If Simulation & Strategy Forecasting</Text>
          </View>
          <TouchableOpacity
            style={styles.rerunButton}
            onPress={() => handleRunNewSimulation()}
            disabled={isSimulating}
          >
            <Text style={styles.rerunButtonText}>{isSimulating ? '...' : '⚡ Re-run'}</Text>
          </TouchableOpacity>
        </View>

        {/* Confidence & Baseline Badge */}
        {session && (
          <View style={styles.confidenceBar}>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                Confidence:{' '}
                <Text style={styles.confidenceBold}>{session.simulation.confidenceLevel}</Text>
              </Text>
            </View>
            <Text style={styles.targetRoleText}>
              Target: {session.baseline?.targetRole || 'Software Engineer'}
            </Text>
          </View>
        )}

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'STUDIO' && styles.tabButtonActive]}
            onPress={() => setActiveTab('STUDIO')}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'STUDIO' && styles.tabButtonTextActive]}
            >
              Studio
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'COMPARE' && styles.tabButtonActive]}
            onPress={() => setActiveTab('COMPARE')}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'COMPARE' && styles.tabButtonTextActive]}
            >
              Compare (3)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'FORECASTS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('FORECASTS')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'FORECASTS' && styles.tabButtonTextActive,
              ]}
            >
              Forecasts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Body Content ──────────────────────────────────────── */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── TAB 1: STUDIO ────────────────────────────────────── */}
        {activeTab === 'STUDIO' && currentScenario && (
          <View>
            {/* Scenario Selector Chips */}
            <Text style={styles.sectionLabel}>Select Strategy Scenario:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
            >
              {session?.scenarios.map((sc, idx) => (
                <TouchableOpacity
                  key={sc.scenarioKey || idx}
                  style={[
                    styles.chip,
                    selectedScenarioIndex === idx && styles.chipActive,
                    sc.isRecommended && styles.chipRecommended,
                  ]}
                  onPress={() => setSelectedScenarioIndex(idx)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedScenarioIndex === idx && styles.chipTextActive,
                    ]}
                  >
                    {sc.isRecommended ? '⭐ ' : ''}
                    {sc.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Scenario Highlight Banner */}
            <View style={styles.scenarioCard}>
              <View style={styles.scenarioCardHeader}>
                <View>
                  <Text style={styles.scenarioTitle}>{currentScenario.title}</Text>
                  <Text style={styles.scenarioTypeBadge}>
                    {currentScenario.scenarioType.replace(/_/g, ' ')}
                  </Text>
                </View>
                {currentScenario.isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>BEST BALANCED</Text>
                  </View>
                )}
              </View>

              {/* Realism Constraint Status */}
              {!currentScenario.isRealistic && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>⚠️ Capacity Overload Detected</Text>
                  {currentScenario.constraintViolations.map((v, i) => (
                    <Text key={i} style={styles.warningText}>
                      • {v}
                    </Text>
                  ))}
                </View>
              )}

              {/* Time Allocation Breakdown */}
              <Text style={styles.subSectionTitle}>Weekly Time Allocation</Text>
              <View style={styles.allocationRow}>
                <View style={styles.allocPill}>
                  <Text style={styles.allocLabel}>Learn</Text>
                  <Text style={styles.allocVal}>
                    {currentScenario.timeAllocation.learningPercent}%
                  </Text>
                </View>
                <View style={styles.allocPill}>
                  <Text style={styles.allocLabel}>Projects</Text>
                  <Text style={styles.allocVal}>
                    {currentScenario.timeAllocation.projectsPercent}%
                  </Text>
                </View>
                <View style={styles.allocPill}>
                  <Text style={styles.allocLabel}>Apps</Text>
                  <Text style={styles.allocVal}>
                    {currentScenario.timeAllocation.applicationsPercent}%
                  </Text>
                </View>
                <View style={styles.allocPill}>
                  <Text style={styles.allocLabel}>Interviews</Text>
                  <Text style={styles.allocVal}>
                    {currentScenario.timeAllocation.interviewPrepPercent}%
                  </Text>
                </View>
                <View style={styles.allocPill}>
                  <Text style={styles.allocLabel}>Network</Text>
                  <Text style={styles.allocVal}>
                    {currentScenario.timeAllocation.networkingPercent}%
                  </Text>
                </View>
              </View>

              {/* 9-Dimension Impact Scores */}
              <Text style={styles.subSectionTitle}>Projected Impact Dimensions</Text>
              <View style={styles.impactGrid}>
                {Object.entries(currentScenario.impactAssessment.dimensions).map(
                  ([dim, scoreObj]) => (
                    <View key={dim} style={styles.impactCard}>
                      <View style={styles.impactCardTop}>
                        <Text style={styles.impactDimName}>{dim.replace(/_/g, ' ')}</Text>
                        <Text style={styles.impactScoreText}>{scoreObj.score}</Text>
                      </View>
                      <View style={styles.impactBarBg}>
                        <View
                          style={[
                            styles.impactBarFill,
                            {
                              width: `${Math.min(100, scoreObj.score)}%`,
                              backgroundColor:
                                scoreObj.direction === 'HIGH_RISK'
                                  ? Colors.error
                                  : scoreObj.score >= 75
                                    ? Colors.success
                                    : Colors.brand.purple,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.impactSummaryText}>{scoreObj.summary}</Text>
                    </View>
                  ),
                )}
              </View>

              {/* Benefits & Trade-offs */}
              <View style={styles.tradeOffContainer}>
                <View style={styles.tradeOffCol}>
                  <Text style={styles.benefitHeader}>✨ Potential Benefits</Text>
                  {currentScenario.impactAssessment.benefits.map((b, i) => (
                    <Text key={i} style={styles.benefitItem}>
                      • {b}
                    </Text>
                  ))}
                </View>

                <View style={styles.tradeOffCol}>
                  <Text style={styles.tradeOffHeader}>⚖️ Strategic Trade-offs</Text>
                  {currentScenario.impactAssessment.tradeOffs.map((t, i) => (
                    <Text key={i} style={styles.tradeOffItem}>
                      • {t}
                    </Text>
                  ))}
                </View>
              </View>

              {/* AI Narrative */}
              {currentScenario.aiNarrative && (
                <View style={styles.aiNarrativeBox}>
                  <Text style={styles.aiNarrativeTitle}>🤖 Strategic Intelligence Insight</Text>
                  <Text style={styles.aiNarrativeBody}>{currentScenario.aiNarrative}</Text>
                </View>
              )}

              {/* Convert to Sprint Action CTA */}
              <TouchableOpacity
                style={styles.activateButton}
                onPress={() => setIsActivationModalVisible(true)}
              >
                <Text style={styles.activateButtonText}>🚀 Convert to Phase 45 Sprint</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── TAB 2: COMPARE ────────────────────────────────────── */}
        {activeTab === 'COMPARE' && comparison && (
          <View>
            <View style={styles.compareBanner}>
              <Text style={styles.compareBannerTitle}>🏆 Optimal Strategic Fit</Text>
              <Text style={styles.compareBannerReason}>{comparison.recommendationReason}</Text>
            </View>

            <Text style={styles.sectionLabel}>Side-by-Side Strategy Comparison:</Text>
            {comparison.comparisonMatrix.scenarios.map((item) => (
              <View
                key={item.key}
                style={[styles.compareCard, item.isRecommended && styles.compareCardRecommended]}
              >
                <View style={styles.compareCardHeader}>
                  <Text style={styles.compareCardTitle}>
                    {item.isRecommended ? '⭐ ' : ''}
                    {item.title}
                  </Text>
                  <Text style={styles.compareCardScore}>Score: {item.overallScore}/100</Text>
                </View>

                <Text style={styles.compareText}>
                  <Text style={styles.compareBold}>Workload:</Text> {item.utilizationPercentage}%
                  capacity
                </Text>
                <Text style={styles.compareText}>
                  <Text style={styles.compareBold}>Primary Benefit:</Text> {item.topBenefit}
                </Text>
                <Text style={styles.compareText}>
                  <Text style={styles.compareBold}>Trade-off:</Text> {item.topTradeOff}
                </Text>
                <Text style={styles.compareText}>
                  <Text style={styles.compareBold}>Risk:</Text> {item.topRisk}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── TAB 3: FORECASTS ──────────────────────────────────── */}
        {activeTab === 'FORECASTS' && currentScenario && (
          <View>
            <Text style={styles.sectionLabel}>Opportunity Readiness Trends:</Text>
            <Text style={styles.sectionSub}>
              Based on simulated project deployment and skill progression under{' '}
              {currentScenario.title}.
            </Text>

            {currentScenario.opportunityForecasts?.map((fc, i) => (
              <View key={i} style={styles.forecastCard}>
                <View style={styles.forecastCardHeader}>
                  <View>
                    <Text style={styles.forecastCompany}>{fc.companyName}</Text>
                    <Text style={styles.forecastRole}>{fc.jobTitle}</Text>
                  </View>
                  <View
                    style={[
                      styles.trendBadge,
                      fc.readinessTrend === 'STRONGER'
                        ? styles.trendBadgeStrong
                        : styles.trendBadgeStable,
                    ]}
                  >
                    <Text style={styles.trendBadgeText}>{fc.readinessTrend}</Text>
                  </View>
                </View>

                <View style={styles.matchScoreRow}>
                  <Text style={styles.matchScoreLabel}>Match Score Trend:</Text>
                  <Text style={styles.matchScoreValues}>
                    {fc.currentMatchScore}% →{' '}
                    <Text style={styles.matchScoreHighlight}>{fc.forecastedMatchScore}%</Text>
                  </Text>
                </View>

                <Text style={styles.forecastPositiveLabel}>Key Positive Factors:</Text>
                {fc.keyPositiveFactors.map((kf, kIdx) => (
                  <Text key={kIdx} style={styles.forecastItem}>
                    ✓ {kf}
                  </Text>
                ))}
              </View>
            ))}

            {/* Path Comparison Section */}
            {currentScenario.careerPathComparisons && (
              <View style={styles.pathComparisonSection}>
                <Text style={styles.sectionLabel}>Alternative Path Alignment:</Text>
                {currentScenario.careerPathComparisons.map((path, pIdx) => (
                  <View key={pIdx} style={styles.pathCard}>
                    <View style={styles.pathCardTop}>
                      <Text style={styles.pathTitle}>{path.pathTitle}</Text>
                      <Text style={styles.pathScore}>
                        {path.simulatedAlignmentScore}% Alignment
                      </Text>
                    </View>
                    <Text style={styles.pathGaps}>
                      Gaps to close: {path.skillGapsToClose.join(', ')}
                    </Text>
                    <Text style={styles.pathEffort}>
                      Est. Readiness: ~{path.estimatedWeeksToReadiness} weeks
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Activation Confirmation Modal ────────────────────── */}
      <Modal
        visible={isActivationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsActivationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Convert to Phase 45 Career Sprint</Text>
            <Text style={styles.modalSubtitle}>
              This will create a new active Career Sprint with daily action items scheduled across
              the next 7 days based on "{currentScenario?.title}".
            </Text>

            <View style={styles.modalList}>
              <Text style={styles.modalListItem}>• Generates 3 prioritized milestones</Text>
              <Text style={styles.modalListItem}>
                • Automatically schedules morning daily action items
              </Text>
              <Text style={styles.modalListItem}>• Configures weekly focus allocations</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsActivationModalVisible(false)}
                disabled={isActivating}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleActivatePlan}
                disabled={isActivating}
              >
                <Text style={styles.modalConfirmText}>
                  {isActivating ? 'Activating...' : 'Confirm & Activate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.text.secondary,
    fontSize: 14,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.xs,
  },
  backButtonText: {
    fontSize: 22,
    color: Colors.text.primary,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  rerunButton: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  rerunButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  confidenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  confidenceBadge: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  confidenceText: {
    color: Colors.text.secondary,
    fontSize: 11,
  },
  confidenceBold: {
    color: Colors.brand.cyan,
    fontWeight: 'bold',
  },
  targetRoleText: {
    color: Colors.text.muted,
    fontSize: 11,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.transparent,
  },
  tabButtonActive: {
    borderBottomColor: Colors.brand.purple,
  },
  tabButtonText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: Colors.brand.purpleLight,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  chip: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  chipActive: {
    backgroundColor: Colors.brand.purple,
    borderColor: Colors.brand.purpleLight,
  },
  chipRecommended: {
    borderColor: Colors.brand.cyan,
  },
  chipText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  scenarioCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  scenarioCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  scenarioTypeBadge: {
    fontSize: 11,
    color: Colors.brand.cyan,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  recommendedBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.brand.cyan,
  },
  recommendedBadgeText: {
    color: Colors.brand.cyan,
    fontSize: 10,
    fontWeight: 'bold',
  },
  warningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  warningTitle: {
    color: Colors.error,
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 2,
  },
  warningText: {
    color: Colors.text.primary,
    fontSize: 11,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  allocPill: {
    alignItems: 'center',
  },
  allocLabel: {
    fontSize: 10,
    color: Colors.text.muted,
  },
  allocVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 2,
  },
  impactGrid: {
    marginTop: Spacing.xs,
  },
  impactCard: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  impactCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  impactDimName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
    textTransform: 'capitalize',
  },
  impactScoreText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  impactBarBg: {
    height: 4,
    backgroundColor: Colors.border.subtle,
    borderRadius: 2,
    marginBottom: 4,
  },
  impactBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  impactSummaryText: {
    fontSize: 10,
    color: Colors.text.muted,
  },
  tradeOffContainer: {
    marginTop: Spacing.md,
  },
  tradeOffCol: {
    marginBottom: Spacing.sm,
  },
  benefitHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.success,
    marginBottom: 4,
  },
  benefitItem: {
    fontSize: 11,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  tradeOffHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.warning,
    marginBottom: 4,
  },
  tradeOffItem: {
    fontSize: 11,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  aiNarrativeBox: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.purple,
  },
  aiNarrativeTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.brand.purpleLight,
    marginBottom: 4,
  },
  aiNarrativeBody: {
    fontSize: 11,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  activateButton: {
    backgroundColor: Colors.brand.purple,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  activateButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  compareBanner: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.brand.purpleLight,
    marginBottom: Spacing.md,
  },
  compareBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.brand.purpleLight,
    marginBottom: 4,
  },
  compareBannerReason: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  compareCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  compareCardRecommended: {
    borderColor: Colors.brand.cyan,
  },
  compareCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  compareCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.primary,
    flex: 1,
  },
  compareCardScore: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.brand.cyan,
  },
  compareText: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 3,
  },
  compareBold: {
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  forecastCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  forecastCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  forecastCompany: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  forecastRole: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  trendBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  trendBadgeStrong: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  trendBadgeStable: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  trendBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.success,
  },
  matchScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  matchScoreLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  matchScoreValues: {
    fontSize: 11,
    color: Colors.text.primary,
  },
  matchScoreHighlight: {
    fontWeight: 'bold',
    color: Colors.brand.cyan,
  },
  forecastPositiveLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 4,
    marginBottom: 2,
  },
  forecastItem: {
    fontSize: 11,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  pathComparisonSection: {
    marginTop: Spacing.md,
  },
  pathCard: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  pathCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  pathTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  pathScore: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.brand.purpleLight,
  },
  pathGaps: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  pathEffort: {
    fontSize: 10,
    color: Colors.text.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  modalList: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  modalListItem: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginVertical: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    marginRight: Spacing.sm,
  },
  modalCancelText: {
    color: Colors.text.secondary,
    fontSize: 13,
  },
  modalConfirmBtn: {
    backgroundColor: Colors.brand.purple,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
  },
  modalConfirmText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
});
