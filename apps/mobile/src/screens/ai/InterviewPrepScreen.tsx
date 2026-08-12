import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { aiService } from '../../services/ai.service';

interface Props {
  route?: any;
}

export default function InterviewPrepScreen({ route }: Props) {
  const jobId = route?.params?.jobId;
  const [prepData, setPrepData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'technical' | 'behavioral' | 'hr' | 'roleSpecific'>('technical');
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchInterviewPrep = async () => {
      try {
        const result = await aiService.generateInterviewPrep(jobId);
        setPrepData(result);
      } catch (err: any) {
        Alert.alert('Error', 'Failed to generate interview preparation questions.');
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) fetchInterviewPrep();
  }, [jobId]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Generating interview preparation guide...</Text>
      </View>
    );
  }

  const getQuestionsByTab = () => {
    if (!prepData) return [];
    switch (activeTab) {
      case 'technical':
        return prepData.technical || [];
      case 'behavioral':
        return prepData.behavioral || [];
      case 'hr':
        return prepData.hr || [];
      case 'roleSpecific':
        return prepData.roleSpecific || [];
    }
  };

  const questions = getQuestionsByTab();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Interview Preparation</Text>
      <Text style={styles.subtitle}>
        AI-generated mock interview questions tailored to your profile and the internship posting.
      </Text>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['technical', 'behavioral', 'hr', 'roleSpecific'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => {
              setActiveTab(tab);
              setExpandedQuestionIdx(null);
            }}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'roleSpecific' ? 'Role' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {prepData && prepData.practiceDisclaimer && (
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>{prepData.practiceDisclaimer}</Text>
          </View>
        )}

        {questions && questions.length > 0 ? (
          questions.map((q: any, idx: number) => {
            const isExpanded = expandedQuestionIdx === idx;
            return (
              <View key={idx} style={styles.qCard}>
                <TouchableOpacity
                  onPress={() => setExpandedQuestionIdx(isExpanded ? null : idx)}
                  style={styles.qHeader}
                >
                  <View style={styles.qTitleRow}>
                    <Text style={styles.qNumber}>Q{idx + 1}</Text>
                    <Text style={styles.qText}>{q.question}</Text>
                  </View>
                  <View style={styles.qMetadataRow}>
                    <View style={styles.difficultyBadge}>
                      <Text style={styles.difficultyText}>{q.difficulty || 'Medium'}</Text>
                    </View>
                    <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.qBody}>
                    <Text style={styles.bodyLabel}>Key Topics:</Text>
                    <View style={styles.topicRow}>
                      {q.expectedTopics?.map((topic: string, tIdx: number) => (
                        <View key={tIdx} style={styles.topicBadge}>
                          <Text style={styles.topicText}>{topic}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.bodyLabel}>Preparation Tips:</Text>
                    <Text style={styles.bodyText}>{q.preparationTips}</Text>

                    <Text style={styles.bodyLabel}>Sample Answer Guidance:</Text>
                    <Text style={styles.bodyText}>{q.sampleAnswerGuidance}</Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No questions generated for this category.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#718096',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
  },
  activeTabText: {
    color: '#6200EE',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  disclaimerBox: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#F57F17',
    fontWeight: '500',
    textAlign: 'center',
  },
  qCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  qHeader: {
    padding: 14,
    backgroundColor: '#FFF',
  },
  qTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  qNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6200EE',
    marginRight: 8,
    marginTop: 2,
  },
  qText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    lineHeight: 20,
  },
  qMetadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingLeft: 28,
  },
  difficultyBadge: {
    backgroundColor: '#EDF2F7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 11,
    color: '#4A5568',
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  qBody: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    backgroundColor: '#FAFBFC',
  },
  bodyLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#718096',
    marginTop: 12,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  topicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  topicBadge: {
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BEE3F8',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  topicText: {
    fontSize: 11,
    color: '#2B6CB0',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
});
