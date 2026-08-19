import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { interviewsService } from '../../services/interviews.service';

export default function InterviewDashboardScreen(): React.ReactElement {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readiness, setReadiness] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [readinessData, historyData] = await Promise.all([
        interviewsService.getReadiness(),
        interviewsService.getHistory(),
      ]);
      setReadiness(readinessData);
      setHistory(historyData || []);
    } catch (e) {
      console.error('Failed to load interview dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.purple} />
          <Text style={styles.loadingText}>Loading Interview Intelligence...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const score = readiness?.overallReadiness || 75;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interview Readiness Engine</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brand.purple}
          />
        }
      >
        {/* Main Readiness Card */}
        <View style={styles.readinessCard}>
          <View style={styles.readinessHeader}>
            <View>
              <Text style={styles.cardTag}>INTERVIEW READINESS</Text>
              <Text style={styles.readinessScoreText}>{score}%</Text>
              <Text style={styles.readinessSubtext}>
                {score >= 80
                  ? 'Ready for Top Interviews'
                  : score >= 60
                    ? 'Moderate Preparation Needed'
                    : 'High Priority Practice Required'}
              </Text>
            </View>
            <View style={styles.ringContainer}>
              <Ionicons name="ribbon-outline" size={40} color={Colors.brand.purpleLight} />
            </View>
          </View>

          {/* Breakdown Bars */}
          <View style={styles.breakdownContainer}>
            <ScoreBar
              label="Technical Readiness"
              value={readiness?.technicalReadiness || 70}
              color={Colors.brand.purple}
            />
            <ScoreBar
              label="Role Alignment"
              value={readiness?.roleAlignment || 80}
              color={Colors.brand.cyan}
            />
            <ScoreBar
              label="Behavioral STAR"
              value={readiness?.behavioralReadiness || 65}
              color={Colors.warning}
            />
            <ScoreBar
              label="Communication"
              value={readiness?.communication || 75}
              color={Colors.success}
            />
          </View>
        </View>

        {/* Quick Practice Mode Cards */}
        <Text style={styles.sectionTitle}>Practice Modes</Text>
        <View style={styles.modesRow}>
          <TouchableOpacity
            style={[styles.modeCard, { borderColor: Colors.brand.purple }]}
            onPress={() => navigation.navigate('MockInterview', { mode: 'QUICK_PRACTICE' })}
          >
            <Ionicons name="flash-outline" size={28} color={Colors.brand.purple} />
            <Text style={styles.modeTitle}>Quick Practice</Text>
            <Text style={styles.modeSub}>5 Questions • 10 mins</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, { borderColor: Colors.brand.cyan }]}
            onPress={() => navigation.navigate('MockInterview', { mode: 'TECHNICAL_MOCK' })}
          >
            <Ionicons name="code-slash-outline" size={28} color={Colors.brand.cyan} />
            <Text style={styles.modeTitle}>Technical Mock</Text>
            <Text style={styles.modeSub}>Deep Technical Focus</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modesRow}>
          <TouchableOpacity
            style={[styles.modeCard, { borderColor: Colors.warning }]}
            onPress={() => navigation.navigate('MockInterview', { mode: 'BEHAVIORAL_MOCK' })}
          >
            <Ionicons name="people-outline" size={28} color={Colors.warning} />
            <Text style={styles.modeTitle}>Behavioral STAR</Text>
            <Text style={styles.modeSub}>STAR Method Focus</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, { borderColor: Colors.success }]}
            onPress={() => navigation.navigate('MockInterview', { mode: 'FULL_MOCK' })}
          >
            <Ionicons name="trophy-outline" size={28} color={Colors.success} />
            <Text style={styles.modeTitle}>Full Mock</Text>
            <Text style={styles.modeSub}>Complete Interview</Text>
          </TouchableOpacity>
        </View>

        {/* Strong vs Weak Areas */}
        {readiness && (
          <View style={styles.analysisRow}>
            <View style={styles.analysisCard}>
              <Text style={[styles.analysisHeader, { color: Colors.success }]}>Top Strengths</Text>
              {(readiness.strongAreas || []).map((area: string, idx: number) => (
                <Text key={idx} style={styles.analysisItem}>
                  ✓ {area}
                </Text>
              ))}
            </View>

            <View style={styles.analysisCard}>
              <Text style={[styles.analysisHeader, { color: Colors.error }]}>Skill Gaps</Text>
              {(readiness.weakAreas || []).map((area: string, idx: number) => (
                <Text key={idx} style={styles.analysisItem}>
                  ⚠ {area}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* History */}
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        {history.length > 0 ? (
          history.slice(0, 4).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.historyCard}
              onPress={() => navigation.navigate('InterviewReport', { sessionId: item.id })}
            >
              <View style={styles.historyLeft}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={24}
                  color={Colors.brand.purpleLight}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.historyRole}>{item.job?.title || 'Mock Interview'}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.createdAt).toLocaleDateString()} • {item.mode || 'FULL'}
                  </Text>
                </View>
              </View>
              <View style={styles.historyScoreBadge}>
                <Text style={styles.historyScoreText}>{item.score || 0}%</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="file-tray-outline" size={32} color={Colors.text.muted} />
            <Text style={styles.emptyText}>
              No mock sessions completed yet. Start a quick practice above!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.barContainer}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value}%</Text>
      </View>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.text.secondary, marginTop: 12, fontSize: Typography.fontSize.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  backButton: { padding: Spacing.xs },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  scrollContent: { padding: Spacing.md },
  readinessCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    marginBottom: Spacing.lg,
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTag: {
    fontSize: Typography.fontSize.xs,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1,
  },
  readinessScoreText: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.text.primary,
    marginVertical: Spacing.xs,
  },
  readinessSubtext: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  ringContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.glass.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownContainer: { marginTop: Spacing.lg },
  barContainer: { marginBottom: Spacing.sm },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary },
  barValue: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  barBackground: {
    height: 6,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  modesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  modeCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  modeTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  modeSub: { fontSize: Typography.fontSize.xs, color: Colors.text.muted, marginTop: 2 },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.md,
  },
  analysisCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginRight: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  analysisHeader: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  analysisItem: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginVertical: 2,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center' },
  historyRole: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  historyDate: { fontSize: Typography.fontSize.xs, color: Colors.text.muted, marginTop: 2 },
  historyScoreBadge: {
    backgroundColor: Colors.glass.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  historyScoreText: {
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.sm,
  },
  emptyCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.text.muted,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
