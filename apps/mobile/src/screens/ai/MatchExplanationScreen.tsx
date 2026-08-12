import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { aiService } from '../../services/ai.service';

interface Props {
  route?: any;
}

export default function MatchExplanationScreen({ route }: Props) {
  const jobId = route?.params?.jobId;
  const [explanation, setExplanation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExplanation = async () => {
      try {
        const result = await aiService.explainMatch(jobId);
        setExplanation(result);
      } catch (err: any) {
        Alert.alert('Error', 'Failed to retrieve match explanation.');
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) fetchExplanation();
  }, [jobId]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Analyzing match breakdown...</Text>
      </View>
    );
  }

  const renderSection = (title: string, items: string[], type: 'strength' | 'warning' | 'info') => {
    const borderStyle =
      type === 'strength'
        ? styles.borderStrength
        : type === 'warning'
        ? styles.borderWarning
        : styles.borderInfo;

    return (
      <View style={[styles.card, borderStyle]}>
        <Text style={styles.cardTitle}>{title}</Text>
        {items && items.length > 0 ? (
          items.map((item, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>None identified</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>AI Match Explanation</Text>
      <Text style={styles.subtitle}>
        Understand how your profile fits the requirements and locate gaps.
      </Text>

      {explanation && (
        <View>
          {/* Summary Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Match Summary</Text>
            <Text style={styles.bodyText}>{explanation.matchSummary}</Text>
          </View>

          {renderSection('Strengths & Highlights', explanation.strengths, 'strength')}
          {renderSection('Skill Alignments', explanation.skillMatches, 'strength')}
          {renderSection('Career Preferences Alignments', explanation.preferenceMatches, 'info')}
          {renderSection('Potential Gaps & Missing Skills', explanation.potentialGaps, 'warning')}
          {renderSection('Tailored Application Advice', explanation.applicationAdvice, 'info')}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    marginBottom: 20,
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
    borderLeftWidth: 4,
    borderLeftColor: '#CBD5E0',
  },
  borderStrength: {
    borderLeftColor: '#38A169',
  },
  borderWarning: {
    borderLeftColor: '#DD6B20',
  },
  borderInfo: {
    borderLeftColor: '#3182CE',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  bullet: {
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
