import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { useApplicationStats } from '../services/applications.service';

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
  const { data: stats, isLoading, refetch } = useApplicationStats();

  const handleViewAll = () => {
    navigation.navigate('ApplicationList', {});
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <Text style={styles.headerTitle}>My Applications</Text>

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
            <View style={styles.statsGrid}>
              <StatCard
                label="Applications"
                value={stats?.totalApplications || 0}
                emoji="📝"
                color={Colors.brand.purple}
              />
              <StatCard
                label="Interviews"
                value={stats?.interviews || 0}
                emoji="🎯"
                color={Colors.warning}
              />
              <StatCard
                label="Offers"
                value={stats?.offers || 0}
                emoji="🎉"
                color={Colors.success}
              />
              <StatCard
                label="Rejected"
                value={stats?.rejected || 0}
                emoji="❌"
                color={Colors.error}
              />
            </View>

            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>Progress Metrics</Text>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Interview Rate</Text>
                <Text style={styles.metricValue}>{stats?.interviewRate?.toFixed(1)}%</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Success Rate</Text>
                <Text style={styles.metricValue}>{stats?.successRate?.toFixed(1)}%</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.viewAllBtn} onPress={handleViewAll}>
              <Text style={styles.viewAllBtnText}>View Application Board</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiBtn}
              onPress={() =>
                navigation.navigate('HomeTab', {
                  screen: 'AiCopilot',
                  params: { initialMessage: 'Analyze My Application Progress' },
                })
              }
            >
              <Text style={styles.aiBtnText}>✨ Analyze My Progress with AI</Text>
            </TouchableOpacity>
          </>
        )}
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
    paddingTop: Spacing['2xl'] + Spacing.xl,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing.sm,
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
  progressSection: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.md,
  },
  viewAllBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  aiBtn: {
    backgroundColor: Colors.brand.purple + '22',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.brand.purple + '55',
  },
  aiBtnText: {
    color: Colors.brand.purple,
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
