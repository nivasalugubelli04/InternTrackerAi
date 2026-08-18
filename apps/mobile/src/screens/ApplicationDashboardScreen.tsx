import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { useApplicationStats, useApplicationActions } from '../services/applications.service';

const StatCard = ({
  label,
  value,
  emoji,
  color,
}: {
  label: string;
  value: number;
  emoji: string;
  color: string;
}) => (
  <View style={[styles.statCard, { borderColor: `${color}44` }]}>
    <Text style={styles.statEmoji}>{emoji}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function ApplicationDashboardScreen() {
  const navigation = useNavigation<any>();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useApplicationStats();
  const {
    data: actions,
    isLoading: actionsLoading,
    refetch: refetchActions,
  } = useApplicationActions();

  const handleRefresh = async () => {
    await Promise.all([refetchStats(), refetchActions()]);
  };

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return { dot: '🔴', text: Colors.error };
      case 'HIGH':
        return { dot: '🔵', text: Colors.brand.purpleLight };
      case 'MEDIUM':
        return { dot: '🟡', text: Colors.warning };
      default:
        return { dot: '⚪', text: Colors.text.muted };
    }
  };

  const handleActionClick = (action: any) => {
    if (action.type === 'INTERVIEW_PREP' && action.jobId) {
      navigation.navigate('OpportunityDetails', { jobId: action.jobId });
    } else if (action.type === 'FOLLOW_UP' && action.applicationId) {
      navigation.navigate('ApplicationDetail', { id: action.applicationId });
    } else if (action.type === 'ASSESSMENT_COMPLETION' && action.jobId) {
      navigation.navigate('OpportunityDetails', { jobId: action.jobId });
    } else {
      navigation.navigate('ExploreTab');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={statsLoading || actionsLoading} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Application Command</Text>

        {stats && stats.totalApplications === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🚀</Text>
            <Text style={styles.emptyTitle}>Your internship journey starts here.</Text>
            <Text style={styles.emptyText}>
              Save an internship or apply to your first opportunity to start tracking your progress.
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.navigate('ExploreTab')}
            >
              <Text style={styles.exploreBtnText}>Explore Internships</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Health Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCard
                label="Total Tracked"
                value={stats?.totalApplications || 0}
                emoji="📋"
                color={Colors.brand.purpleLight}
              />
              <StatCard
                label="Active Stages"
                value={stats?.active || 0}
                emoji="⚡"
                color={Colors.brand.cyan}
              />
              <StatCard
                label="Interviews"
                value={stats?.interviews || 0}
                emoji="🎯"
                color={Colors.warning}
              />
              <StatCard
                label="Offers Recieved"
                value={stats?.offers || 0}
                emoji="🎉"
                color={Colors.success}
              />
            </View>

            {/* AI Action Plan */}
            <View style={styles.planSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>✨ Today's AI Action Plan</Text>
                <Text style={styles.sectionSubtitle}>
                  Factual recommendations based on live tracking data
                </Text>
              </View>

              {actionsLoading ? (
                <ActivityIndicator
                  color={Colors.brand.purpleLight}
                  style={{ marginVertical: Spacing.md }}
                />
              ) : actions && actions.length > 0 ? (
                <View style={styles.actionsList}>
                  {actions.map((act, index) => {
                    const indicator = getPriorityIndicator(act.priority);
                    return (
                      <TouchableOpacity
                        key={act.id || index}
                        style={styles.actionCard}
                        onPress={() => handleActionClick(act)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.actionCardHeader}>
                          <Text style={[styles.actionPriority, { color: indicator.text }]}>
                            {indicator.dot} {act.priority}
                          </Text>
                          <Text style={styles.actionType}>{act.type.replace('_', ' ')}</Text>
                        </View>
                        <Text style={styles.actionTitle}>{act.title}</Text>
                        <Text style={styles.actionDesc}>{act.description}</Text>
                        <View style={styles.actionFooter}>
                          <Text style={styles.actionLinkText}>Take Action →</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyPlanText}>
                  All caught up! Check back later for follow-ups.
                </Text>
              )}
            </View>

            {/* Success rates and metrics */}
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>Performance Metrics</Text>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Interview Conversion Rate</Text>
                <Text style={styles.metricValue}>{stats?.interviewRate?.toFixed(1)}%</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Offer Success Rate</Text>
                <Text style={styles.metricValue}>{stats?.successRate?.toFixed(1)}%</Text>
              </View>
              {stats?.avgResponseTimeDays !== undefined && stats.avgResponseTimeDays > 0 && (
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Avg. Response Time</Text>
                  <Text style={styles.metricValue}>
                    {stats.avgResponseTimeDays.toFixed(1)} Days
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('ApplicationList', {})}
            >
              <Text style={styles.viewAllBtnText}>Open Kanban Board</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingTop: 64,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xl,
    fontFamily: 'Outfit',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.background.secondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  planSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: 2,
    fontFamily: 'Outfit',
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.muted,
    fontWeight: Typography.fontWeight.medium,
  },
  actionsList: {
    gap: Spacing.md,
  },
  actionCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  actionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionPriority: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  actionType: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.muted,
    textTransform: 'uppercase',
  },
  actionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  actionFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    paddingTop: Spacing.sm,
    alignItems: 'flex-end',
  },
  actionLinkText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.bold,
  },
  emptyPlanText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.muted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  progressSection: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  metricLabel: {
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
  },
  metricValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  viewAllBtn: {
    backgroundColor: Colors.brand.purple,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  viewAllBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  exploreBtn: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  exploreBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
  },
});
