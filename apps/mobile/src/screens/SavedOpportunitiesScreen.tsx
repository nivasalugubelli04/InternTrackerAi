import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { opportunitiesService } from '../services/opportunities.service';
import type { Opportunity } from '../services/opportunities.service';
import {
  OpportunityCard,
  OpportunityCardSkeleton,
} from '../components/opportunities/OpportunityCard';

export default function SavedOpportunitiesScreen(): React.ReactElement {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['opportunities', 'saved'],
    queryFn: () => opportunitiesService.getSaved(),
    staleTime: 60 * 1000,
  });

  const handleCardPress = (id: string) => {
    navigation.navigate('OpportunityDetails', { jobId: id });
  };

  const handleUnsave = async (id: string) => {
    await opportunitiesService.unsave(id);
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    queryClient.invalidateQueries({ queryKey: ['career-center'] });
  };

  const renderSkeleton = () => (
    <View style={{ paddingHorizontal: Spacing.lg }}>
      {[0, 1, 2].map((i) => (
        <OpportunityCardSkeleton key={i} />
      ))}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>♡</Text>
      <Text style={styles.emptyTitle}>No saved internships yet</Text>
      <Text style={styles.emptySubtitle}>
        Save internships you're interested in to revisit them here.
      </Text>
      <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('ExploreTab')}>
        <Text style={styles.exploreBtnText}>Explore Internships</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : Spacing.lg }]}>
        <Text style={styles.title}>Saved Internships</Text>
        {data && data.length > 0 && <Text style={styles.count}>{data.length} saved</Text>}
      </View>

      {isLoading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: Opportunity }) => (
            <OpportunityCard
              opportunity={item}
              onPress={handleCardPress}
              onSave={(id) => handleUnsave(id)}
              style={{ marginHorizontal: Spacing.lg }}
            />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.brand.purple}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  count: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
  list: { paddingTop: Spacing.sm, paddingBottom: Spacing.xl },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: { fontSize: 64, color: Colors.brand.purpleLight, marginBottom: Spacing.lg },
  emptyTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  exploreBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.brand.purple,
  },
  exploreBtnText: {
    color: 'white',
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.base,
  },
});
