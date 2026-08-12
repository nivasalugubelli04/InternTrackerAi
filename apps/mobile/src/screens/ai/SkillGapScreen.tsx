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

export default function SkillGapScreen({ route }: Props) {
  const jobId = route?.params?.jobId;
  const [gapAnalysis, setGapAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGapAnalysis = async () => {
      try {
        const result = await aiService.analyzeSkillGap(jobId);
        setGapAnalysis(result);
      } catch (err: any) {
        Alert.alert('Error', 'Failed to retrieve skill gap analysis.');
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) fetchGapAnalysis();
  }, [jobId]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Analyzing skill requirements...</Text>
      </View>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return '#E53E3E';
      case 'MEDIUM':
        return '#DD6B20';
      case 'LOW':
        return '#3182CE';
      default:
        return '#718096';
    }
  };

  const renderSkillChips = (title: string, skills: string[], type: 'match' | 'missingRequired' | 'missingPreferred' | 'recommend') => {
    const chipBg =
      type === 'match'
        ? '#E6FFFA'
        : type === 'missingRequired'
        ? '#FFF5F5'
        : type === 'missingPreferred'
        ? '#FFFAF0'
        : '#F7FAFC';

    const chipBorder =
      type === 'match'
        ? '#B2F5EA'
        : type === 'missingRequired'
        ? '#FEB2B2'
        : type === 'missingPreferred'
        ? '#FEEBC8'
        : '#E2E8F0';

    const chipTextColor =
      type === 'match'
        ? '#008080'
        : type === 'missingRequired'
        ? '#C53030'
        : type === 'missingPreferred'
        ? '#C05621'
        : '#4A5568';

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        {skills && skills.length > 0 ? (
          <View style={styles.chipRow}>
            {skills.map((skill, idx) => (
              <View key={idx} style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}>
                <Text style={[styles.chipText, { color: chipTextColor }]}>{skill}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No skills identified</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Skill Gap Analysis</Text>
      <Text style={styles.subtitle}>
        Identify technical and soft skills required for the internship that are not found on your profile.
      </Text>

      {gapAnalysis && (
        <View>
          {/* Gap Level Priority */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gap Severity Level</Text>
            <View style={styles.priorityRow}>
              <View
                style={[
                  styles.priorityIndicator,
                  { backgroundColor: getPriorityColor(gapAnalysis.priority) },
                ]}
              />
              <Text
                style={[
                  styles.priorityValue,
                  { color: getPriorityColor(gapAnalysis.priority) },
                ]}
              >
                {gapAnalysis.priority} Priority
              </Text>
            </View>
            <Text style={styles.priorityDesc}>
              {gapAnalysis.priority === 'HIGH'
                ? 'This role requires core technical skills that are missing in your profile. Prioritize learning these first.'
                : gapAnalysis.priority === 'MEDIUM'
                ? 'You match several required skills, but missing preferred competencies may affect your ranking.'
                : 'Excellent alignment. You match almost all requirements for this role.'}
            </Text>
          </View>

          {renderSkillChips('Matched Skills (On Your Profile)', gapAnalysis.matchedSkills, 'match')}
          {renderSkillChips('Missing Required Skills', gapAnalysis.missingRequiredSkills, 'missingRequired')}
          {renderSkillChips('Missing Preferred Skills', gapAnalysis.missingPreferredSkills, 'missingPreferred')}
          {renderSkillChips('Recommended Gained Skills', gapAnalysis.recommendedSkills, 'recommend')}

          {/* Learning Suggestions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gap Mitigation Steps</Text>
            {gapAnalysis.learningSuggestions?.map((item: string, idx: number) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            )) || <Text style={styles.emptyText}>No suggestions available</Text>}
          </View>
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
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  priorityValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  priorityDesc: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
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
