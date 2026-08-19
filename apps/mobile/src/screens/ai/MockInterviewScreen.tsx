import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { interviewsService } from '../../services/interviews.service';

interface Message {
  id: string;
  type: 'ai' | 'user' | 'feedback' | 'hint';
  text: string;
  score?: number;
  starAnalysis?: any;
}

export default function MockInterviewScreen(): React.ReactElement {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { jobId, mode = 'FULL_MOCK' } = (route.params as { jobId?: string; mode?: string }) || {};

  const [session, setSession] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintCount, setHintCount] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    startSession();
  }, [jobId]);

  const startSession = async () => {
    try {
      const data = await interviewsService.startInterview(jobId || 'default', 'MIXED', mode);
      setSession(data.interview);
      setCurrentQuestion(data.firstQuestion);
      if (data.firstQuestion) {
        setHistory([{ id: '1', type: 'ai', text: data.firstQuestion.question }]);
      }
    } catch (e) {
      console.error('Failed to start interview session:', e);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!inputText.trim() || submitting || !currentQuestion || !session) return;

    const answerText = inputText;
    setInputText('');
    setSubmitting(true);

    const userMsg: Message = { id: Date.now().toString(), type: 'user', text: answerText };
    setHistory((prev) => [...prev, userMsg]);

    try {
      const result = await interviewsService.submitAnswer(
        session.id,
        currentQuestion.id,
        answerText,
      );

      // Feedback message
      const fbMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'feedback',
        text: result.feedback || 'Answer evaluated.',
        score: result.overallScore ? Math.round(result.overallScore * 10) : result.score,
        starAnalysis: result.starAnalysis,
      };
      setHistory((prev) => [...prev, fbMsg]);

      if (result.completed) {
        setCurrentQuestion(null);
        setTimeout(() => {
          navigation.replace('InterviewReport', { sessionId: session.id });
        }, 1200);
      } else if (result.nextQuestion) {
        setCurrentQuestion(result.nextQuestion);
        setHintCount(0);
        const nextQMsg: Message = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          text: result.nextQuestion.question,
        };
        setHistory((prev) => [...prev, nextQMsg]);
      }
    } catch (e) {
      console.error('Failed to submit answer:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const requestHint = async () => {
    if (!currentQuestion || !session || hintLoading) return;
    setHintLoading(true);

    try {
      const level = Math.min(3, hintCount + 1);
      const res = await interviewsService.getHint(session.id, currentQuestion.id, level);
      setHintCount(level);
      const hintMsg: Message = {
        id: Date.now().toString(),
        type: 'hint',
        text: `💡 Hint (Level ${level}): ${res.hint}`,
      };
      setHistory((prev) => [...prev, hintMsg]);
    } catch (e) {
      console.error('Failed to get hint:', e);
    } finally {
      setHintLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    if (item.type === 'user') {
      return (
        <View style={[styles.bubble, styles.userBubble]}>
          <Text style={styles.userText}>{item.text}</Text>
        </View>
      );
    }

    if (item.type === 'feedback') {
      return (
        <View style={styles.feedbackCard}>
          <View style={styles.feedbackHeader}>
            <Text style={styles.feedbackTitle}>AI Evaluation</Text>
            {item.score !== undefined && (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>{item.score}%</Text>
              </View>
            )}
          </View>
          <Text style={styles.feedbackBody}>{item.text}</Text>
          {item.starAnalysis && (
            <View style={styles.starMiniRow}>
              <Text style={styles.starMiniText}>
                STAR: S:{item.starAnalysis.situation ? '✓' : '✗'} T:
                {item.starAnalysis.task ? '✓' : '✗'} A:{item.starAnalysis.action ? '✓' : '✗'} R:
                {item.starAnalysis.result ? '✓' : '✗'}
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (item.type === 'hint') {
      return (
        <View style={styles.hintCard}>
          <Text style={styles.hintText}>{item.text}</Text>
        </View>
      );
    }

    // AI Question Bubble
    return (
      <View style={[styles.bubble, styles.aiBubble]}>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={14} color={Colors.brand.purpleLight} />
          <Text style={styles.aiBadgeText}>AI INTERVIEWER</Text>
        </View>
        <Text style={styles.aiText}>{item.text}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.purple} />
          <Text style={styles.loadingText}>Initializing Mock Interview...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Adaptive Mock Session</Text>
          <Text style={styles.headerSub}>{mode.replace('_', ' ')}</Text>
        </View>
        {currentQuestion ? (
          <TouchableOpacity onPress={requestHint} disabled={hintLoading} style={styles.hintBtn}>
            {hintLoading ? (
              <ActivityIndicator color={Colors.warning} size="small" />
            ) : (
              <Ionicons name="bulb-outline" size={22} color={Colors.warning} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {currentQuestion && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your answer..."
              placeholderTextColor={Colors.text.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, { opacity: inputText.trim() ? 1 : 0.5 }]}
              onPress={submitAnswer}
              disabled={!inputText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Ionicons name="send" size={18} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.text.secondary, marginTop: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  headerSub: { fontSize: 10, color: Colors.brand.purpleLight, textTransform: 'uppercase' },
  hintBtn: { padding: Spacing.xs },
  listContent: { padding: Spacing.md },
  bubble: {
    maxWidth: '85%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.brand.purple },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  aiBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.brand.purpleLight,
    marginLeft: 4,
  },
  userText: { color: Colors.white, fontSize: Typography.fontSize.sm, lineHeight: 22 },
  aiText: { color: Colors.text.primary, fontSize: Typography.fontSize.sm, lineHeight: 22 },
  feedbackCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  feedbackTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.brand.purpleLight,
  },
  scoreBadge: {
    backgroundColor: Colors.glass.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  scoreText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.success,
  },
  feedbackBody: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary, lineHeight: 18 },
  starMiniRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  starMiniText: {
    fontSize: 10,
    color: Colors.text.muted,
    fontWeight: Typography.fontWeight.semibold,
  },
  hintCard: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning + '44',
  },
  hintText: { fontSize: Typography.fontSize.xs, color: Colors.warning },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background.tertiary,
    color: Colors.text.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    fontSize: Typography.fontSize.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
});
