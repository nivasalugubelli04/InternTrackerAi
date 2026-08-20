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

export default function CareerStrategyScreen({ navigation }: Props) {
  const [strategy, setStrategy] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const fetchStrategy = async () => {
      try {
        const data = await careerCenterService.getCareerStrategy();
        setStrategy(data);
      } catch (err) {
        Alert.alert('Error', 'Failed to retrieve career strategy parameters.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStrategy();
  }, []);

  const handleSendChat = async (text: string) => {
    if (!text.trim()) return;
    setChatHistory((prev) => [...prev, { role: 'user', content: text }]);
    setChatMessage('');
    setIsSending(true);

    try {
      const response = await careerCenterService.chatAdvisor(text, conversationId || undefined);
      setConversationId(response.conversationId);
      setChatHistory((prev) => [...prev, { role: 'assistant', content: response.message.content }]);
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
        <Text style={styles.loadingText}>Synthesizing career strategy score...</Text>
      </View>
    );
  }

  const score = strategy?.overallScore ?? 0;
  const targetRole = strategy?.targetRole ?? 'Software Engineer Intern';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>AI Career Strategy</Text>
        <Text style={styles.subtitle}>
          Personalized dashboard detailing target goals, skills matrix, and advisory chat.
        </Text>

        {/* Alignment score card */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerRole}>{targetRole}</Text>
          <Text style={styles.bannerScore}>{score}% Strategic Alignment</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${score}%` }]} />
          </View>
        </View>

        {/* Gaps List */}
        {strategy?.priorityMatrix?.highestPriority?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚡ Priority Skill Gaps</Text>
            <View style={styles.tagContainer}>
              {strategy.priorityMatrix.highestPriority.map((s: string) => (
                <View key={s} style={styles.gapTag}>
                  <Text style={styles.gapTagText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Advisor Chat Panel */}
        <View style={styles.chatCard}>
          <Text style={styles.cardTitle}>🤖 Grounded Career Advisor</Text>

          <View style={styles.chatBox}>
            <View style={styles.messageRow}>
              <Text style={styles.messageSender}>Advisor: </Text>
              <Text style={styles.messageText}>
                Hello! I am your career advisor. Where should we focus today?
              </Text>
            </View>

            {chatHistory.map((chat, idx) => (
              <View key={idx} style={styles.messageRow}>
                <Text
                  style={chat.role === 'user' ? styles.messageSenderUser : styles.messageSender}
                >
                  {chat.role === 'user' ? 'You: ' : 'Advisor: '}
                </Text>
                <Text style={styles.messageText}>{chat.content}</Text>
              </View>
            ))}

            {isSending && (
              <ActivityIndicator size="small" color={Colors.brand.purple} style={styles.spinner} />
            )}
          </View>

          <View style={styles.inputRow}>
            <TextInput
              placeholder="Ask (e.g. Find target skills, explain readiness)..."
              placeholderTextColor={Colors.text.muted}
              value={chatMessage}
              onChangeText={setChatMessage}
              style={styles.input}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={() => handleSendChat(chatMessage)}>
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
  bannerCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  bannerRole: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  bannerScore: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginVertical: Spacing.sm,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.background.tertiary,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.brand.purple,
    borderRadius: 4,
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
    marginBottom: Spacing.sm,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gapTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  gapTagText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#EF4444',
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
    background: 'rgba(0,0,0,0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  messageSender: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.brand.purpleLight,
  },
  messageSenderUser: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.brand.cyan,
  },
  messageText: {
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
});
