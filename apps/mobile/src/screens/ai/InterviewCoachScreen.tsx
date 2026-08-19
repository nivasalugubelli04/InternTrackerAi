import React, { useState } from 'react';
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
  sender: 'user' | 'coach';
  text: string;
}

export default function InterviewCoachScreen(): React.ReactElement {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { jobId, jobTitle } = (route.params as { jobId: string; jobTitle?: string }) || {};

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'coach',
      text: `Hello! I am your AI Interview Coach. Ask me how to frame your STAR stories, explain technical topics, or prepare for ${jobTitle || 'your upcoming interview'}!`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: inputText };
    setMessages((prev) => [...prev, userMsg]);
    const msg = inputText;
    setInputText('');
    setSending(true);

    try {
      const res = await interviewsService.chatWithCoach(jobId || 'general', msg);
      const coachMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'coach',
        text: res.reply,
      };
      setMessages((prev) => [...prev, coachMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'coach',
          text: 'I am temporarily unable to respond. Focus on STAR stories and technical fundamentals.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.coachBubble]}>
        {!isUser && (
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={14} color={Colors.brand.purpleLight} />
            <Text style={styles.aiBadgeText}>AI COACH</Text>
          </View>
        )}
        <Text style={[styles.messageText, isUser ? styles.userText : styles.coachText]}>
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>AI Interview Coach</Text>
          <Text style={styles.headerSub}>{jobTitle || 'Preparation Assistant'}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask AI Coach a question..."
            placeholderTextColor={Colors.text.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, { opacity: inputText.trim() ? 1 : 0.5 }]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Ionicons name="send" size={18} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
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
  headerSub: { fontSize: Typography.fontSize.xs, color: Colors.brand.purpleLight },
  listContent: { padding: Spacing.md },
  bubble: {
    maxWidth: '85%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.brand.purple },
  coachBubble: {
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
  messageText: { fontSize: Typography.fontSize.sm, lineHeight: 22 },
  userText: { color: Colors.white },
  coachText: { color: Colors.text.primary },
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
    maxHeight: 80,
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
