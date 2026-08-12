import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { opportunitiesService, Opportunity } from '../services/opportunities.service';
import type { FeedFilters } from '../components/opportunities/FilterBottomSheet';
import { FilterBottomSheet } from '../components/opportunities/FilterBottomSheet';
import { OpportunityCard, OpportunityCardSkeleton } from '../components/opportunities/OpportunityCard';
import { useNavigation } from '@react-navigation/native';

const LIMIT = 20;

export default function ExploreScreen(): React.ReactElement {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<FeedFilters>({});
  const [filterVisible, setFilterVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(text), 400);
  }, []);

  // Filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['opportunities', 'filter-options'],
    queryFn: () => opportunitiesService.getFilterOptions(),
    staleTime: 10 * 60 * 1000,
  });

  // Search mode
  const isSearchMode = debouncedSearch.trim().length > 0;

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['opportunities', 'search', debouncedSearch],
    queryFn: () => opportunitiesService.search(debouncedSearch, 30),
    enabled: isSearchMode,
    staleTime: 60 * 1000,
  });

  // Infinite feed
  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: feedLoading,
    refetch: refetchFeed,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['opportunities', 'feed', filters],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const params = {
        ...filters,
        sort: filters.sort ?? 'best_match',
        limit: LIMIT,
        cursor: pageParam,
      };
      return opportunitiesService.getFeed(params);
    },
    getNextPageParam: (last) => last.meta.hasMore ? last.meta.nextCursor ?? undefined : undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !isSearchMode,
    staleTime: 3 * 60 * 1000,
  });

  const feedItems: Opportunity[] = isSearchMode
    ? (searchResults?.data ?? [])
    : (feedData?.pages.flatMap((p) => p.data) ?? []);

  const isLoading = isSearchMode ? searchLoading : feedLoading;
  const totalCount = isSearchMode ? (searchResults?.meta.total ?? 0) : undefined;

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

  const handleDismiss = useCallback(async (id: string) => {
    await opportunitiesService.dismiss(id);
    queryClient.invalidateQueries({ queryKey: ['opportunities', 'feed'] });
  }, [queryClient]);

  const handleApplyFilters = useCallback((newFilters: FeedFilters) => {
    setFilters(newFilters);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== '',
  ).length;

  const renderItem = useCallback(({ item }: { item: Opportunity }) => (
    <View style={styles.cardWrapper}>
      <OpportunityCard
        opportunity={item}
        onPress={handleCardPress}
        onSave={handleSave}
      />
      {/* Swipe-to-dismiss hint */}
      <TouchableOpacity
        style={styles.dismissBtn}
        onPress={() => handleDismiss(item.id)}
      >
        <Text style={styles.dismissText}>✕ Not interested</Text>
      </TouchableOpacity>
    </View>
  ), [handleCardPress, handleSave, handleDismiss]);

  const renderSkeleton = () => (
    <View style={{ paddingHorizontal: Spacing.lg }}>
      {[0, 1, 2, 3].map((i) => <OpportunityCardSkeleton key={i} />)}
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return renderSkeleton();
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🔍</Text>
        <Text style={styles.emptyTitle}>No results found</Text>
        <Text style={styles.emptySubtitle}>
          {isSearchMode
            ? `No internships match "${debouncedSearch}". Try a different keyword.`
            : 'No internships match your current filters. Try adjusting them.'}
        </Text>
        {activeFilterCount > 0 && (
          <TouchableOpacity
            style={styles.clearFiltersBtn}
            onPress={() => setFilters({})}
          >
            <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search bar + filter button */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Text style={styles.searchBarIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search internships, companies, skills..."
            placeholderTextColor={Colors.text.muted}
            value={searchText}
            onChangeText={onSearchChange}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchText(''); setDebouncedSearch(''); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFilterVisible(true)}
        >
          <Text style={styles.filterBtnIcon}>⚙️</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Result count / sort info */}
      {!isLoading && feedItems.length > 0 && (
        <View style={styles.resultMeta}>
          <Text style={styles.resultCount}>
            {isSearchMode ? `${totalCount} results for "${debouncedSearch}"` : `${feedItems.length}+ internships`}
          </Text>
          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={() => setFilters({})}>
              <Text style={styles.clearFiltersLink}>Clear Filters ✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Feed */}
      <FlatList
        ref={flatListRef}
        data={isLoading ? [] : feedItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (!isSearchMode && hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={Colors.brand.purple} />
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          ) : null
        }
        refreshControl={
          !isSearchMode ? (
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={() => refetchFeed()}
              tintColor={Colors.brand.purple}
            />
          ) : undefined
        }
      />

      {/* Filter bottom sheet */}
      <FilterBottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
        availableLocations={filterOptions?.locations as string[] ?? []}
        availableIndustries={filterOptions?.industries as string[] ?? []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  searchHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    paddingHorizontal: Spacing.sm,
    height: 44,
    gap: Spacing.xs,
  },
  searchBarIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter',
  },
  clearBtn: { color: Colors.text.muted, fontSize: 16, padding: 4 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: { borderColor: Colors.brand.purple, backgroundColor: 'rgba(124,58,237,0.1)' },
  filterBtnIcon: { fontSize: 20 },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.brand.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: Colors.white, fontSize: 9, fontWeight: Typography.fontWeight.bold },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  resultCount: { color: Colors.text.muted, fontSize: Typography.fontSize.xs },
  clearFiltersLink: { color: Colors.brand.purple, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium },
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl },
  cardWrapper: { marginBottom: 4 },
  dismissBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  dismissText: { color: Colors.text.muted, fontSize: Typography.fontSize.xs },
  emptyContainer: { alignItems: 'center', paddingTop: Spacing['3xl'], paddingHorizontal: Spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.lg },
  emptyTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.sm },
  emptySubtitle: { color: Colors.text.secondary, fontSize: Typography.fontSize.base, textAlign: 'center', lineHeight: 22 },
  clearFiltersBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.brand.purple,
  },
  clearFiltersBtnText: { color: Colors.white, fontWeight: Typography.fontWeight.semibold },
  loadingMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.lg },
  loadingMoreText: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
});
