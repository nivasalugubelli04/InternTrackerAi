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
  navigation?: any;
}

export default function JobAiSummaryScreen({ route }: Props) {
  const jobId = route?.params?.jobId;
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const result = await aiService.summarizeJob(jobId);
        setSummary(result);
      } catch (err: any) {
        Alert.alert('Error', 'Failed to retrieve job summary.');
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) fetchSummary();
  }, [jobId]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Analyzing job posting...</Text>
      </View>
    );
  }

  const renderSection = (title: string, items: string[]) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {items && items.length > 0 ? (
        items.map((item, idx) => (
          <View key={idx} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Not specified in posting details</Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>AI Job Summary</Text>
      <Text style={styles.subtitle}>
        Natural Language summary parsed directly from the raw posting description.
      </Text>

      {summary && (
        <View>
          {/* Quick Overview */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Role Overview</Text>
            <Text style={styles.bodyText}>{summary.roleSummary}</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Location</Text>
                <Text style={styles.gridValue}>{summary.location || 'Not Specified'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Work Mode</Text>
                <Text style={styles.gridValue}>{summary.workMode || 'Not Specified'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Duration</Text>
                <Text style={styles.gridValue}>{summary.duration || 'Not Specified'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Stipend</Text>
                <Text style={styles.gridValue}>{summary.stipend || 'Not Specified'}</Text>
              </View>
            </View>
          </View>

          {renderSection('Responsibilities', summary.responsibilities)}
          {renderSection('Required Skills', summary.requiredSkills)}
          {renderSection('Preferred Skills', summary.preferredSkills)}
          {renderSection('Eligibility Requirements', summary.eligibility)}
          {renderSection('Key Takeaways', summary.keyTakeaways)}
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
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    marginBottom: 14,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    paddingTop: 14,
  },
  gridItem: {
    width: '50%',
    marginVertical: 6,
  },
  gridLabel: {
    fontSize: 11,
    color: '#A0AEC0',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  gridValue: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '500',
    marginTop: 2,
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
