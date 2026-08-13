import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { resumeBuilderService } from '../../services/resume-builder.service';

export default function ResumeBuilderScreen() {
  const navigation = useNavigation();
  
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john.doe@example.com');
  const [phone, setPhone] = useState('(123) 456-7890');
  
  const [experiences, setExperiences] = useState([
    { title: 'Software Engineering Intern', company: 'Tech Corp', bullets: ['Developed REST APIs using NestJS.', 'Improved performance by 20%.'] }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  
  const handleGeneratePdf = async () => {
    setLoading(true);
    try {
      const resumeData = {
        name,
        email,
        phone,
        experiences,
      };
      const response = await resumeBuilderService.generateResume(null, resumeData);
      Alert.alert(
        'Success',
        'Resume generated successfully!',
        [
          { text: 'Download PDF', onPress: () => Linking.openURL(resumeBuilderService.getDownloadUrl(response.id)) },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to generate resume.');
    } finally {
      setLoading(false);
    }
  };

  const handleAiTailor = async (index: number) => {
    setGeneratingAi(true);
    try {
      // In a real flow, you'd select a Job ID to tailor it against. Hardcoding a simulated job for MVP.
      const simulatedJobId = '00000000-0000-0000-0000-000000000000';
      const result = await resumeBuilderService.tailorBulletPoints(simulatedJobId, 'exp-id');
      
      const newExps = [...experiences];
      newExps[index].bullets = result.bulletPoints.split('\n').filter((b: string) => b.trim());
      setExperiences(newExps);
    } catch (e) {
      console.log('Ensure you have a real job ID in DB to tailor against.');
    } finally {
      setGeneratingAi(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resume Builder</Text>
        <TouchableOpacity onPress={handleGeneratePdf} disabled={loading}>
          {loading ? <ActivityIndicator color="#007BFF" /> : <Text style={styles.exportText}>Export PDF</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Personal Info</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full Name" placeholderTextColor="#666" />
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#666" keyboardType="email-address" />
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone Number" placeholderTextColor="#666" keyboardType="phone-pad" />

        <Text style={styles.sectionTitle}>Experience</Text>
        {experiences.map((exp, index) => (
          <View key={index} style={styles.expCard}>
            <TextInput 
              style={styles.input} 
              value={exp.title} 
              onChangeText={(t) => { const newExps=[...experiences]; newExps[index].title=t; setExperiences(newExps); }}
              placeholder="Job Title" placeholderTextColor="#666" 
            />
            <TextInput 
              style={styles.input} 
              value={exp.company} 
              onChangeText={(t) => { const newExps=[...experiences]; newExps[index].company=t; setExperiences(newExps); }}
              placeholder="Company" placeholderTextColor="#666" 
            />
            
            <View style={styles.bulletsContainer}>
              <Text style={styles.bulletsLabel}>Bullet Points</Text>
              {exp.bullets.map((b, bIdx) => (
                <Text key={bIdx} style={styles.bulletText}>• {b}</Text>
              ))}
            </View>

            <TouchableOpacity style={styles.aiButton} onPress={() => handleAiTailor(index)} disabled={generatingAi}>
              <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.aiButtonText}>AI Tailor for Job</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  exportText: { color: '#007BFF', fontSize: 16, fontWeight: '600' },
  content: { padding: 16 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16, marginTop: 8 },
  input: { backgroundColor: '#1E1E1E', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, fontSize: 16 },
  expCard: { backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 16 },
  bulletsContainer: { marginTop: 8, marginBottom: 16 },
  bulletsLabel: { color: '#999', marginBottom: 8, fontSize: 14 },
  bulletText: { color: '#E5E5EA', fontSize: 14, marginBottom: 4, lineHeight: 20 },
  aiButton: { flexDirection: 'row', backgroundColor: '#34C759', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  aiButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
