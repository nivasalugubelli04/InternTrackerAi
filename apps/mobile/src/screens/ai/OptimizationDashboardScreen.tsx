import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
  Switch,
} from 'react-native';
import {
  optimizationService,
  OptimizationDashboardResponse,
} from '../../services/optimization.service';

export default function OptimizationDashboardScreen({ navigation }: any) {
  const [data, setData] = useState<OptimizationDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await optimizationService.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load optimization dashboard', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApproveProposal = async (proposalId: string) => {
    try {
      await optimizationService.approveProposal(proposalId);
      Alert.alert(
        'Approved',
        'Strategy proposal approved and added to your Career Execution Plan!',
      );
      loadDashboard();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to approve proposal.');
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      await optimizationService.rejectProposal(proposalId);
      Alert.alert('Dismissed', 'Proposal dismissed.');
      loadDashboard();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reject proposal.');
    }
  };

  const handleTogglePreference = async (prefId: string, currentVal: boolean) => {
    try {
      await optimizationService.updatePreference(prefId, { isEnabled: !currentVal });
      setData((prev) =>
        prev
          ? {
              ...prev,
              learnedPreferences: prev.learnedPreferences.map((p) =>
                p.id === prefId ? { ...p, isEnabled: !currentVal } : p,
              ),
            }
          : null,
      );
    } catch {
      Alert.alert('Error', 'Could not update preference setting.');
    }
  };

  const handleDeletePreference = async (prefId: string) => {
    try {
      await optimizationService.deletePreference(prefId);
      setData((prev) =>
        prev
          ? {
              ...prev,
              learnedPreferences: prev.learnedPreferences.filter((p) => p.id !== prefId),
            }
          : null,
      );
      Alert.alert('Deleted', 'Learned preference removed.');
    } catch {
      Alert.alert('Error', 'Could not delete learned preference.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#246BFE" />
          <Text style={styles.loadingText}>Analyzing career signals & patterns...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Continuous Career Optimization</Text>
        <Text style={styles.headerSub}>Closed-Loop Learning & Strategy Improvement</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Data Sufficiency Banner */}
        {data?.dataSufficiency && (
          <View style={styles.sufficiencyCard}>
            <Text style={styles.sufficiencyTitle}>Continuous Learning Telemetry</Text>
            <Text style={styles.sufficiencyDesc}>{data.dataSufficiency.message}</Text>
          </View>
        )}

        {/* Section 1: Optimization Proposals (Actionable Review) */}
        {data?.proposals && data.proposals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Strategy Proposals</Text>
            <Text style={styles.sectionSubtitle}>
              Proposed adjustments require your explicit approval before execution.
            </Text>

            {data.proposals.map((prop) => (
              <View key={prop.id} style={styles.proposalCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.proposalBadge}>STRATEGY PROPOSAL</Text>
                  <Text style={styles.confidenceBadge}>{prop.confidence.replace('_', ' ')}</Text>
                </View>

                <View style={styles.strategyRow}>
                  <Text style={styles.strategyLabel}>Current Strategy:</Text>
                  <Text style={styles.strategyValue}>{prop.currentStrategy}</Text>
                </View>

                <View style={styles.strategyRow}>
                  <Text style={styles.strategyLabel}>Observed Signal:</Text>
                  <Text style={styles.strategyValue}>{prop.observation}</Text>
                </View>

                <View style={styles.proposedBox}>
                  <Text style={styles.proposedLabel}>PROPOSED OPTIMIZATION</Text>
                  <Text style={styles.proposedText}>{prop.proposedChange}</Text>
                  <Text style={styles.benefitText}>✓ Benefit: {prop.expectedBenefit}</Text>
                  <Text style={styles.tradeOffText}>• Trade-off: {prop.tradeOff}</Text>
                </View>

                {prop.status === 'PENDING' ? (
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveProposal(prop.id)}
                    >
                      <Text style={styles.approveBtnText}>Approve & Apply to Plan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dismissBtn}
                      onPress={() => handleRejectProposal(prop.id)}
                    >
                      <Text style={styles.dismissBtnText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.appliedBadge}>
                    <Text style={styles.appliedBadgeText}>✓ APPLIED TO EXECUTION PLAN</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Section 2: What Is Working (Evidence-Grounded) */}
        {data?.whatIsWorking && data.whatIsWorking.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What is Working</Text>
            <Text style={styles.sectionSubtitle}>
              Evidence-supported patterns driving positive career momentum.
            </Text>

            {data.whatIsWorking.map((item) => (
              <View key={item.id} style={styles.workingCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.workingCategory}>{item.category.replace('_', ' ')}</Text>
                  <Text style={styles.confidenceHighTag}>HIGH CONFIDENCE</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardObs}>{item.observation}</Text>

                <View style={styles.evidenceContainer}>
                  <Text style={styles.evidenceLabel}>Supporting Evidence:</Text>
                  {item.evidence.map((ev, i) => (
                    <Text key={i} style={styles.evidenceItem}>
                      ✓ {ev}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Section 3: What Needs Adjustment */}
        {data?.whatNeedsAdjustment && data.whatNeedsAdjustment.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What Needs Adjustment</Text>
            <Text style={styles.sectionSubtitle}>
              Observed execution or conversion bottlenecks with recommended fixes.
            </Text>

            {data.whatNeedsAdjustment.map((item) => (
              <View key={item.id} style={styles.adjustmentCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.adjustCategory}>{item.category.replace('_', ' ')}</Text>
                  <Text style={styles.confidenceMedTag}>{item.confidence.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardObs}>{item.observation}</Text>

                {item.suggestedAction && (
                  <View style={styles.suggestedActionBox}>
                    <Text style={styles.actionLabel}>Suggested Action:</Text>
                    <Text style={styles.actionText}>{item.suggestedAction}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Section 4: Execution Patterns Breakdown */}
        {data?.executionPatterns && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Execution Patterns Analytics</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricVal}>
                  {Math.round(data.executionPatterns.shortTaskCompletionRate * 100)}%
                </Text>
                <Text style={styles.metricLbl}>Short Task (&lt;45m) Completion</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricVal}>
                  {Math.round(data.executionPatterns.longTaskCompletionRate * 100)}%
                </Text>
                <Text style={styles.metricLbl}>Deep Work (60m+) Completion</Text>
              </View>
            </View>
          </View>
        )}

        {/* Section 5: Controlled Strategy Experiments */}
        {data?.activeExperiments && data.activeExperiments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Controlled Strategy Experiments</Text>
            {data.activeExperiments.map((exp) => (
              <View key={exp.id} style={styles.experimentCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.expTitle}>{exp.title}</Text>
                  <Text style={styles.expStatus}>{exp.status}</Text>
                </View>
                <Text style={styles.expHypothesis}>Hypothesis: {exp.hypothesis}</Text>
                <View style={styles.expComparison}>
                  <Text style={styles.expStrategy}>A (Control): {exp.strategyA}</Text>
                  <Text style={styles.expStrategy}>B (Variant): {exp.strategyB}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Section 6: Learned Preferences & Privacy Controls */}
        {data?.learnedPreferences && data.learnedPreferences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Learned Preferences (User Controlled)</Text>
            <Text style={styles.sectionSubtitle}>
              Transparent behavioral adaptations. You can toggle or delete anytime.
            </Text>

            {data.learnedPreferences.map((pref) => (
              <View key={pref.id} style={styles.preferenceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prefKey}>{pref.key.replace(/_/g, ' ').toUpperCase()}</Text>
                  <Text style={styles.prefVal}>{pref.value}</Text>
                </View>
                <Switch
                  value={pref.isEnabled}
                  onValueChange={() => handleTogglePreference(pref.id, pref.isEnabled)}
                  trackColor={{ false: '#D1D5DB', true: '#246BFE' }}
                />
                <TouchableOpacity
                  onPress={() => handleDeletePreference(pref.id)}
                  style={styles.deletePrefBtn}
                >
                  <Text style={styles.deletePrefText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E7EAF0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sufficiencyCard: {
    backgroundColor: '#EAF3FF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#246BFE',
  },
  sufficiencyTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1456D9',
    textTransform: 'uppercase',
  },
  sufficiencyDesc: { fontSize: 13, color: '#111111', marginTop: 3 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111111', marginBottom: 2 },
  sectionSubtitle: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  proposalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#246BFE',
    marginBottom: 12,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  proposalBadge: { fontSize: 10, fontWeight: '700', color: '#246BFE' },
  confidenceBadge: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  strategyRow: { marginBottom: 6 },
  strategyLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  strategyValue: { fontSize: 13, color: '#111111', marginTop: 1 },
  proposedBox: {
    backgroundColor: '#F3F7FF',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#246BFE',
  },
  proposedLabel: { fontSize: 10, fontWeight: '700', color: '#246BFE', textTransform: 'uppercase' },
  proposedText: { fontSize: 13, fontWeight: '700', color: '#111111', marginTop: 2 },
  benefitText: { fontSize: 12, color: '#059669', marginTop: 4, fontWeight: '500' },
  tradeOffText: { fontSize: 12, color: '#D97706', marginTop: 2 },
  actionButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  approveBtn: {
    flex: 1,
    backgroundColor: '#246BFE',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  dismissBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E7EAF0',
    alignItems: 'center',
  },
  dismissBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  appliedBadge: {
    backgroundColor: '#E9FBEA',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  appliedBadgeText: { color: '#059669', fontWeight: '700', fontSize: 11 },
  workingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7EAF0',
    borderLeftWidth: 4,
    borderLeftColor: '#79F28A',
    marginBottom: 10,
  },
  workingCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  confidenceHighTag: { fontSize: 10, fontWeight: '700', color: '#059669' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111111', marginTop: 2 },
  cardObs: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  evidenceContainer: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 6, marginTop: 8 },
  evidenceLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  evidenceItem: { fontSize: 11, color: '#374151', marginTop: 2 },
  adjustmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7EAF0',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 10,
  },
  adjustCategory: { fontSize: 10, fontWeight: '700', color: '#D97706', textTransform: 'uppercase' },
  confidenceMedTag: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  suggestedActionBox: { backgroundColor: '#FFF4D8', padding: 8, borderRadius: 6, marginTop: 8 },
  actionLabel: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  actionText: { fontSize: 12, color: '#92400E', marginTop: 1 },
  metricsGrid: { flexDirection: 'row', gap: 10 },
  metricBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7EAF0',
    alignItems: 'center',
  },
  metricVal: { fontSize: 20, fontWeight: '800', color: '#246BFE' },
  metricLbl: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  experimentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E7EAF0',
    marginBottom: 8,
  },
  expTitle: { fontSize: 13, fontWeight: '700', color: '#111111' },
  expStatus: { fontSize: 10, fontWeight: '700', color: '#246BFE' },
  expHypothesis: { fontSize: 12, color: '#4B5563', marginVertical: 4 },
  expComparison: { backgroundColor: '#F8FAFC', padding: 6, borderRadius: 6 },
  expStrategy: { fontSize: 11, color: '#374151' },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7EAF0',
    marginBottom: 8,
    gap: 8,
  },
  prefKey: { fontSize: 11, fontWeight: '700', color: '#111111' },
  prefVal: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  deletePrefBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
  },
  deletePrefText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },
});
