import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import {
  copilotService,
  CopilotHomeSummary,
  CopilotStructuredResponse,
} from '../../services/copilot.service';

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  structured?: CopilotStructuredResponse;
  proposal?: any;
  groundingSources?: any[];
  timestamp: string;
}

export default function CareerCopilotScreen({ route, navigation }: any) {
  const jobId = route?.params?.jobId;
  const initialPrompt = route?.params?.initialPrompt;

  const [homeSummary, setHomeSummary] = useState<CopilotHomeSummary | null>(null);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadHomeSummary();
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [jobId]);

  const loadHomeSummary = async () => {
    try {
      const summary = await copilotService.getHomeSummary();
      setHomeSummary(summary);
    } catch (err) {
      console.error('Failed to load copilot home summary', err);
    }
  };

  const loadMemories = async () => {
    try {
      const list = await copilotService.getMemories();
      setMemories(list);
      setShowMemoryModal(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to load approved long-term memories');
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await copilotService.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      Alert.alert('Deleted', 'Approved memory deleted from Copilot.');
    } catch {
      Alert.alert('Error', 'Could not delete memory item.');
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const result = await copilotService.sendMessage({
        message: textToSend,
        conversationId,
        jobId,
      });

      if (!conversationId && result.conversationId) {
        setConversationId(result.conversationId);
      }

      const assistantMsg: ChatItem = {
        id: result.messageId || `asst-${Date.now()}`,
        role: 'assistant',
        content: result.response.summary,
        structured: result.response,
        proposal: result.proposal,
        groundingSources: result.groundingSources,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to get Copilot guidance.');
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const handleConfirmProposal = async (proposalId: string, itemIdx: number) => {
    try {
      await copilotService.confirmProposal(proposalId);
      Alert.alert('Confirmed', 'Action proposal added to your active Career Execution Plan!');
      // Update proposal state in messages
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === itemIdx && msg.proposal
            ? { ...msg, proposal: { ...msg.proposal, status: 'CONFIRMED' } }
            : msg,
        ),
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to confirm proposal.');
    }
  };

  const quickShortcuts = [
    'What should I focus on today?',
    'What should I do this week?',
    'What is my biggest weakness?',
    'Find internships matching my profile',
    'What happens if I focus on MLOps?',
    'Show my career progress',
  ];

  const renderChatItem = ({ item, index }: { item: ChatItem; index: number }) => {
    const isUser = item.role === 'user';

    if (isUser) {
      return (
        <View style={styles.userBubbleContainer}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    const structured = item.structured;
    const isConfirmed = item.proposal?.status === 'CONFIRMED';

    return (
      <View style={styles.assistantCard}>
        {/* Header with badge & confidence */}
        <View style={styles.assistantHeader}>
          <View style={styles.copilotBadge}>
            <Text style={styles.copilotBadgeText}>AI CAREER COPILOT</Text>
          </View>
          {structured?.confidence && (
            <View
              style={[
                styles.confidenceTag,
                structured.confidence === 'HIGH'
                  ? styles.confidenceHigh
                  : structured.confidence === 'MEDIUM'
                    ? styles.confidenceMedium
                    : styles.confidenceLimited,
              ]}
            >
              <Text style={styles.confidenceText}>{structured.confidence} CONFIDENCE</Text>
            </View>
          )}
        </View>

        {/* Summary */}
        <Text style={styles.summaryText}>{structured?.summary || item.content}</Text>

        {/* Key Insights */}
        {structured?.keyInsights && structured.keyInsights.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Key Insights</Text>
            {structured.keyInsights.map((insight, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Evidence & Grounding */}
        {structured?.evidence && structured.evidence.length > 0 && (
          <View style={styles.evidenceContainer}>
            <Text style={styles.evidenceTitle}>Grounded Sources & Evidence:</Text>
            {structured.evidence.map((ev, i) => (
              <Text key={i} style={styles.evidenceItem}>
                ✓ {ev}
              </Text>
            ))}
          </View>
        )}

        {/* Action Proposal Card */}
        {item.proposal && (
          <View style={[styles.proposalBox, isConfirmed && styles.proposalBoxConfirmed]}>
            <View style={styles.proposalHeader}>
              <Text style={styles.proposalBadge}>
                {isConfirmed ? 'ACTION APPLIED' : 'PROPOSED ACTION'}
              </Text>
            </View>
            <Text style={styles.proposalTitle}>{item.proposal.title}</Text>
            <Text style={styles.proposalDesc}>{item.proposal.description}</Text>

            {!isConfirmed && (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => handleConfirmProposal(item.proposal.id, index)}
              >
                <Text style={styles.confirmButtonText}>+ Add to Execution Plan</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Suggested Follow-ups */}
        {structured?.suggestedFollowUps && structured.suggestedFollowUps.length > 0 && (
          <View style={styles.followUpContainer}>
            <Text style={styles.followUpTitle}>Suggested follow-ups:</Text>
            <View style={styles.chipsRow}>
              {structured.suggestedFollowUps.map((chip, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.chipButton}
                  onPress={() => handleSendMessage(chip)}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AI Career Copilot</Text>
            <Text style={styles.headerSub}>Personalized Strategic Intelligence</Text>
          </View>
          <TouchableOpacity style={styles.memoryButton} onPress={loadMemories}>
            <Text style={styles.memoryButtonText}>Memory</Text>
          </TouchableOpacity>
        </View>

        {/* Conversation List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            homeSummary ? (
              <View style={styles.homeOverviewCard}>
                <View style={styles.roleRow}>
                  <Text style={styles.roleLabel}>Target Role:</Text>
                  <Text style={styles.roleValue}>{homeSummary.currentRole}</Text>
                </View>
                <Text style={styles.greetingText}>{homeSummary.greeting}</Text>

                {homeSummary.topPriority && (
                  <View style={styles.topPriorityBox}>
                    <Text style={styles.priorityLabel}>Top Today's Priority</Text>
                    <Text style={styles.priorityTitle}>{homeSummary.topPriority.title}</Text>
                    <Text style={styles.priorityMeta}>
                      Estimated: {homeSummary.topPriority.estimatedMinutes} mins •{' '}
                      {homeSummary.topPriority.urgency} Urgency
                    </Text>
                  </View>
                )}

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{homeSummary.activeOpportunitiesCount}</Text>
                    <Text style={styles.statLabel}>Active Matches</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{homeSummary.openSkillGapsCount}</Text>
                    <Text style={styles.statLabel}>Open Gaps</Text>
                  </View>
                </View>
              </View>
            ) : null
          }
        />

        {/* Quick Shortcuts Bar */}
        <View style={styles.shortcutsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {quickShortcuts.map((sc, i) => (
              <TouchableOpacity
                key={i}
                style={styles.shortcutChip}
                onPress={() => handleSendMessage(sc)}
              >
                <Text style={styles.shortcutChipText}>{sc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask your Career Copilot..."
            placeholderTextColor="#888"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage(inputText)}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            disabled={!inputText.trim() || isLoading}
            onPress={() => handleSendMessage(inputText)}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Memory Management Modal */}
        <Modal visible={showMemoryModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Controlled Long-Term Memory</Text>
                <TouchableOpacity onPress={() => setShowMemoryModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSub}>
                These verified preferences are used to personalize your Copilot insights.
              </Text>

              <ScrollView style={styles.memoryList}>
                {memories.length === 0 ? (
                  <Text style={styles.emptyMemoryText}>No stored memory items.</Text>
                ) : (
                  memories.map((mem) => (
                    <View key={mem.id} style={styles.memoryRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memoryKey}>{mem.key}</Text>
                        <Text style={styles.memoryValue}>{mem.value}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteMemory(mem.id)}
                        style={styles.deleteMemButton}
                      >
                        <Text style={styles.deleteMemText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E7EAF0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  memoryButton: {
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  memoryButtonText: { color: '#246BFE', fontWeight: '600', fontSize: 12 },
  listContent: { padding: 16, paddingBottom: 24 },
  homeOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7EAF0',
    marginBottom: 16,
  },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  roleLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  roleValue: { fontSize: 13, color: '#246BFE', fontWeight: '700', marginLeft: 6 },
  greetingText: { fontSize: 14, color: '#111111', lineHeight: 20, marginBottom: 12 },
  topPriorityBox: {
    backgroundColor: '#F3F7FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#246BFE',
  },
  priorityLabel: { fontSize: 11, color: '#6B7280', textTransform: 'uppercase', fontWeight: '700' },
  priorityTitle: { fontSize: 14, fontWeight: '700', color: '#111111', marginTop: 3 },
  priorityMeta: { fontSize: 11, color: '#4B5563', marginTop: 3 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: { fontSize: 16, fontWeight: '700', color: '#111111' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  userBubbleContainer: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#246BFE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    maxWidth: '82%',
  },
  userText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  assistantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7EAF0',
    marginBottom: 16,
  },
  assistantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  copilotBadge: {
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copilotBadgeText: { fontSize: 10, fontWeight: '700', color: '#246BFE' },
  confidenceTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  confidenceHigh: { backgroundColor: '#E9FBEA' },
  confidenceMedium: { backgroundColor: '#FFF4D8' },
  confidenceLimited: { backgroundColor: '#F3F4F6' },
  confidenceText: { fontSize: 10, fontWeight: '700', color: '#111111' },
  summaryText: { fontSize: 15, fontWeight: '600', color: '#111111', lineHeight: 22 },
  sectionContainer: { marginTop: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  bulletRow: { flexDirection: 'row', marginBottom: 4, paddingLeft: 4 },
  bulletDot: { fontSize: 14, color: '#246BFE', marginRight: 6 },
  bulletText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 18 },
  evidenceContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  evidenceTitle: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  evidenceItem: { fontSize: 12, color: '#4B5563', lineHeight: 16 },
  proposalBox: {
    backgroundColor: '#F3F7FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#246BFE',
    marginTop: 12,
  },
  proposalBoxConfirmed: {
    backgroundColor: '#E9FBEA',
    borderColor: '#79F28A',
  },
  proposalHeader: { marginBottom: 4 },
  proposalBadge: { fontSize: 10, fontWeight: '700', color: '#1456D9' },
  proposalTitle: { fontSize: 14, fontWeight: '700', color: '#111111' },
  proposalDesc: { fontSize: 12, color: '#4B5563', marginTop: 2, marginBottom: 8 },
  confirmButton: {
    backgroundColor: '#246BFE',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  followUpContainer: { marginTop: 12 },
  followUpTitle: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipButton: {
    backgroundColor: '#F3F7FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E7EAF0',
  },
  chipText: { fontSize: 12, color: '#246BFE', fontWeight: '500' },
  shortcutsBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: '#E7EAF0',
  },
  shortcutChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E7EAF0',
  },
  shortcutChipText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderColor: '#E7EAF0',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111111',
    borderWidth: 1,
    borderColor: '#E7EAF0',
  },
  sendButton: {
    backgroundColor: '#246BFE',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  sendButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111111' },
  modalClose: { fontSize: 18, color: '#6B7280', padding: 4 },
  modalSub: { fontSize: 12, color: '#6B7280', marginBottom: 14 },
  memoryList: { marginBottom: 20 },
  emptyMemoryText: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginVertical: 20 },
  memoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  memoryKey: { fontSize: 13, fontWeight: '700', color: '#111111' },
  memoryValue: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  deleteMemButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  deleteMemText: { color: '#EF4444', fontWeight: '700', fontSize: 11 },
});
