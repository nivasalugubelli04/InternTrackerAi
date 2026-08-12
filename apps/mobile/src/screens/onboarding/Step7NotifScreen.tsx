import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { StepProgressBar } from '../../components/common/StepProgressBar';
import { StepHeader } from '../../components/common/StepHeader';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { preferencesApi } from '../../services/profile.service';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Step7Notifications'>;

export default function Step7NotifScreen({ navigation }: Props): React.ReactElement {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (): Promise<void> => {
    setLoading(true);
    try {
      await preferencesApi.updateNotifications({
        emailEnabled,
        pushEnabled,
        dailyDigest,
        weeklyDigest,
        quietHoursStart: quietStart,
        quietHoursEnd: quietEnd,
      });
      navigation.navigate('Step8Review');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const ToggleRow = ({
    emoji, title, subtitle, value, onChange,
  }: { emoji: string; title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void }): React.ReactElement => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleEmoji}>{emoji}</Text>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.background.tertiary, true: 'rgba(124,58,237,0.4)' }}
        thumbColor={value ? Colors.brand.purple : Colors.text.muted}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StepProgressBar currentStep={7} totalSteps={8} stepLabel="Notifications" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <StepHeader emoji="🔔" title="Notifications" subtitle="Stay updated without the noise." />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Channels</Text>
          <View style={styles.card}>
            <ToggleRow emoji="📧" title="Email Notifications" subtitle="Get updates in your inbox" value={emailEnabled} onChange={setEmailEnabled} />
            <View style={styles.divider} />
            <ToggleRow emoji="📱" title="Push Notifications" subtitle="Real-time alerts on your device" value={pushEnabled} onChange={setPushEnabled} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Digests</Text>
          <View style={styles.card}>
            <ToggleRow emoji="📰" title="Daily Digest" subtitle="Summary every morning at 9 AM" value={dailyDigest} onChange={setDailyDigest} />
            <View style={styles.divider} />
            <ToggleRow emoji="📅" title="Weekly Digest" subtitle="Summary every Monday morning" value={weeklyDigest} onChange={setWeeklyDigest} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌙 Quiet Hours</Text>
          <Text style={styles.sectionSubtitle}>No notifications during this period</Text>
          <View style={styles.card}>
            <View style={styles.quietRow}>
              <View style={styles.quietItem}>
                <Text style={styles.quietLabel}>From</Text>
                {['20:00', '21:00', '22:00', '23:00'].map((t) => (
                  <TouchableOpacity key={t} style={[styles.timeChip, quietStart === t && styles.timeChipSelected]} onPress={() => setQuietStart(t)}>
                    <Text style={[styles.timeChipText, quietStart === t && styles.timeChipTextSelected]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.quietItem}>
                <Text style={styles.quietLabel}>To</Text>
                {['06:00', '07:00', '08:00', '09:00'].map((t) => (
                  <TouchableOpacity key={t} style={[styles.timeChip, quietEnd === t && styles.timeChipSelected]} onPress={() => setQuietEnd(t)}>
                    <Text style={[styles.timeChipText, quietEnd === t && styles.timeChipTextSelected]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate('Step8Review')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <PrimaryButton title="Continue →" onPress={() => { void onSubmit(); }} loading={loading} style={{ flex: 1, marginLeft: Spacing.md }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  scroll: { paddingBottom: Spacing.xl },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  sectionTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  sectionSubtitle: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.subtle, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  toggleEmoji: { fontSize: 20, marginRight: Spacing.md, width: 28 },
  toggleInfo: { flex: 1 },
  toggleTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium },
  toggleSubtitle: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border.subtle, marginHorizontal: Spacing.md },
  quietRow: { flexDirection: 'row', padding: Spacing.md },
  quietItem: { flex: 1 },
  quietLabel: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, marginBottom: Spacing.sm },
  timeChip: { borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.sm, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, marginBottom: 6 },
  timeChipSelected: { backgroundColor: 'rgba(124,58,237,0.15)', borderColor: Colors.brand.purple },
  timeChipText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm },
  timeChipTextSelected: { color: Colors.brand.purpleLight, fontWeight: Typography.fontWeight.semibold },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  skipBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  skipText: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
});
