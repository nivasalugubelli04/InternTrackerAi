import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { useAuthContext } from '../context/AuthContext';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { opportunitiesService } from '../services/opportunities.service';
import type { Opportunity } from '../services/opportunities.service';
import { profileApi } from '../services/profile.service';
import { OpportunityCardCompact, OpportunityCardSkeleton } from '../components/opportunities/OpportunityCard';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const StatCard = ({ label, value, emoji, color }: { label: string; value: number; emoji: string; color: string }) => (
  <View style={[styles.statCard, { borderColor: `${color}44` }]}>
    <Text style={styles.statEmoji}>{emoji}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

interface SectionProps {
  title: string;
  emoji: string;
  subtitle?: string;
  data: Opportunity[] | undefined;
  isLoading: boolean;
  onViewAll?: () => void;
  onCardPress: (id: string) => void;
  onSave: (id: string, saved: boolean) => Promise<void>;
  emptyMessage: string;
}

function HorizontalSection({
  title, emoji, subtitle, data, isLoading, onViewAll, onCardPress, onSave: _onSave, emptyMessage,
}: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{emoji} {title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        )}
      </View>
      {isLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 200, marginRight: Spacing.md }}>
              <OpportunityCardSkeleton />
            </View>
          ))}
        </ScrollView>
      ) : !data?.length ? (
        <View style={styles.emptyInline}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OpportunityCardCompact opportunity={item} onPress={onCardPress} />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
        />
      )}
    </View>
  );
}

export default function HomeScreen(): React.ReactElement {
  const { user } = useAuthContext();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['opportunities', 'stats'],
    queryFn: () => opportunitiesService.getDashboardStats(),
    staleTime: 3 * 60 * 1000,
  });

  const { data: topMatches, isLoading: topMatchLoading, refetch: refetchTop } = useQuery({
    queryKey: ['opportunities', 'top-matches'],
    queryFn: () => opportunitiesService.getTopMatches(8),
    staleTime: 5 * 60 * 1000,
  });

  const { data: newOpps, isLoading: newLoading, refetch: refetchNew } = useQuery({
    queryKey: ['opportunities', 'new'],
    queryFn: () => opportunitiesService.getNewOpportunities(8),
    staleTime: 5 * 60 * 1000,
  });

  const { data: closing, isLoading: closingLoading, refetch: refetchClosing } = useQuery({
    queryKey: ['opportunities', 'closing-soon'],
    queryFn: () => opportunitiesService.getClosingSoon(6),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tracked, isLoading: trackedLoading, refetch: refetchTracked } = useQuery({
    queryKey: ['opportunities', 'tracked-companies'],
    queryFn: () => opportunitiesService.getTrackedCompanyOpportunities(8),
    staleTime: 5 * 60 * 1000,
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchTop(), refetchNew(), refetchClosing(), refetchTracked()]);
    setRefreshing(false);
  }, [refetchStats, refetchTop, refetchNew, refetchClosing, refetchTracked]);

  const handleCardPress = useCallback(
    (id: string) => navigation.navigate('OpportunityDetails', { jobId: id }),
    [navigation],
  );

  const handleSave = useCallback(async (id: string, currentlySaved: boolean) => {
    if (currentlySaved) {
      await opportunitiesService.unsave(id);
    } else {
      await opportunitiesService.save(id);
    }
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
  }, [queryClient]);

  const handleViewExplore = () => navigation.navigate('ExploreTab');

  const firstName = user?.firstName ?? 'there';
  const completionPct = profile ? Math.round(
    ((profile.phone ? 1 : 0) +
      (profile.college ? 1 : 0) +
      (profile.cgpa ? 1 : 0) +
      (profile.bio ? 1 : 0) +
      (profile.linkedinUrl ? 1 : 0)) *
    20,
  ) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.purple} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}, {firstName} 👋</Text>
          <Text style={styles.subgreeting}>Find internships that match your goals.</Text>
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => navigation.navigate('ExploreTab')}
        >
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Profile completion strip */}
      {completionPct < 100 && (
        <TouchableOpacity
          style={styles.completionStrip}
          onPress={() => navigation.navigate('ProfileTab')}
        >
          <View style={styles.completionBar}>
            <View style={[styles.completionFill, { width: `${completionPct}%` }]} />
          </View>
          <Text style={styles.completionText}>
            Profile {completionPct}% complete — finish it to improve your matches →
          </Text>
        </TouchableOpacity>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard
          label="New"
          emoji="✨"
          value={statsLoading ? 0 : (stats?.newCount ?? 0)}
          color={Colors.brand.cyan}
        />
        <StatCard
          label="High Match"
          emoji="🎯"
          value={statsLoading ? 0 : (stats?.highMatchCount ?? 0)}
          color={Colors.success}
        />
        <StatCard
          label="Saved"
          emoji="♥"
          value={statsLoading ? 0 : (stats?.savedCount ?? 0)}
          color={Colors.error}
        />
      </View>

      {/* Explore CTA */}
      <TouchableOpacity style={styles.exploreCta} onPress={handleViewExplore}>
        <Text style={styles.exploreCtaText}>🔍 Search & Explore All Internships</Text>
        <Text style={styles.exploreArrow}>→</Text>
      </TouchableOpacity>

      {/* Top Matches */}
      <HorizontalSection
        title="Top Matches"
        emoji="🎯"
        subtitle="Based on your skills & preferences"
        data={topMatches}
        isLoading={topMatchLoading}
        onViewAll={handleViewExplore}
        onCardPress={handleCardPress}
        onSave={handleSave}
        emptyMessage="Complete your profile to see personalized matches."
      />

      {/* New For You */}
      <HorizontalSection
        title="New For You"
        emoji="✨"
        subtitle="Added in the last 7 days"
        data={newOpps}
        isLoading={newLoading}
        onViewAll={handleViewExplore}
        onCardPress={handleCardPress}
        onSave={handleSave}
        emptyMessage="No new internships this week. Check back soon!"
      />

      {/* Closing Soon */}
      <HorizontalSection
        title="Closing Soon"
        emoji="⏰"
        subtitle="Apply before it's too late"
        data={closing}
        isLoading={closingLoading}
        onCardPress={handleCardPress}
        onSave={handleSave}
        emptyMessage="You're all caught up! No urgent deadlines."
      />

      {/* Tracked Companies */}
      <HorizontalSection
        title="From Tracked Companies"
        emoji="🏢"
        subtitle="Companies you follow"
        data={tracked}
        isLoading={trackedLoading}
        onCardPress={handleCardPress}
        onSave={handleSave}
        emptyMessage="Track companies to see their latest openings."
      />

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  content: { paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
  greeting: { color: Colors.text.primary, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold },
  subgreeting: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, marginTop: 4 },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: { fontSize: 20 },
  completionStrip: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: Spacing.sm,
  },
  completionBar: { height: 4, backgroundColor: Colors.background.tertiary, borderRadius: 2, overflow: 'hidden', marginBottom: Spacing.xs },
  completionFill: { height: '100%', backgroundColor: Colors.brand.purple, borderRadius: 2 },
  completionText: { color: Colors.text.secondary, fontSize: Typography.fontSize.xs },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.extrabold, marginBottom: 2 },
  statLabel: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium },
  exploreCta: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.glass.surface,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  exploreCtaText: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  exploreArrow: { color: Colors.brand.purple, fontSize: Typography.fontSize.lg },
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  sectionSubtitle: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  viewAll: { color: Colors.brand.purple, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  hList: { paddingHorizontal: Spacing.lg },
  emptyInline: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: { color: Colors.text.muted, fontSize: Typography.fontSize.sm, textAlign: 'center' },
});
