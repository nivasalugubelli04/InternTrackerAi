import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  researchService,
  DiscoveredOpportunityItem,
  ResearchFeedResponse,
  TechnologyDemandTrend,
  ResearchWatchlist,
} from '../../services/research.service';

const COLORS = {
  primary: '#246BFE',
  primaryDeep: '#1456D9',
  sky: '#EAF3FF',
  soft: '#F3F7FF',
  green: '#79F28A',
  softGreen: '#E9FBEA',
  aiCream: '#FFF4D8',
  white: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  border: '#E7EAF0',
  error: '#EF4444',
  warning: '#F59E0B',
};

export const OpportunityResearchScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'WATCHLISTS' | 'SIGNALS' | 'COMPANIES'>(
    'MATCHES',
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [feed, setFeed] = useState<ResearchFeedResponse | null>(null);
  const [watchlists, setWatchlists] = useState<ResearchWatchlist[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<DiscoveredOpportunityItem | null>(
    null,
  );
  const [isActionModalVisible, setIsActionModalVisible] = useState<boolean>(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [feedData, watchlistsData] = await Promise.all([
        researchService.getPersonalizedFeed(),
        researchService.getWatchlists(),
      ]);
      setFeed(feedData);
      setWatchlists(watchlistsData);
    } catch (err: any) {
      console.warn('Failed to load research data', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await researchService.triggerRefresh();
    await loadData();
  };

  const handleCreatePrepAction = async (opp: DiscoveredOpportunityItem) => {
    try {
      setIsActionSubmitting(true);
      const task =
        opp.relevance.recommendedPreparation[0] ||
        `Prepare resume & project evidence for ${opp.companyName}`;
      await researchService.createPreparationAction({
        opportunityTitle: opp.jobTitle,
        companyName: opp.companyName,
        suggestedTask: task,
        estimatedMinutes: 45,
      });

      setIsActionModalVisible(false);
      Alert.alert(
        'Action Added to Phase 45',
        `"${task}" has been added to your Active Execution Plan.`,
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create preparation action.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const renderReadinessBadge = (level: string) => {
    let bg = COLORS.soft;
    let textColor = COLORS.primary;
    let label = 'READY';

    if (level === 'READY') {
      bg = COLORS.softGreen;
      textColor = '#059669';
      label = '✓ READY TO APPLY';
    } else if (level === 'NEEDS_PREPARATION') {
      bg = COLORS.aiCream;
      textColor = '#D97706';
      label = '⚡ NEEDS PREPARATION';
    } else if (level === 'PARTIALLY_READY') {
      bg = '#FEE2E2';
      textColor = COLORS.error;
      label = '△ PARTIALLY READY';
    } else {
      label = '○ EXPLORING';
    }

    return (
      <View style={[styles.readinessBadge, { backgroundColor: bg }]}>
        <Text style={[styles.readinessText, { color: textColor }]}>{label}</Text>
      </View>
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Researching & Personalizing Career Signals...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.headerSub}>AUTONOMOUS CAREER RESEARCH</Text>
          </View>
          <Text style={styles.headerTitle}>Opportunity Intelligence</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          <Text style={styles.refreshButtonText}>
            {isRefreshing ? 'Scanning...' : '↻ Scan Feeds'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'MATCHES' && styles.tabButtonActive]}
          onPress={() => setActiveTab('MATCHES')}
        >
          <Text style={[styles.tabText, activeTab === 'MATCHES' && styles.tabTextActive]}>
            Top Matches
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'WATCHLISTS' && styles.tabButtonActive]}
          onPress={() => setActiveTab('WATCHLISTS')}
        >
          <Text style={[styles.tabText, activeTab === 'WATCHLISTS' && styles.tabTextActive]}>
            Watchlists
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'SIGNALS' && styles.tabButtonActive]}
          onPress={() => setActiveTab('SIGNALS')}
        >
          <Text style={[styles.tabText, activeTab === 'SIGNALS' && styles.tabTextActive]}>
            Market Signals
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollArea}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'MATCHES' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>Personalized Matches for Your Target Goals</Text>
            {(feed?.topMatches || []).map((item) => (
              <View key={item.id} style={styles.oppCard}>
                <View style={styles.oppCardHeader}>
                  <View style={styles.oppMainInfo}>
                    <Text style={styles.oppCompany}>{item.companyName}</Text>
                    <Text style={styles.oppTitle}>{item.jobTitle}</Text>
                    <Text style={styles.oppMeta}>
                      📍 {item.location || 'Remote'} • {item.workMode || 'ONSITE'}{' '}
                      {item.stipend ? `• $${item.stipend}/mo` : ''}
                    </Text>
                  </View>
                  <View style={styles.matchScorePill}>
                    <Text style={styles.matchScoreNumber}>{item.relevance.overallScore}%</Text>
                    <Text style={styles.matchScoreLabel}>MATCH</Text>
                  </View>
                </View>

                {/* Readiness Badge */}
                {renderReadinessBadge(item.relevance.readinessLevel)}

                {/* Grounded Why Matched */}
                {item.whyMatchedExplanation ? (
                  <View style={styles.whyMatchedBox}>
                    <Text style={styles.whyMatchedTitle}>💡 Why this matched you:</Text>
                    <Text style={styles.whyMatchedText}>{item.whyMatchedExplanation}</Text>
                  </View>
                ) : null}

                {/* Key Strengths & Gaps */}
                <View style={styles.evidenceRow}>
                  <Text style={styles.evidenceTag}>
                    ✓ {item.relevance.matchingStrengths[0] || 'Technical alignment'}
                  </Text>
                  {item.relevance.criticalGaps[0] && (
                    <Text style={[styles.evidenceTag, styles.gapTag]}>
                      ⚠ {item.relevance.criticalGaps[0]}
                    </Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionSecondary}
                    onPress={() => {
                      setSelectedOpportunity(item);
                      setIsActionModalVisible(true);
                    }}
                  >
                    <Text style={styles.actionSecondaryText}>⚡ Prepare Action</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionPrimary}
                    onPress={() => {
                      if (item.applicationUrl) Linking.openURL(item.applicationUrl);
                    }}
                  >
                    <Text style={styles.actionPrimaryText}>Apply ↗</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'WATCHLISTS' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>Monitored Opportunity Watchlists</Text>
            {watchlists.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Active Watchlists</Text>
                <Text style={styles.emptySubtitle}>
                  Create targeted watchlists to track specific roles, startups, or AI internships.
                </Text>
              </View>
            ) : (
              watchlists.map((w) => (
                <View key={w.id} style={styles.watchlistCard}>
                  <View style={styles.watchlistHeader}>
                    <Text style={styles.watchlistTitle}>{w.title}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{w._count?.items || 0} Saved</Text>
                    </View>
                  </View>
                  <Text style={styles.watchlistDesc}>
                    {w.description || 'Targeting verified internships and programs.'}
                  </Text>
                  <View style={styles.roleChips}>
                    {w.targetRoles.map((r, i) => (
                      <View key={i} style={styles.roleChip}>
                        <Text style={styles.roleChipText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'SIGNALS' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>Market Demand & Technology Signals</Text>
            <Text style={styles.signalSub}>
              Aggregated from active verified opportunities matching your trajectory.
            </Text>
            {(feed?.trendingSignals || []).map((s, i) => (
              <View key={i} style={styles.signalCard}>
                <View style={styles.signalHeader}>
                  <Text style={styles.signalSkill}>{s.skillName}</Text>
                  <View
                    style={[
                      styles.trendBadge,
                      s.demandTrend === 'INCREASING' ? styles.trendUp : styles.trendStable,
                    ]}
                  >
                    <Text style={styles.trendText}>{s.demandTrend}</Text>
                  </View>
                </View>
                <Text style={styles.signalMeta}>
                  Requested in {s.frequencyCount} active roles across {s.sourceCount} verified
                  feeds.
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Preparation Action Modal */}
      <Modal visible={isActionModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Convert to Phase 45 Action</Text>
            <Text style={styles.modalDesc}>
              InternTracker AI will add a tailored preparation task to your Active Execution Plan
              for <Text style={{ fontWeight: 'bold' }}>{selectedOpportunity?.companyName}</Text>.
            </Text>

            <View style={styles.prepBox}>
              <Text style={styles.prepLabel}>RECOMMENDED TASK:</Text>
              <Text style={styles.prepText}>
                {selectedOpportunity?.relevance.recommendedPreparation[0] ||
                  'Deploy and highlight your core project evidence.'}
              </Text>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsActionModalVisible(false)}
                disabled={isActionSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => selectedOpportunity && handleCreatePrepAction(selectedOpportunity)}
                disabled={isActionSubmitting}
              >
                <Text style={styles.modalConfirmText}>
                  {isActionSubmitting ? 'Adding...' : 'Add to Daily Plan'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.sky,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabButton: {
    paddingVertical: 12,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  oppCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  oppCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  oppMainInfo: {
    flex: 1,
    marginRight: 10,
  },
  oppCompany: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
    textTransform: 'uppercase',
  },
  oppTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  oppMeta: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 4,
  },
  matchScorePill: {
    backgroundColor: COLORS.sky,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  matchScoreNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  matchScoreLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.primaryDeep,
  },
  readinessBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 10,
  },
  readinessText: {
    fontSize: 11,
    fontWeight: '700',
  },
  whyMatchedBox: {
    backgroundColor: COLORS.soft,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  whyMatchedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDeep,
    marginBottom: 2,
  },
  whyMatchedText: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 17,
  },
  evidenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  evidenceTag: {
    fontSize: 11,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: '#334155',
  },
  gapTag: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    gap: 8,
  },
  actionSecondary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.soft,
    borderRadius: 8,
  },
  actionSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actionPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  actionPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  watchlistCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  watchlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  watchlistTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  countBadge: {
    backgroundColor: COLORS.sky,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  watchlistDesc: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 4,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  roleChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleChipText: {
    fontSize: 11,
    color: '#475569',
  },
  signalSub: {
    fontSize: 12,
    color: COLORS.secondary,
    marginBottom: 12,
  },
  signalCard: {
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signalSkill: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trendUp: {
    backgroundColor: COLORS.softGreen,
  },
  trendStable: {
    backgroundColor: COLORS.sky,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  signalMeta: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 6,
    lineHeight: 18,
  },
  prepBox: {
    backgroundColor: COLORS.soft,
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  prepLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryDeep,
    letterSpacing: 0.5,
  },
  prepText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
    gap: 10,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  modalConfirmButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
});
