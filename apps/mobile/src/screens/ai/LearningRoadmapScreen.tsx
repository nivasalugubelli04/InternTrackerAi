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

export default function LearningRoadmapScreen() {
  const [targetRole, setTargetRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [roadmap, setRoadmap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!targetRole.trim()) {
      Alert.alert('Error', 'Please enter a target role.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await aiService.generateRoadmap(targetRole, targetCompany);
      setRoadmap(result);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Roadmap generation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Personalized Learning Roadmap</Text>
      <Text style={styles.subtitle}>
        Generate a weekly structured timeline plan to build the skills required for your dream internship role.
      </Text>

      {/* Input section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Roadmap Configuration</Text>
        <TextInput
          style={styles.input}
          value={targetRole}
          onChangeText={setTargetRole}
          placeholder="Target Role (e.g. Frontend Engineer, Data Scientist)"
          placeholderTextColor="#888"
        />
        <TextInput
          style={styles.input}
          value={targetCompany}
          onChangeText={setTargetCompany}
          placeholder="Target Company (optional, e.g. Google, Stripe)"
          placeholderTextColor="#888"
        />
        <TouchableOpacity
          onPress={handleGenerate}
          style={[styles.button, isLoading && styles.buttonDisabled]}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>Generate Roadmap</Text>
          )}
        </TouchableOpacity>
      </View>

      {roadmap && (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Your Customized Learning Plan</Text>

          {/* Overview */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Roadmap Goals</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Est. Total Weeks</Text>
                <Text style={styles.gridValue}>{roadmap.estimatedWeeks || '12 weeks'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Target Skillset</Text>
                <Text style={styles.gridValue}>{roadmap.targetSkills?.join(', ') || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Timeline Milestones */}
          <Text style={styles.subHeader}>Weekly Milestones</Text>
          {roadmap.milestones?.map((milestone: any, idx: number) => (
            <View key={idx} style={styles.timelineRow}>
              {/* Timeline Indicator Line */}
              <View style={styles.timelineIndicator}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineLine} />
              </View>

              {/* Milestone Details Card */}
              <View style={[styles.card, styles.timelineCard]}>
                <View style={styles.milestoneHeader}>
                  <Text style={styles.milestoneWeek}>{milestone.weekRange || `Week ${idx + 1}`}</Text>
                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                </View>
                <Text style={styles.milestoneDesc}>{milestone.description}</Text>
                
                <Text style={styles.itemLabel}>Key Concepts to Master:</Text>
                {milestone.topics?.map((topic: string, tIdx: number) => (
                  <Text key={tIdx} style={styles.bulletItem}>• {topic}</Text>
                ))}

                {milestone.projects && milestone.projects.length > 0 && (
                  <>
                    <Text style={styles.itemLabel}>Recommended Practice Project:</Text>
                    <Text style={styles.projectText}>{milestone.projects[0]}</Text>
                  </>
                )}
              </View>
            </View>
          )) || <Text style={styles.emptyText}>No milestones returned.</Text>}

          {/* General Resources & Certifications */}
          {roadmap.recommendedResources && roadmap.recommendedResources.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Curated Resources</Text>
              {roadmap.recommendedResources.map((res: string, idx: number) => (
                <Text key={idx} style={styles.bulletItem}>• {res}</Text>
              ))}
            </View>
          )}

          {roadmap.certifications && roadmap.certifications.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Suggested Certifications</Text>
              {roadmap.certifications.map((cert: string, idx: number) => (
                <Text key={idx} style={styles.bulletItem}>• {cert}</Text>
              ))}
            </View>
          )}
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
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1A202C',
    marginBottom: 12,
  },
  button: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#6200EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  detailsGrid: {
    flexDirection: 'row',
  },
  gridItem: {
    flex: 1,
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
  subHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
    marginVertical: 12,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineIndicator: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6200EE',
    marginTop: 20,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
  },
  timelineCard: {
    flex: 1,
    marginLeft: 8,
  },
  milestoneHeader: {
    marginBottom: 8,
  },
  milestoneWeek: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6200EE',
    textTransform: 'uppercase',
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 2,
  },
  milestoneDesc: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    marginBottom: 12,
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#718096',
    marginTop: 8,
    marginBottom: 4,
  },
  bulletItem: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 18,
    marginVertical: 2,
  },
  projectText: {
    fontSize: 13,
    color: '#2D3748',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 13,
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
});
