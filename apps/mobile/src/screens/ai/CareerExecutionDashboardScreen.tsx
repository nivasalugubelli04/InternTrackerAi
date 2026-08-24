import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  ActionSubStep,
  CareerSprint,
  DailyPlan,
  ExecutionItem,
  executionService,
  FocusSessionData,
  PlanReview,
  WeeklyPlan,
} from '../../services/execution.service';

const THEME = {
  primary: '#246BFE',
  deep: '#1456D9',
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

export const CareerExecutionDashboardScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TODAY' | 'WEEK' | 'SPRINT' | 'REVIEW'>('TODAY');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [sprints, setSprints] = useState<CareerSprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<CareerSprint | null>(null);
  const [review, setReview] = useState<PlanReview | null>(null);
  const [replanTrigger, setReplanTrigger] = useState<any>(null);

  // Modals state
  const [selectedAction, setSelectedAction] = useState<ExecutionItem | null>(null);
  const [focusSession, setFocusSession] = useState<FocusSessionData | null>(null);
  const [showSprintModal, setShowSprintModal] = useState<boolean>(false);
  const [newSprintTitle, setNewSprintTitle] = useState<string>('');
  const [newSprintGoal, setNewSprintGoal] = useState<string>('');
  const [newSprintDays, setNewSprintDays] = useState<number>(7);
  const [reviewNotes, setReviewNotes] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [today, week, sprintList, activeSpr, reviewData, replan] = await Promise.all([
        executionService.getDailyPlan(),
        executionService.getWeeklyPlan(),
        executionService.getSprints(),
        executionService.getActiveSprint(),
        executionService.getReview(),
        executionService.getReplanTriggers(),
      ]);

      setDailyPlan(today);
      setWeeklyPlan(week);
      setSprints(sprintList);
      setActiveSprint(activeSpr);
      setReview(reviewData);
      setReviewNotes(reviewData?.userNotes || '');
      setReplanTrigger(replan);
    } catch (err: any) {
      console.error('Failed to load execution data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStartAction = async (item: ExecutionItem) => {
    try {
      await executionService.startAction(item.id);
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to start action');
    }
  };

  const handleCompleteAction = async (item: ExecutionItem) => {
    try {
      await executionService.completeAction(item.id);
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to complete action');
    }
  };

  const handleOpenFocusSession = async (item: ExecutionItem) => {
    try {
      const session = await executionService.getFocusSession(item.id, 60);
      setFocusSession(session);
    } catch (err) {
      Alert.alert('Error', 'Failed to generate focus session');
    }
  };

  const handleDecomposeAction = async (item: ExecutionItem) => {
    try {
      const steps = await executionService.decomposeAction(item.id);
      setSelectedAction({ ...item, subSteps: steps });
    } catch (err) {
      Alert.alert('Error', 'Failed to break down action into steps');
    }
  };

  const handleToggleSubStep = async (actionId: string, stepId: string) => {
    try {
      const updated = await executionService.toggleSubStep(actionId, stepId);
      setSelectedAction(updated);
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to update step');
    }
  };

  const handleCreateSprint = async () => {
    if (!newSprintTitle.trim() || !newSprintGoal.trim()) {
      Alert.alert('Missing Fields', 'Please enter a sprint title and primary goal.');
      return;
    }
    try {
      await executionService.createSprint({
        title: newSprintTitle,
        goal: newSprintGoal,
        durationDays: newSprintDays,
      });
      setShowSprintModal(false);
      setNewSprintTitle('');
      setNewSprintGoal('');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to create sprint');
    }
  };

  const handleExecuteReplan = async () => {
    try {
      await executionService.executeReplan();
      setReplanTrigger(null);
      loadData();
      Alert.alert('Plan Updated', 'Your daily career execution plan has been reprioritized.');
    } catch (err) {
      Alert.alert('Error', 'Failed to execute replan');
    }
  };

  const handleSaveNotes = async () => {
    if (!review) return;
    try {
      await executionService.saveReviewNotes(review.id, reviewNotes);
      Alert.alert('Saved', 'Your reflection notes have been saved.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save notes');
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Synthesizing Career Execution Intelligence...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const nba = dailyPlan?.nextBestAction;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Career Execution Engine</Text>
          <Text style={styles.headerSubtitle}>AI recommends. You decide.</Text>
        </View>
        <TouchableOpacity style={styles.replanBtn} onPress={onRefresh}>
          <Text style={styles.replanBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Adaptive Replanning Banner if Triggered */}
      {replanTrigger && (
        <View style={styles.replanBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.replanBannerTitle}>{replanTrigger.title}</Text>
            <Text style={styles.replanBannerDesc}>{replanTrigger.reason}</Text>
          </View>
          <TouchableOpacity style={styles.replanActionBtn} onPress={handleExecuteReplan}>
            <Text style={styles.replanActionBtnText}>Review Plan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'TODAY' && styles.tabItemActive]}
          onPress={() => setActiveTab('TODAY')}
        >
          <Text style={[styles.tabText, activeTab === 'TODAY' && styles.tabTextActive]}>
            Today's Plan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'WEEK' && styles.tabItemActive]}
          onPress={() => setActiveTab('WEEK')}
        >
          <Text style={[styles.tabText, activeTab === 'WEEK' && styles.tabTextActive]}>
            This Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'SPRINT' && styles.tabItemActive]}
          onPress={() => setActiveTab('SPRINT')}
        >
          <Text style={[styles.tabText, activeTab === 'SPRINT' && styles.tabTextActive]}>
            Career Sprints
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'REVIEW' && styles.tabItemActive]}
          onPress={() => setActiveTab('REVIEW')}
        >
          <Text style={[styles.tabText, activeTab === 'REVIEW' && styles.tabTextActive]}>
            Weekly Review
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />
        }
      >
        {activeTab === 'TODAY' && (
          <>
            {/* ── TOP SECTION: NEXT BEST ACTION ───────────────────────────────── */}
            {nba && (
              <View style={styles.nbaCard}>
                <View style={styles.nbaHeaderRow}>
                  <View style={styles.nbaBadge}>
                    <Text style={styles.nbaBadgeText}>NEXT BEST ACTION</Text>
                  </View>
                  <View style={styles.urgencyBadge}>
                    <Text style={styles.urgencyBadgeText}>{nba.urgencyLabel}</Text>
                  </View>
                </View>

                <Text style={styles.nbaTitle}>{nba.action.title}</Text>
                <Text style={styles.nbaReason}>💡 Why now: {nba.reason}</Text>

                {nba.action.potentialImpact && (
                  <Text style={styles.nbaImpact}>🎯 Impact: {nba.action.potentialImpact}</Text>
                )}

                <View style={styles.nbaActionRow}>
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => handleStartAction(nba.action as any)}
                  >
                    <Text style={styles.primaryActionBtnText}>▶ Start Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryActionBtn}
                    onPress={() => handleOpenFocusSession(nba.action as any)}
                  >
                    <Text style={styles.secondaryActionBtnText}>⏱ Focus Session</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.ghostActionBtn}
                    onPress={() => setSelectedAction(nba.action as any)}
                  >
                    <Text style={styles.ghostActionBtnText}>Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── TODAY'S FOCUSED PLAN (01, 02, 03) ─────────────────────────── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Priority Plan</Text>
              <View style={styles.workloadPill}>
                <Text style={styles.workloadPillText}>
                  {dailyPlan?.workloadRisk || 'BALANCED'} ({dailyPlan?.totalEstimatedMinutes || 60}
                  m)
                </Text>
              </View>
            </View>

            {dailyPlan?.todayActions && dailyPlan.todayActions.length > 0 ? (
              dailyPlan.todayActions.map((item, index) => (
                <View key={item.id} style={styles.actionCard}>
                  <View style={styles.actionNumberBox}>
                    <Text style={styles.actionNumberText}>0{index + 1}</Text>
                  </View>
                  <View style={styles.actionBody}>
                    <View style={styles.actionMetaRow}>
                      <View style={styles.sourceTag}>
                        <Text style={styles.sourceTagText}>{item.source}</Text>
                      </View>
                      <Text style={styles.effortText}>
                        ⏱ {item.estimatedMinutes}m · {item.estimatedEffort}
                      </Text>
                    </View>
                    <Text style={styles.actionTitleText}>{item.title}</Text>
                    <Text style={styles.actionPriorityReason}>{item.priorityExplanation}</Text>

                    <View style={styles.actionCardBtns}>
                      <TouchableOpacity
                        style={[
                          styles.smallBtn,
                          item.status === 'COMPLETED'
                            ? styles.smallBtnDone
                            : styles.smallBtnPrimary,
                        ]}
                        onPress={() => handleCompleteAction(item)}
                      >
                        <Text style={styles.smallBtnText}>
                          {item.status === 'COMPLETED' ? '✓ Completed' : 'Mark Done'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.smallBtnOutline}
                        onPress={() => handleDecomposeAction(item)}
                      >
                        <Text style={styles.smallBtnOutlineText}>
                          Steps ({item.subSteps?.length || 0})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.smallBtnOutline}
                        onPress={() => handleOpenFocusSession(item)}
                      >
                        <Text style={styles.smallBtnOutlineText}>Focus Block</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Your day is clear!</Text>
                <Text style={styles.emptySubtitle}>
                  No urgent career actions scheduled right now.
                </Text>
              </View>
            )}

            {/* ── UPCOMING DEADLINES ─────────────────────────────────────────── */}
            {dailyPlan?.upcomingDeadlines && dailyPlan.upcomingDeadlines.length > 0 && (
              <View style={styles.deadlinesSection}>
                <Text style={styles.sectionTitle}>Approaching Deadlines</Text>
                {dailyPlan.upcomingDeadlines.map((dl, i) => (
                  <View key={i} style={styles.deadlineRow}>
                    <View style={styles.deadlineDaysBadge}>
                      <Text style={styles.deadlineDaysText}>{dl.daysRemaining}d</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deadlineTitle}>{dl.title}</Text>
                      <Text style={styles.deadlineSource}>{dl.source} deadline</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── BLOCKED ACTIONS ───────────────────────────────────────────── */}
            {dailyPlan?.blockedActions && dailyPlan.blockedActions.length > 0 && (
              <View style={styles.blockedSection}>
                <Text style={styles.sectionTitle}>Actions Awaiting Prerequisites</Text>
                {dailyPlan.blockedActions.map((blk, i) => (
                  <View key={i} style={styles.blockedCard}>
                    <Text style={styles.blockedTitle}>{blk.title}</Text>
                    <Text style={styles.blockedReason}>⚠️ {blk.blockerReason}</Text>
                    {blk.prerequisiteTitle && (
                      <Text style={styles.prereqLink}>Prerequisite: {blk.prerequisiteTitle}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'WEEK' && weeklyPlan && (
          <View style={styles.weekContainer}>
            {/* Week Strategy Overview */}
            <View style={styles.weekOverviewCard}>
              <Text style={styles.weekObjectiveLabel}>WEEK OBJECTIVE</Text>
              <Text style={styles.weekObjectiveTitle}>{weeklyPlan.planObjective}</Text>

              <View style={styles.focusPillRow}>
                <View style={styles.primaryFocusPill}>
                  <Text style={styles.primaryFocusPillText}>🎯 {weeklyPlan.primaryFocus}</Text>
                </View>
                {weeklyPlan.secondaryFocus && (
                  <View style={styles.secondaryFocusPill}>
                    <Text style={styles.secondaryFocusPillText}>
                      ⭐ {weeklyPlan.secondaryFocus}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Focus Distribution */}
            <View style={styles.distributionCard}>
              <Text style={styles.cardHeader}>Recommended Focus Distribution</Text>
              <View style={styles.distBar}>
                <View
                  style={[
                    styles.distSegment,
                    {
                      flex: weeklyPlan.recommendedDistribution.preparePercent,
                      backgroundColor: THEME.primary,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.distSegment,
                    {
                      flex: weeklyPlan.recommendedDistribution.applyPercent,
                      backgroundColor: THEME.deep,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.distSegment,
                    {
                      flex: weeklyPlan.recommendedDistribution.buildPercent,
                      backgroundColor: THEME.warning,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.distSegment,
                    {
                      flex: weeklyPlan.recommendedDistribution.networkPercent,
                      backgroundColor: THEME.green,
                    },
                  ]}
                />
              </View>
              <View style={styles.distLegend}>
                <Text style={styles.legendText}>
                  ■ Prep ({weeklyPlan.recommendedDistribution.preparePercent}%)
                </Text>
                <Text style={styles.legendText}>
                  ■ Apply ({weeklyPlan.recommendedDistribution.applyPercent}%)
                </Text>
                <Text style={styles.legendText}>
                  ■ Build ({weeklyPlan.recommendedDistribution.buildPercent}%)
                </Text>
                <Text style={styles.legendText}>
                  ■ Network ({weeklyPlan.recommendedDistribution.networkPercent}%)
                </Text>
              </View>
            </View>

            {/* Top Opportunities & Milestones */}
            <View style={styles.weekSection}>
              <Text style={styles.sectionTitle}>Key Opportunities & Targets</Text>
              {weeklyPlan.topOpportunities.map((op, i) => (
                <View key={i} style={styles.weekItemRow}>
                  <Text style={styles.weekItemTitle}>
                    {op.roleTitle} @ {op.company}
                  </Text>
                  <Text style={styles.weekItemMeta}>Alignment: {op.alignmentScore}%</Text>
                </View>
              ))}
            </View>

            <View style={styles.weekSection}>
              <Text style={styles.sectionTitle}>Interview Preparations</Text>
              {weeklyPlan.interviewPreparations.map((ip, i) => (
                <View key={i} style={styles.weekItemRow}>
                  <Text style={styles.weekItemTitle}>
                    {ip.stage} — {ip.company}
                  </Text>
                  <Text style={styles.weekItemMeta}>Status: {ip.status}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'SPRINT' && (
          <View style={styles.sprintContainer}>
            <View style={styles.sprintHeaderRow}>
              <Text style={styles.sectionTitle}>Active Career Sprint</Text>
              <TouchableOpacity
                style={styles.newSprintBtn}
                onPress={() => setShowSprintModal(true)}
              >
                <Text style={styles.newSprintBtnText}>+ New Sprint</Text>
              </TouchableOpacity>
            </View>

            {activeSprint ? (
              <View style={styles.activeSprintCard}>
                <Text style={styles.sprintTitle}>{activeSprint.title}</Text>
                <Text style={styles.sprintGoal}>Goal: {activeSprint.goal}</Text>

                <View style={styles.progressBarBg}>
                  <View
                    style={[styles.progressBarFill, { width: `${activeSprint.progressPercent}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>{activeSprint.progressPercent}% Completed</Text>

                <View style={styles.milestonesList}>
                  {activeSprint.items.map((it) => (
                    <TouchableOpacity
                      key={it.id}
                      style={styles.milestoneRow}
                      onPress={async () => {
                        await executionService.completeSprintItem(activeSprint.id, it.id);
                        loadData();
                      }}
                    >
                      <Text style={styles.milestoneCheck}>
                        {it.status === 'COMPLETED' ? '☑' : '☐'}
                      </Text>
                      <Text
                        style={[
                          styles.milestoneTitle,
                          it.status === 'COMPLETED' && styles.milestoneDone,
                        ]}
                      >
                        Day {it.targetDay}: {it.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Active Sprint</Text>
                <Text style={styles.emptySubtitle}>
                  Create a 7-day or 14-day execution sprint to stay laser focused.
                </Text>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => setShowSprintModal(true)}
                >
                  <Text style={styles.primaryActionBtnText}>Launch 7-Day Sprint</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Past Sprints */}
            {sprints.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <Text style={styles.sectionTitle}>Sprint History</Text>
                {sprints.map((s) => (
                  <View key={s.id} style={styles.historyCard}>
                    <Text style={styles.historyTitle}>{s.title}</Text>
                    <Text style={styles.historyMeta}>
                      {s.durationDays} Days · {s.status} ({s.progressPercent}%)
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'REVIEW' && review && (
          <View style={styles.reviewContainer}>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewHeading}>WEEKLY PERFORMANCE REFLECTION</Text>
              <Text style={styles.reviewSub}>
                Non-punitive execution progress & momentum analysis.
              </Text>

              <Text style={styles.reviewSectionHeader}>🌟 What Went Well</Text>
              {review.whatWentWell.map((w, i) => (
                <Text key={i} style={styles.bulletItem}>
                  • {w}
                </Text>
              ))}

              <Text style={styles.reviewSectionHeader}>📈 Progress Made</Text>
              {review.progressMade.map((p, i) => (
                <Text key={i} style={styles.bulletItem}>
                  • {p}
                </Text>
              ))}

              <Text style={styles.reviewSectionHeader}>🔄 Carryover Items (Zero Penalty)</Text>
              {review.actionsCarriedForward.length > 0 ? (
                review.actionsCarriedForward.map((a, i) => (
                  <Text key={i} style={styles.bulletItem}>
                    • {a}
                  </Text>
                ))
              ) : (
                <Text style={styles.bulletItem}>• All planned items successfully executed!</Text>
              )}

              <Text style={styles.reviewSectionHeader}>🚀 Next Week's Recommended Focus</Text>
              {review.nextFocusRecommendations.map((r, i) => (
                <Text key={i} style={styles.bulletItem}>
                  • {r}
                </Text>
              ))}

              <Text style={styles.reviewSectionHeader}>📝 Personal Reflection Notes</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                placeholder="Add your takeaways or adjustments for next week..."
                value={reviewNotes}
                onChangeText={setReviewNotes}
              />
              <TouchableOpacity style={styles.saveNotesBtn} onPress={handleSaveNotes}>
                <Text style={styles.saveNotesBtnText}>Save Reflection Notes</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── FOCUS SESSION MODAL ──────────────────────────────────────────────── */}
      <Modal visible={!!focusSession} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Focus Session</Text>
            <Text style={styles.modalSub}>{focusSession?.actionTitle}</Text>

            <View style={styles.focusTimerBox}>
              <Text style={styles.focusTimerMinutes}>
                {focusSession?.suggestedDurationMinutes}m
              </Text>
              <Text style={styles.focusTimerLabel}>Timeboxed Deep Work</Text>
            </View>

            <Text style={styles.modalSectionHeader}>Preparation Checklist</Text>
            {focusSession?.preparationChecklist.map((c, i) => (
              <Text key={i} style={styles.checklistItem}>
                ✓ {c}
              </Text>
            ))}

            {focusSession?.calendarContext?.canAddToCalendar && (
              <View style={styles.calSuggestionBox}>
                <Text style={styles.calSuggestionTitle}>📅 Calendar Suggestion</Text>
                <Text style={styles.calSuggestionDesc}>
                  "{focusSession.calendarContext.suggestedEventTitle}" ready to add.
                </Text>
                <TouchableOpacity
                  style={styles.calBtn}
                  onPress={() => {
                    Alert.alert(
                      'Calendar Ready',
                      'Focus block ready to add to Google Calendar upon confirmation.',
                    );
                  }}
                >
                  <Text style={styles.calBtnText}>Add to Calendar</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setFocusSession(null)}>
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── ACTION DECOMPOSITION MODAL ───────────────────────────────────────── */}
      <Modal visible={!!selectedAction} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Action Breakdown</Text>
            <Text style={styles.modalSub}>{selectedAction?.title}</Text>

            <Text style={styles.modalSectionHeader}>Execution Steps</Text>
            {selectedAction?.subSteps && selectedAction.subSteps.length > 0 ? (
              selectedAction.subSteps.map((step) => (
                <TouchableOpacity
                  key={step.id}
                  style={styles.stepRow}
                  onPress={() => handleToggleSubStep(selectedAction.id, step.id)}
                >
                  <Text style={styles.stepCheck}>{step.isCompleted ? '☑' : '☐'}</Text>
                  <Text style={[styles.stepTitle, step.isCompleted && styles.stepDone]}>
                    {step.order}. {step.title} ({step.estimatedMinutes || 15}m)
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.loadingText}>Decomposing action steps...</Text>
            )}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedAction(null)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── SPRINT CREATION MODAL ────────────────────────────────────────────── */}
      <Modal visible={showSprintModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Career Sprint</Text>
            <Text style={styles.modalSub}>
              Define a timeboxed period for rapid career execution.
            </Text>

            <Text style={styles.inputLabel}>Sprint Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 7-Day AI Application Sprint"
              value={newSprintTitle}
              onChangeText={setNewSprintTitle}
            />

            <Text style={styles.inputLabel}>Primary Goal</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Submit 5 tailored applications and deploy ML project"
              value={newSprintGoal}
              onChangeText={setNewSprintGoal}
            />

            <Text style={styles.inputLabel}>Duration</Text>
            <View style={styles.daysRow}>
              {[7, 14, 21].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[styles.dayChoiceBtn, newSprintDays === days && styles.dayChoiceActive]}
                  onPress={() => setNewSprintDays(days)}
                >
                  <Text
                    style={[
                      styles.dayChoiceText,
                      newSprintDays === days && styles.dayChoiceTextActive,
                    ]}
                  >
                    {days} Days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSprintModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreateSprint}>
                <Text style={styles.modalSubmitBtnText}>Launch Sprint</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.soft,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.secondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderColor: THEME.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.secondary,
    marginTop: 2,
  },
  replanBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: THEME.sky,
  },
  replanBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
  },
  replanBanner: {
    backgroundColor: THEME.aiCream,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.warning,
  },
  replanBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  replanBannerDesc: {
    fontSize: 11,
    color: THEME.secondary,
    marginTop: 2,
  },
  replanActionBtn: {
    backgroundColor: THEME.deep,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  replanActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.white,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.white,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: THEME.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 3,
    borderColor: THEME.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.secondary,
  },
  tabTextActive: {
    color: THEME.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  nbaCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  nbaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nbaBadge: {
    backgroundColor: THEME.sky,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  nbaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.primary,
  },
  urgencyBadge: {
    backgroundColor: THEME.softGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  nbaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.text,
    marginVertical: 4,
  },
  nbaReason: {
    fontSize: 13,
    color: THEME.secondary,
    lineHeight: 18,
    marginTop: 4,
  },
  nbaImpact: {
    fontSize: 12,
    color: THEME.deep,
    fontWeight: '600',
    marginTop: 6,
  },
  nbaActionRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  primaryActionBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.white,
  },
  secondaryActionBtn: {
    backgroundColor: THEME.sky,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
  },
  ghostActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ghostActionBtnText: {
    fontSize: 12,
    color: THEME.secondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
  },
  workloadPill: {
    backgroundColor: THEME.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  workloadPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.secondary,
  },
  actionCard: {
    backgroundColor: THEME.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  actionNumberBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.sky,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.primary,
  },
  actionBody: {
    flex: 1,
  },
  actionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sourceTag: {
    backgroundColor: THEME.soft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.secondary,
  },
  effortText: {
    fontSize: 10,
    color: THEME.secondary,
  },
  actionTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  actionPriorityReason: {
    fontSize: 11,
    color: THEME.secondary,
    marginTop: 2,
  },
  actionCardBtns: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  smallBtnPrimary: {
    backgroundColor: THEME.primary,
  },
  smallBtnDone: {
    backgroundColor: THEME.softGreen,
  },
  smallBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.white,
  },
  smallBtnOutline: {
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  smallBtnOutlineText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.text,
  },
  deadlinesSection: {
    marginTop: 16,
    backgroundColor: THEME.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  deadlineDaysBadge: {
    backgroundColor: THEME.sky,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
  },
  deadlineDaysText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.deep,
  },
  deadlineTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
  },
  deadlineSource: {
    fontSize: 11,
    color: THEME.secondary,
  },
  blockedSection: {
    marginTop: 16,
  },
  blockedCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: THEME.warning,
  },
  blockedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  blockedReason: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  prereqLink: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.deep,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: THEME.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  weekContainer: {
    gap: 16,
  },
  weekOverviewCard: {
    backgroundColor: THEME.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  weekObjectiveLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.secondary,
  },
  weekObjectiveTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 4,
  },
  focusPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  primaryFocusPill: {
    backgroundColor: THEME.sky,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  primaryFocusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
  },
  secondaryFocusPill: {
    backgroundColor: THEME.soft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  secondaryFocusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.secondary,
  },
  distributionCard: {
    backgroundColor: THEME.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 8,
  },
  distBar: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  distSegment: {
    height: '100%',
  },
  distLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  legendText: {
    fontSize: 9,
    color: THEME.secondary,
    fontWeight: '600',
  },
  weekSection: {
    backgroundColor: THEME.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  weekItemRow: {
    marginTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: THEME.border,
  },
  weekItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
  },
  weekItemMeta: {
    fontSize: 11,
    color: THEME.secondary,
    marginTop: 2,
  },
  sprintContainer: {
    gap: 16,
  },
  sprintHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newSprintBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newSprintBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.white,
  },
  activeSprintCard: {
    backgroundColor: THEME.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  sprintTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  sprintGoal: {
    fontSize: 12,
    color: THEME.secondary,
    marginTop: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: THEME.soft,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.primary,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
    marginTop: 4,
    textAlign: 'right',
  },
  milestonesList: {
    marginTop: 12,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  milestoneCheck: {
    fontSize: 16,
    marginRight: 8,
    color: THEME.primary,
  },
  milestoneTitle: {
    fontSize: 12,
    color: THEME.text,
  },
  milestoneDone: {
    textDecorationLine: 'line-through',
    color: THEME.secondary,
  },
  historyCard: {
    backgroundColor: THEME.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
  },
  historyMeta: {
    fontSize: 11,
    color: THEME.secondary,
    marginTop: 2,
  },
  reviewContainer: {
    gap: 16,
  },
  reviewCard: {
    backgroundColor: THEME.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  reviewHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.secondary,
  },
  reviewSub: {
    fontSize: 12,
    color: THEME.secondary,
    marginTop: 2,
    marginBottom: 12,
  },
  reviewSectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 12,
    marginBottom: 4,
  },
  bulletItem: {
    fontSize: 12,
    color: THEME.text,
    lineHeight: 18,
    marginLeft: 6,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: THEME.text,
    minHeight: 60,
    marginTop: 8,
  },
  saveNotesBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveNotesBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
  },
  modalSub: {
    fontSize: 12,
    color: THEME.secondary,
    marginTop: 2,
    marginBottom: 14,
  },
  focusTimerBox: {
    backgroundColor: THEME.sky,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginVertical: 10,
  },
  focusTimerMinutes: {
    fontSize: 36,
    fontWeight: '800',
    color: THEME.primary,
  },
  focusTimerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.deep,
  },
  modalSectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 12,
    marginBottom: 6,
  },
  checklistItem: {
    fontSize: 12,
    color: THEME.text,
    lineHeight: 20,
  },
  calSuggestionBox: {
    backgroundColor: THEME.soft,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  calSuggestionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.text,
  },
  calSuggestionDesc: {
    fontSize: 11,
    color: THEME.secondary,
    marginTop: 2,
  },
  calBtn: {
    backgroundColor: THEME.deep,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  calBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.white,
  },
  modalCloseBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.white,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: THEME.border,
  },
  stepCheck: {
    fontSize: 16,
    marginRight: 8,
    color: THEME.primary,
  },
  stepTitle: {
    fontSize: 12,
    color: THEME.text,
    flex: 1,
  },
  stepDone: {
    textDecorationLine: 'line-through',
    color: THEME.secondary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.text,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: THEME.text,
    marginTop: 4,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  dayChoiceBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dayChoiceActive: {
    backgroundColor: THEME.sky,
    borderColor: THEME.primary,
  },
  dayChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.secondary,
  },
  dayChoiceTextActive: {
    color: THEME.primary,
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.secondary,
  },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.white,
  },
});
