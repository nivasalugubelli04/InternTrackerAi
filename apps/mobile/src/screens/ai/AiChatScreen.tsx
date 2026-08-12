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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { aiService, AiMessage } from '../../services/ai.service';

interface AiChatScreenProps {
  route?: any;
  navigation?: any;
}

export default function AiChatScreen({ route }: AiChatScreenProps) {
  const jobId = route?.params?.jobId;
  const jobTitle = route?.params?.jobTitle;

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const suggestedQuestions = [
    'Which internship should I apply for first?',
    'What skills am I missing?',
    'How can I improve my resume?',
    jobTitle ? `Explain the requirements for ${jobTitle}` : 'Explain this internship details',
  ];

  useEffect(() => {
    // Load default greeting
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hi there! I'm your AI Career Copilot. How can I help you navigate your internship search today?${
          jobTitle ? `\n\nActive Context: Asking about the "${jobTitle}" position.` : ''
        }`,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [jobId]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading || isStreaming) return;

    const userMsg: AiMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // Scroll to end
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    let assistantContent = '';
    const tempAssistantId = 'temp-assistant';

    // Optimistic assistant message block
    setMessages((prev) => [
      ...prev,
      {
        id: tempAssistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      setIsStreaming(true);
      const conversationResult = await aiService.streamChat(
        textToSend,
        (chunk) => {
          assistantContent += chunk;
          // Update the last message in real-time
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantId ? { ...msg, content: assistantContent } : msg
            )
          );
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
        },
        conversationId,
        jobId
      );

      if (conversationResult && conversationResult.id) {
        setConversationId(conversationResult.id);
      }
    } catch (err: any) {
      console.error(err);
      // Fallback to synchronous HTTP if streaming readable streams is unsupported in this environment
      try {
        const response = await aiService.chat(textToSend, conversationId, jobId);
        setConversationId(response.conversationId);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempAssistantId ? { ...msg, content: response.message.content } : msg
          )
        );
      } catch (syncErr: any) {
        Alert.alert('Error', syncErr.response?.data?.message || 'Failed to send message. Rate limit may be hit.');
        // Remove optimistic assistant message
        setMessages((prev) => prev.filter((msg) => msg.id !== tempAssistantId));
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Success', 'Copied message content to clipboard');
  };

  const clearChat = () => {
    setConversationId(undefined);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Conversation cleared. Ready for your questions!`,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const renderItem = ({ item }: { item: AiMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
          {!isUser && item.content.length > 0 && (
            <TouchableOpacity onPress={() => copyToClipboard(item.content)} style={styles.copyButton}>
              <Text style={styles.copyButtonText}>📋 Copy</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AI Career Copilot</Text>
            {jobTitle && <Text style={styles.headerSubtitle}>Asking about: {jobTitle}</Text>}
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Message List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={() =>
            isLoading && !isStreaming ? (
              <View style={styles.loaderRow}>
                <ActivityIndicator size="small" color="#6200EE" />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            ) : null
          }
        />

        {/* Suggested Prompt Pills */}
        {messages.length === 1 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Suggested Topics:</Text>
            <FlatList
              horizontal
              data={suggestedQuestions}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleSendMessage(item)} style={styles.suggestionPill}>
                  <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            editable={!isLoading && !isStreaming}
          />
          <TouchableOpacity
            onPress={() => handleSendMessage(inputText)}
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading || isStreaming) && styles.sendButtonDisabled,
            ]}
            disabled={!inputText.trim() || isLoading || isStreaming}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#EDF2F7',
  },
  clearBtnText: {
    color: '#4A5568',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#6200EE',
    borderTopRightRadius: 2,
  },
  assistantBubble: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#FFF',
  },
  assistantText: {
    color: '#1A202C',
  },
  copyButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#F7FAFC',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  copyButtonText: {
    fontSize: 11,
    color: '#4A5568',
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginLeft: 16,
  },
  loadingText: {
    fontSize: 13,
    color: '#718096',
    marginLeft: 8,
  },
  suggestionsContainer: {
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 8,
  },
  suggestionPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F2F0FF',
    borderWidth: 1,
    borderColor: '#E2D9FF',
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: '#6200EE',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 16,
    color: '#1A202C',
    fontSize: 15,
  },
  sendButton: {
    width: 64,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6200EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});
