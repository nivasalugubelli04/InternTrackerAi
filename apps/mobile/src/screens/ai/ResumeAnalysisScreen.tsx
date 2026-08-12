import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { aiService } from '../../services/ai.service';

export default function ResumeAnalysisScreen() {
  const [resumeText, setResumeText] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!resumeText.trim()) {
      Alert.alert('Error', 'Please paste your resume text first.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await aiService.analyzeResume(resumeText);
      setAnalysis(result);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Resume analysis failed. Check your rate limits.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSection = (title: string, items: string[], emptyMsg = 'None identified') => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {items && items.length > 0 ? (
        items.map((item, idx) => (
          <View key={idx} style={styles.bulletRow}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>{emptyMsg}</Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>AI Resume Analysis</Text>
      <Text style={styles.subtitle}>
        Paste your raw resume text below to analyze it for ATS compatibility, technical skills, and career gaps.
      </Text>

      <TextInput
        style={styles.textInput}
        multiline
        numberOfLines={10}
        value={resumeText}
        onChangeText={setResumeText}
        placeholder="Paste your resume text here (experience, education, skills, projects)..."
        placeholderTextColor="#888"
      />

      <TouchableOpacity
        onPress={handleAnalyze}
        style={[styles.button, isLoading && styles.buttonDisabled]}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Run AI Analysis</Text>
        )}
      </TouchableOpacity>

      {analysis && (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Analysis Results</Text>

          {/* Overview */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Professional Summary</Text>
            <Text style={styles.summaryText}>{analysis.summary}</Text>
          </View>

          {/* Skills parsed */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Parsed Technical Skills</Text>
            <View style={styles.chipRow}>
              {analysis.technicalSkills?.map((skill: string, idx: number) => (
                <View key={idx} style={styles.chip}>
                  <Text style={styles.chipText}>{skill}</Text>
                </View>
              )) || <Text style={styles.emptyText}>No skills parsed</Text>}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Parsed Soft Skills</Text>
            <View style={styles.chipRow}>
              {analysis.softSkills?.map((skill: string, idx: number) => (
                <View key={idx} style={[styles.chip, styles.softSkillChip]}>
                  <Text style={[styles.chipText, styles.softSkillText]}>{skill}</Text>
                </View>
              )) || <Text style={styles.emptyText}>No skills parsed</Text>}
            </View>
          </View>

          {renderSection('Key Strengths', analysis.strengths)}
          {renderSection('Areas for Improvement', analysis.weaknesses)}
          {renderSection('Missing Information / Gaps', analysis.missingInformation)}
          {renderSection('ATS Optimization suggestions', analysis.atsSuggestions)}
          {renderSection('Career Suggestions', analysis.careerSuggestions)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    height: 160,
    textAlignVertical: 'top',
    marginBottom: 16,
    color: '#1A202C',
  },
  button: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#6200EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#EEF2F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '500',
  },
  softSkillChip: {
    backgroundColor: '#FFF0F5',
  },
  softSkillText: {
    color: '#FF1493',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#718096',
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 13,
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
});
