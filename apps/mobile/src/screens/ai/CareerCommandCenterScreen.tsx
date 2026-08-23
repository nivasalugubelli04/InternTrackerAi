import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { careerCenterService } from '../../services/career-center.service';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

interface Props {
  navigation?: any;
}

export default function CareerCommandCenterScreen({ navigation: _navigation }: Props) {
  const [state, setState] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const fetchDashboard = async () => {
    try {
      const [ccData, ccGoals] = await Promise.all([
        careerCenterService.getCommandCenter(),
        careerCenterService.getGoals(),
      ]);
      setState(ccData);
      setGoals(ccGoals);
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve Command Center state.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCompleteAction = async (id: string) => {
    try {
      await careerCenterService.completeAction(id);
      fetchDashboard();
    } catch (err) {
      Alert.alert('Error', 'Failed to complete action.');
    }
  };

  const handleDismissAction = async (id: string) => {
    try {
      await careerCenterService.dismissAction(id);
      fetchDashboard();
    } catch (err) {
      Alert.alert('Error', 'Failed to skip action.');
    }
  };

  const handleApproveAction = async (id: string) => {
    try {
      await careerCenterService.approveAction(id);
      Alert.alert('Approved', 'Action approved and executed.');
      fetchDashboard();
    } catch (err) {
      Alert.alert('Error', 'Failed to approve action.');
    }
  };

  const handleSnoozeAction = async (id: string) => {
    try {
      await careerCenterService.snoozeAction(id, 24);
      Alert.alert('Snoozed', 'Action snoozed for 24 hours.');
      fetchDashboard();
    } catch (err) {
      Alert.alert('Error', 'Failed to snooze action.');
    }
  };

  const handleAddProgress = async (id: string, currentValue: number) => {
    try {
      await careerCenterService.adjustGoal(id, currentValue + 1);
      fetchDashboard();
    } catch (err) {
      Alert.alert('Error', 'Failed to update goal progress.');
    }
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage;
    setChatHistory((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage('');
    setIsSending(true);

    try {
      const response = await careerCenterService.chatCommandCenter(userMsg);
      setChatHistory((prev) => [...prev, { role: 'assistant', content: response.content }]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Advisor offline. Please follow priority roadmap actions.',
        },
      ]);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brand.purple} />
        <Text style={styles.loadingText}>Synthesizing Command Center...</Text>
      </View>
    );
  }

  const focus = state?.todayFocus ?? 'Discovery Mode';
  const greeting = state?.greeting ?? 'Hello';
  const actions = state?.priorityActions ?? [];
  const health = state?.careerHealth ?? {
    profile: 60,
    skills: 40,
    portfolio: 50,
    applications: 30,
    interview: 50,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Career Command Center</Text>
        <Text style={styles.subtitle}>
          Your daily focus planner, priority checklist, and AI career companion.
        </Text>

        {/* Today Focus Banner */}
        <View style={styles.focusCard}>
          <Text style={styles.focusLabel}>TODAY'S PRIMARY FOCUS</Text>
          <Text style={styles.focusTitle}>{focus}</Text>
          <Text style={styles.focusDesc}>
            {greeting}! Your checklist below is calibrated to optimize placement readiness.
          </Text>
        </View>

        {/* Actions List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Priority Actions</Text>
          {actions.length > 0 ? (
            actions.map((act: any) => (
              <View key={act.id} style={styles.actionRow}>
                <View style={styles.actionHeader}>
                  <View style={styles.badgeContainer}>
                    <View
                      style={act.priority === 'CRITICAL' ? styles.badgeDanger : styles.badgePrimary}
                    >
                      <Text style={styles.badgeText}>{act.priority}</Text>
                    </View>
                    <Text style={styles.timeEst}>Est: {act.estimatedTime}</Text>
                  </View>
                </View>
                <Text style={styles.actionTitle}>{act.title}</Text>
                <Text style={styles.actionDesc}>{act.description}</Text>
                <Text style={styles.actionReason}>Why: {act.explanation || act.reason}</Text>

                {act.draft && (act.draft.subject || act.draft.body) && (
                  <View style={styles.draftCard}>
                    <Text style={styles.draftLabel}>📧 Pre-drafted Outreach:</Text>
                    <Text style={styles.draftSubject}>Subject: {act.draft.subject}</Text>
                    <Text style={styles.draftBody}>{act.draft.body}</Text>
                  </View>
                )}

                <View style={styles.actionBtns}>
                  {!act.isApproved &&
                  (act.safetyClass === 'TYPE_B' || act.safetyClass === 'TYPE_C') ? (
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveAction(act.id)}
                    >
                      <Text style={styles.approveBtnText}>Approve & Execute</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleCompleteAction(act.id)}
                    >
                      <Text style={styles.completeBtnText}>Complete</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.snoozeBtn}
                    onPress={() => handleSnoozeAction(act.id)}
                  >
                    <Text style={styles.snoozeBtnText}>Snooze</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={() => handleDismissAction(act.id)}
                  >
                    <Text style={styles.skipBtnText}>Skip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>You're all caught up!</Text>
          )}
        </View>

        {/* Goals Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Target Goals</Text>
          {goals.length > 0 ? (
            goals.map((g: any) => (
              <View key={g.id} style={styles.goalRow}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalTitle}>{g.title}</Text>
                  <Text style={styles.goalValue}>
                    {g.currentValue} / {g.targetValue}
                  </Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, (g.currentValue / g.targetValue) * 100)}%` },
                    ]}
                  />
                </View>
                <View style={styles.goalFooter}>
                  <Text style={styles.goalDeadline}>
                    {g.deadline ? new Date(g.deadline).toLocaleDateString() : 'No deadline'}
                  </Text>
                  {g.currentValue < g.targetValue && (
                    <TouchableOpacity onPress={() => handleAddProgress(g.id, g.currentValue)}>
                      <Text style={styles.addProgressText}>+ Progress</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No goals defined.</Text>
          )}
        </View>

        {/* Career Health */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Career Health Alignment</Text>
          {Object.entries(health).map(([key, val]: [string, any]) => (
            <View key={key} style={styles.healthRow}>
              <View style={styles.healthHeader}>
                <Text style={styles.healthLabel}>{key}</Text>
                <Text style={styles.healthValue}>{val}%</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${val}%` }]} />
              </View>
            </View>
          ))}
        </View>

        {/* AI Command Chat */}
        <View style={styles.chatCard}>
          <Text style={styles.cardTitle}>🤖 AI Command Assistant</Text>

          <View style={styles.chatBox}>
            <View style={styles.messageRow}>
              <Text style={styles.msgSender}>Advisor: </Text>
              <Text style={styles.msgText}>Ask me about today's focus or priority items!</Text>
            </View>

            {chatHistory.map((chat, idx) => (
              <View key={idx} style={styles.messageRow}>
                <Text style={chat.role === 'user' ? styles.msgSenderUser : styles.msgSender}>
                  {chat.role === 'user' ? 'You: ' : 'Advisor: '}
                </Text>
                <Text style={styles.msgText}>{chat.content}</Text>
              </View>
            ))}

            {isSending && (
              <ActivityIndicator size="small" color={Colors.brand.purple} style={styles.spinner} />
            )}
          </View>

          <View style={styles.inputRow}>
            <TextInput
              placeholder="Ask anything..."
              placeholderTextColor={Colors.text.muted}
              value={chatMessage}
              onChangeText={setChatMessage}
              style={styles.input}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendChat}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.text.secondary,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  focusCard: {
    backgroundColor: 'rgba(36, 107, 254, 0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(36, 107, 254, 0.3)',
  },
  focusLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: '#246BFE',
  },
  focusTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: 'white',
    marginVertical: 4,
  },
  focusDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  actionRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgePrimary: {
    backgroundColor: 'rgba(36, 107, 254, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: 'white',
  },
  timeEst: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  actionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginTop: 6,
  },
  actionDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  actionReason: {
    fontSize: 10,
    color: '#246BFE',
    marginTop: 4,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.sm,
  },
  completeBtn: {
    backgroundColor: '#246BFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  completeBtnText: {
    fontSize: 10,
    color: 'white',
    fontWeight: Typography.fontWeight.bold,
  },
  skipBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  skipBtnText: {
    fontSize: 10,
    color: '#EF4444',
  },
  approveBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  approveBtnText: {
    fontSize: 10,
    color: 'white',
    fontWeight: Typography.fontWeight.bold,
  },
  snoozeBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  snoozeBtnText: {
    fontSize: 10,
    color: '#F59E0B',
  },
  draftCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  draftLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.brand.purpleLight,
    marginBottom: 4,
  },
  draftSubject: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  draftBody: {
    fontSize: 10,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  goalRow: {
    marginBottom: Spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  goalTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: 'white',
  },
  goalValue: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  progressBg: {
    height: 6,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#246BFE',
    borderRadius: 3,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  goalDeadline: {
    fontSize: 9,
    color: Colors.text.muted,
  },
  addProgressText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: '#246BFE',
  },
  healthRow: {
    marginBottom: Spacing.sm,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  healthLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    textTransform: 'capitalize',
  },
  healthValue: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
    color: 'white',
  },
  chatCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  chatBox: {
    minHeight: 180,
    maxHeight: 300,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  msgSender: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.brand.purpleLight,
  },
  msgSenderUser: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.brand.cyan,
  },
  msgText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
    flex: 1,
  },
  spinner: {
    alignSelf: 'center',
    marginVertical: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    color: 'white',
    fontSize: Typography.fontSize.xs,
    height: 40,
  },
  sendBtn: {
    backgroundColor: Colors.brand.purple,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    height: 40,
  },
  sendText: {
    color: 'white',
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.xs,
  },
  emptyText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.muted,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
});
