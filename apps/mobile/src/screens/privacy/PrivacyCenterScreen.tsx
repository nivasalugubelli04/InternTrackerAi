import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';

export const PrivacyCenterScreen: React.FC = () => {
  const [optionalAnalytics, setOptionalAnalytics] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [aiDataProcessing, setAiDataProcessing] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportReady, setExportReady] = useState(false);

  const handleExportData = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportReady(true);
      Alert.alert(
        'Export Ready',
        'Your comprehensive personal career data archive has been prepared (JSON format).',
      );
    }, 1200);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Request Account Deletion',
      'Account deletion enters a 14-day recovery grace period. After 14 days, all personal identifiers, career goals, and application logs are permanently deleted. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Deletion',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Deletion Scheduled',
              'Your account is scheduled for deletion in 14 days. You can cancel this request anytime before then.',
            ),
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Privacy & Data Control</Text>
      <Text style={styles.headerSubtitle}>
        Manage your personal information, consents, and AI transparency controls.
      </Text>

      {/* Data Usage Transparency Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 How We Use Your Data</Text>
        <Text style={styles.cardText}>
          &bull; <Text style={styles.bold}>Career Profile & Skills:</Text> Used exclusively to
          calculate opportunity match scores and generate study recommendations.{'\n'}
          &bull; <Text style={styles.bold}>Applications & Notes:</Text> Encrypted in transit and at
          rest to manage your hiring pipeline.{'\n'}
          &bull; <Text style={styles.bold}>Zero Third-Party Sale:</Text> We never sell or license
          your resume or contact details to external data brokers.
        </Text>
      </View>

      {/* Privacy Preferences Toggles */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛡️ Privacy & Consent Preferences</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <Text style={styles.toggleLabel}>Product Improvement Analytics</Text>
            <Text style={styles.toggleSub}>
              Help us improve feature usability via anonymized telemetry.
            </Text>
          </View>
          <Switch
            value={optionalAnalytics}
            onValueChange={setOptionalAnalytics}
            trackColor={{ false: '#D1D5DB', true: '#246BFE' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <Text style={styles.toggleLabel}>Product Update Digest</Text>
            <Text style={styles.toggleSub}>
              Receive weekly notifications on high-match internship deadlines.
            </Text>
          </View>
          <Switch
            value={productUpdates}
            onValueChange={setProductUpdates}
            trackColor={{ false: '#D1D5DB', true: '#246BFE' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <Text style={styles.toggleLabel}>AI Career Intelligence Optimization</Text>
            <Text style={styles.toggleSub}>
              Allow contextual prompts to tailor Copilot simulation responses.
            </Text>
          </View>
          <Switch
            value={aiDataProcessing}
            onValueChange={setAiDataProcessing}
            trackColor={{ false: '#D1D5DB', true: '#246BFE' }}
          />
        </View>
      </View>

      {/* AI Transparency & Limitations */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🤖 AI Transparency & Limitations</Text>
        <Text style={styles.cardText}>
          InternTracker AI uses Google Gemini multimodal LLMs to assist your career planning. AI
          recommendations are advisory simulations and do not guarantee employment or hiring
          outcomes.
        </Text>
      </View>

      {/* Data Export & Account Deletion */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📦 Personal Data Portability</Text>
        <Text style={styles.cardText}>
          Download a complete, machine-readable JSON archive of your career profile, applications,
          saved jobs, and skill graphs.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleExportData}
          disabled={isExporting}
        >
          <Text style={styles.buttonText}>
            {isExporting
              ? 'Generating Archive...'
              : exportReady
                ? '✓ Download JSON Archive'
                : 'Request Data Export'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { borderColor: '#FCA5A5' }]}>
        <Text style={[styles.cardTitle, { color: '#DC2626' }]}>⚠️ Account Deletion</Text>
        <Text style={styles.cardText}>
          Permanently delete your profile, career data, and cancel active subscriptions. A 14-day
          recovery grace period is provided.
        </Text>
        <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
          <Text style={styles.dangerButtonText}>Delete My Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  primaryButton: {
    backgroundColor: '#246BFE',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  dangerButton: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  dangerButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
});
