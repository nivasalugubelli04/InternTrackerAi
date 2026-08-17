import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { useAuthContext } from '../context/AuthContext';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { careerCenterService } from '../services/career-center.service';
import type { CareerActionItem } from '../services/career-center.service';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen(): React.ReactElement {
  const { user } = useAuthContext();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  // ── Modals & Local State ──────────────────────────────────────────────────
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [activeExplainKey, setActiveExplainKey] = useState<string | null>(null);

  // Prefs edits
  const [editBudget, setEditBudget] = useState(30);
  const [editMode, setEditMode] = useState('GENERAL_CAREER');
  const [prefsLoading, setPrefsLoading] = useState(false);

  // Brief state
  const [briefText, setBriefText] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: 'user' | 'assistant'; text: string }>
  >([
    {
      sender: 'assistant',
      text: 'Hello! I am your career coach. How can I help you prepare today?',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [convId, setConvId] = useState<string | undefined>(undefined);

  // Timeline filters
  const [selectedTimelineCategory, setSelectedTimelineCategory] = useState('all');

  // ── Queries ───────────────────────────────────────────────────────────────
  const {
    data: dashboard,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['career-center', 'dashboard'],
    queryFn: () => careerCenterService.getDashboard(),
  });

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleActionComplete = async (actionId: string) => {
    try {
      await careerCenterService.completeAction(actionId);
      queryClient.invalidateQueries({ queryKey: ['career-center'] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleActionDismiss = async (actionId: string) => {
    try {
      await careerCenterService.dismissAction(actionId);
      queryClient.invalidateQueries({ queryKey: ['career-center'] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleActionSnooze = async (actionId: string) => {
    try {
      await careerCenterService.snoozeAction(actionId, 24);
      queryClient.invalidateQueries({ queryKey: ['career-center'] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePrefs = async () => {
    setPrefsLoading(true);
    try {
      await careerCenterService.updateDailyPlan(editBudget, editMode);
      queryClient.invalidateQueries({ queryKey: ['career-center'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setShowPrefsModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setPrefsLoading(false);
    }
  };

  const handleFetchBrief = async () => {
    setShowBriefModal(true);
    setBriefLoading(true);
    try {
      const brief = await careerCenterService.getDailyBrief();
      setBriefText(brief);
    } catch (e) {
      setBriefText('Failed to generate daily AI brief. Check connection.');
    } finally {
      setBriefLoading(false);
    }
  };

  const handleSendChat = async (textToSend: string) => {
    if (!textToSend.trim() || chatLoading) return;
    const msg = textToSend.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: msg }]);
    setChatLoading(true);

    try {
      const result = await careerCenterService.chat(msg, convId);
      if (result.conversationId) setConvId(result.conversationId);
      setChatMessages((prev) => [...prev, { sender: 'assistant', text: result.message.content }]);
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: 'Error: Failed to fetch copilot response.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Query timeline events reactively based on filter selection
  const { data: timelineEvents = [] } = useQuery({
    queryKey: ['career-timeline', selectedTimelineCategory],
    queryFn: () =>
      careerCenterService.getTimeline(
        selectedTimelineCategory === 'all' ? undefined : selectedTimelineCategory,
      ),
  });
  const filteredTimeline = timelineEvents;

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'URGENT':
        return Colors.error;
      case 'HIGH':
        return Colors.warning;
      case 'MEDIUM':
        return Colors.info;
      default:
        return Colors.text.muted;
    }
  };

  const getReadinessColor = (state: string) => {
    switch (state) {
      case 'READY':
        return Colors.success;
      case 'DEVELOPING':
        return Colors.brand.cyan;
      case 'NEEDS ATTENTION':
        return Colors.warning;
      default:
        return Colors.text.muted;
    }
  };

  if (isLoading || !dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand.purple} />
        <Text style={styles.loadingText}>Orchestrating career intelligence...</Text>
      </View>
    );
  }

  const { summary, actions, opportunities, readiness } = dashboard;
  const firstName = user?.firstName ?? 'Student';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.purple}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {greeting()}, {firstName} 👋
            </Text>
            <Text style={styles.subgreeting}>Unified Career Command Center</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleFetchBrief}>
              <Text style={{ fontSize: 20 }}>✨</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                setEditBudget(dashboard.actions.length * 10 || 30);
                setShowPrefsModal(true);
              }}
            >
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Career Goal Card */}
        <View style={styles.goalCard}>
          <Text style={styles.goalTitle}>🎯 Target Role: {summary.targetRole}</Text>
          <Text style={styles.goalDescription}>{summary.careerGoal}</Text>
          <View style={styles.progressStrip}>
            <View style={styles.completionBar}>
              <View style={[styles.completionFill, { width: `${summary.profileCompletion}%` }]} />
            </View>
            <Text style={styles.completionText}>Profile {summary.profileCompletion}% complete</Text>
          </View>
        </View>

        {/* Readiness Summary Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚦 Career Readiness Summary</Text>
          <Text style={styles.sectionSubtitle}>
            Verified indicators. Click for transparent methodology
          </Text>
          <View style={styles.grid}>
            {(
              ['profile', 'resume', 'skills', 'applications', 'interviews', 'learning'] as const
            ).map((key) => {
              const state = readiness[key];
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.gridCard, activeExplainKey === key && styles.gridCardActive]}
                  onPress={() => setActiveExplainKey(activeExplainKey === key ? null : key)}
                >
                  <Text style={styles.gridLabel}>{key.toUpperCase()}</Text>
                  <View
                    style={[styles.badge, { backgroundColor: `${getReadinessColor(state)}22` }]}
                  >
                    <Text style={[styles.badgeText, { color: getReadinessColor(state) }]}>
                      {state}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {activeExplainKey && (
            <View style={styles.explainBox}>
              <Text style={styles.explainTitle}>Methodology: {activeExplainKey.toUpperCase()}</Text>
              <Text style={styles.explainText}>{readiness.methodology[activeExplainKey]}</Text>
            </View>
          )}
        </View>

        {/* Today's Prioritized Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Today's Priority Actions</Text>
          <Text style={styles.sectionSubtitle}>
            Fits within your time budget. Deduplicated for focus.
          </Text>
          {actions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>All caught up! 🎉</Text>
              <Text style={styles.emptyText}>
                No actions pending. Explore Matched Opportunities below.
              </Text>
            </View>
          ) : (
            actions.map((act: CareerActionItem) => (
              <View key={act.id} style={styles.actionCard}>
                <View style={styles.actionHeader}>
                  <Text style={[styles.priorityBadge, { color: getPriorityColor(act.priority) }]}>
                    ● {act.priority}
                  </Text>
                  {act.expiresAt && <Text style={styles.expiresText}>Expires soon</Text>}
                </View>
                <Text style={styles.actionTitle}>{act.title}</Text>
                <Text style={styles.actionDesc}>{act.description}</Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actBtn, styles.btnComplete]}
                    onPress={() => handleActionComplete(act.id)}
                  >
                    <Text style={styles.btnText}>✓ Done</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actBtn, styles.btnSnooze]}
                    onPress={() => handleActionSnooze(act.id)}
                  >
                    <Text style={styles.btnText}>⏰ Snooze</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actBtn, styles.btnDismiss]}
                    onPress={() => handleActionDismiss(act.id)}
                  >
                    <Text style={styles.btnText}>✕ Skip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recommended Opportunities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Top Opportunity Matches</Text>
          <Text style={styles.sectionSubtitle}>Ranked by AI matching engine signals</Text>
          {opportunities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Complete your profile to see matching internships.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            >
              {opportunities.map((opp: any) => (
                <View key={opp.id} style={styles.oppCardWrapper}>
                  <Text style={styles.oppScoreBadge}>🎯 {opp.matchScore}% Match</Text>
                  <Text style={styles.oppRole}>{opp.role}</Text>
                  <Text style={styles.oppCompany}>
                    {opp.company} • {opp.location}
                  </Text>
                  <Text style={styles.oppReason} numberOfLines={2}>
                    {opp.reasons[0] || 'Good skill fit'}
                  </Text>
                  <TouchableOpacity
                    style={styles.oppApplyBtn}
                    onPress={() => navigation.navigate('ExploreTab')}
                  >
                    <Text style={styles.oppApplyText}>Apply Now</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Timeline Feed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Career timeline</Text>
          <Text style={styles.sectionSubtitle}>Chronological history of placement events</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timelineTabs}
          >
            {['all', 'applications', 'learning', 'interviews', 'skills', 'milestones'].map(
              (cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.tab, selectedTimelineCategory === cat && styles.tabActive]}
                  onPress={() => setSelectedTimelineCategory(cat)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      selectedTimelineCategory === cat && styles.tabTextActive,
                    ]}
                  >
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </ScrollView>

          {filteredTimeline.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No events recorded in this category.</Text>
            </View>
          ) : (
            filteredTimeline.slice(0, 5).map((e: any) => (
              <View key={e.id} style={styles.timelineItem}>
                <View style={styles.timelineIndicator} />
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>{e.title}</Text>
                  <Text style={styles.timelineDesc}>{e.description}</Text>
                  <Text style={styles.timelineTime}>
                    {new Date(e.timestamp).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: Spacing.xl * 2 }} />
      </ScrollView>

      {/* Floating AI Coach Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowChatModal(true)}>
        <Text style={styles.fabText}>💬 Coach</Text>
      </TouchableOpacity>

      {/* ── Preferences Modal ───────────────────────────────────────────────── */}
      <Modal visible={showPrefsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚙️ Settings & Time Budget</Text>

            <Text style={styles.inputLabel}>Career Path Mode</Text>
            <View style={styles.modePicker}>
              {[
                'GENERAL_CAREER',
                'INTERNSHIP_SEARCH',
                'INTERVIEW_PREPARATION',
                'SKILL_BUILDING',
                'APPLICATION_FOCUS',
              ].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.pickerItem, editMode === mode && styles.pickerItemActive]}
                  onPress={() => setEditMode(mode)}
                >
                  <Text style={[styles.pickerText, editMode === mode && styles.pickerTextActive]}>
                    {mode.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Daily Time Budget: {editBudget} mins</Text>
            <View style={styles.budgetRow}>
              {[15, 30, 60, 120].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[styles.budgetBox, editBudget === mins && styles.budgetBoxActive]}
                  onPress={() => setEditBudget(mins)}
                >
                  <Text style={[styles.budgetText, editBudget === mins && styles.budgetTextActive]}>
                    {mins}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnCancel]}
                onPress={() => setShowPrefsModal(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnSave]}
                onPress={handleSavePrefs}
                disabled={prefsLoading}
              >
                {prefsLoading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.btnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Daily AI Brief Modal ────────────────────────────────────────────── */}
      <Modal visible={showBriefModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✨ Your AI Career Brief</Text>
            {briefLoading ? (
              <View style={styles.briefLoadingBox}>
                <ActivityIndicator size="large" color={Colors.brand.purple} />
                <Text style={styles.loadingText}>Synthesizing updates...</Text>
              </View>
            ) : (
              <ScrollView style={styles.briefScroll}>
                <Text style={styles.briefText}>{briefText}</Text>
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.modalBtn, styles.btnCancel, { marginTop: Spacing.md }]}
              onPress={() => setShowBriefModal(false)}
            >
              <Text style={styles.btnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── AI Assistant Chat Drawer ────────────────────────────────────────── */}
      <Modal visible={showChatModal} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: Colors.background.primary }}
        >
          <View style={styles.chatHeader}>
            <Text style={styles.chatHeaderTitle}>💬 AI Career Coach</Text>
            <TouchableOpacity onPress={() => setShowChatModal(false)}>
              <Text style={styles.chatCloseText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.chatScroll}
            ref={(ref) => ref?.scrollToEnd({ animated: true })}
          >
            {chatMessages.map((msg, idx) => (
              <View
                key={idx}
                style={[
                  styles.chatBubble,
                  msg.sender === 'user' ? styles.bubbleUser : styles.bubbleAi,
                ]}
              >
                <Text
                  style={[styles.chatText, msg.sender === 'user' ? styles.textUser : styles.textAi]}
                >
                  {msg.text}
                </Text>
              </View>
            ))}
            {chatLoading && (
              <ActivityIndicator
                size="small"
                color={Colors.brand.purple}
                style={{ alignSelf: 'flex-start', margin: Spacing.md }}
              />
            )}
          </ScrollView>

          {/* Chat Suggestion Chips */}
          <View style={styles.chipRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: Spacing.md }}
            >
              {['What should I do today?', 'Prepare for interview', 'What are my skill gaps?'].map(
                (chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={styles.chip}
                    onPress={() => handleSendChat(chip)}
                  >
                    <Text style={styles.chipText}>{chip}</Text>
                  </TouchableOpacity>
                ),
              )}
            </ScrollView>
          </View>

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Ask anything..."
              placeholderTextColor={Colors.text.muted}
              value={chatInput}
              onChangeText={setChatInput}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={() => handleSendChat(chatInput)}>
              <Text style={{ color: Colors.white, fontWeight: 'bold' }}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: Colors.text.secondary, marginTop: 10, fontSize: Typography.fontSize.sm },
  container: { flex: 1, backgroundColor: Colors.background.primary },
  content: { paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Spacing.xl,
    paddingBottom: Spacing.md,
  },
  greeting: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  subgreeting: { color: Colors.text.secondary, fontSize: Typography.fontSize.xs, marginTop: 2 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  goalCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  goalTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  goalDescription: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    marginTop: 4,
    lineHeight: 18,
  },
  progressStrip: { marginTop: Spacing.md },
  completionBar: {
    height: 4,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  completionFill: { height: '100%', backgroundColor: Colors.brand.purple, borderRadius: 2 },
  completionText: { color: Colors.text.muted, fontSize: 10 },
  section: { marginBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionSubtitle: {
    color: Colors.text.muted,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridCard: {
    width: '48%',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: Spacing.sm,
    justifyContent: 'space-between',
    minHeight: 80,
  },
  gridCardActive: { borderColor: Colors.brand.purple },
  gridLabel: { color: Colors.text.muted, fontSize: 10, fontWeight: Typography.fontWeight.bold },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 8,
  },
  badgeText: { fontSize: 10, fontWeight: Typography.fontWeight.semibold },
  explainBox: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  explainTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  explainText: { color: Colors.text.secondary, fontSize: Typography.fontSize.xs, lineHeight: 16 },
  emptyState: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  emptyText: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, textAlign: 'center' },
  actionCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: Spacing.sm,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priorityBadge: { fontSize: 10, fontWeight: Typography.fontWeight.bold },
  expiresText: { color: Colors.error, fontSize: 10 },
  actionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  actionDesc: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    marginTop: 4,
    lineHeight: 16,
  },
  actionButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  actBtn: {
    flex: 1,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnComplete: { backgroundColor: `${Colors.success}22` },
  btnSnooze: { backgroundColor: `${Colors.info}22` },
  btnDismiss: { backgroundColor: `${Colors.error}22` },
  btnText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  hList: { gap: Spacing.md },
  oppCardWrapper: {
    width: 220,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  oppScoreBadge: { color: Colors.success, fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
  oppRole: { color: Colors.text.primary, fontSize: Typography.fontSize.sm, fontWeight: 'bold' },
  oppCompany: { color: Colors.text.secondary, fontSize: Typography.fontSize.xs, marginTop: 2 },
  oppReason: { color: Colors.text.muted, fontSize: 10, marginTop: 8, lineHeight: 14 },
  oppApplyBtn: {
    marginTop: Spacing.md,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.brand.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oppApplyText: { color: Colors.white, fontSize: Typography.fontSize.xs, fontWeight: 'bold' },
  timelineTabs: { gap: 8, marginBottom: Spacing.md },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  tabActive: { backgroundColor: Colors.brand.purple, borderColor: Colors.brand.purple },
  tabText: { color: Colors.text.muted, fontSize: 10, fontWeight: 'bold' },
  tabTextActive: { color: Colors.white },
  timelineItem: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  timelineIndicator: {
    width: 4,
    backgroundColor: Colors.brand.purple,
    borderRadius: 2,
    marginVertical: 4,
  },
  timelineBody: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  timelineTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xs,
    fontWeight: 'bold',
  },
  timelineDesc: { color: Colors.text.secondary, fontSize: Typography.fontSize.xs, marginTop: 2 },
  timelineTime: { color: Colors.text.muted, fontSize: 10, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.brand.purple,
    borderRadius: 25,
    width: 90,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: Colors.brand.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: { color: Colors.white, fontWeight: 'bold', fontSize: Typography.fontSize.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.background.secondary,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.md,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: 'bold',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  modePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: Spacing.xs },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  pickerItemActive: { backgroundColor: Colors.brand.purple, borderColor: Colors.brand.purple },
  pickerText: { color: Colors.text.secondary, fontSize: 10, fontWeight: 'bold' },
  pickerTextActive: { color: Colors.white },
  budgetRow: { flexDirection: 'row', gap: 10, marginVertical: Spacing.xs },
  budgetBox: {
    flex: 1,
    height: 38,
    borderRadius: 6,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  budgetBoxActive: { backgroundColor: Colors.brand.purple, borderColor: Colors.brand.purple },
  budgetText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: 'bold',
  },
  budgetTextActive: { color: Colors.white },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  btnSave: { backgroundColor: Colors.brand.purple },
  briefScroll: { maxHeight: 300 },
  briefLoadingBox: { paddingVertical: Spacing.xl, alignItems: 'center' },
  briefText: { color: Colors.text.secondary, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  chatHeader: {
    height: 60,
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
  },
  chatHeaderTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: 'bold',
  },
  chatCloseText: {
    color: Colors.brand.purpleLight,
    fontSize: Typography.fontSize.xs,
    fontWeight: 'bold',
  },
  chatScroll: { padding: Spacing.md, gap: Spacing.sm },
  chatBubble: {
    maxWidth: '75%',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: 2,
  },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: Colors.brand.purple },
  bubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  chatText: { fontSize: Typography.fontSize.xs, lineHeight: 16 },
  textUser: { color: Colors.white },
  textAi: { color: Colors.text.primary },
  chipRow: {
    height: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    paddingTop: Spacing.xs,
    backgroundColor: Colors.background.primary,
  },
  chip: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    justifyContent: 'center',
  },
  chipText: { color: Colors.brand.purpleLight, fontSize: 10, fontWeight: 'bold' },
  chatInputRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xs,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  sendBtn: {
    backgroundColor: Colors.brand.purple,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
