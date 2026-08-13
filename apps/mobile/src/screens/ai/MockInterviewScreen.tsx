import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { interviewsService } from '../../services/interviews.service';

export default function MockInterviewScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { jobId } = route.params as { jobId: string };

  const [interview, setInterview] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    start();
  }, []);

  const start = async () => {
    try {
      const data = await interviewsService.startInterview(jobId);
      setInterview(data.interview);
      setCurrentQuestion(data.firstQuestion);
      setHistory([{ type: 'ai', text: data.firstQuestion.question }]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!inputText.trim() || submitting || !currentQuestion) return;
    
    const text = inputText;
    setInputText('');
    setSubmitting(true);
    setHistory(prev => [...prev, { type: 'user', text }]);

    try {
      const result = await interviewsService.submitAnswer(interview.id, currentQuestion.id, text);
      
      setHistory(prev => [
        ...prev,
        { type: 'ai', text: `Feedback: ${result.feedback} (Score: ${result.score}/10)` }
      ]);

      if (result.completed) {
        setHistory(prev => [
          ...prev,
          { type: 'ai', text: `Interview Complete! Final Score: ${result.score}%` }
        ]);
        setCurrentQuestion(null);
      } else {
        setCurrentQuestion(result.nextQuestion);
        setHistory(prev => [...prev, { type: 'ai', text: result.nextQuestion.question }]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isUser = item.type === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && <Ionicons name="person-circle-outline" size={20} color="#fff" style={styles.aiIcon} />}
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
          {item.text}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={{ marginTop: 10, color: '#fff' }}>Preparing your interview...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mock Interview</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={history}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {currentQuestion && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your answer..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={submitAnswer} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  listContent: { padding: 16 },
  messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 16, marginBottom: 16 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#007BFF' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#2C2C2E', flexDirection: 'row', alignItems: 'flex-start' },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#E5E5EA', flexShrink: 1 },
  aiIcon: { marginRight: 8, marginTop: 2 },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#1E1E1E', borderTopWidth: 1, borderTopColor: '#333', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#2C2C2E', color: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 20, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#007BFF', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});
