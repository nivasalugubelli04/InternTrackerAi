import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { PrimaryButton } from '../components/auth/PrimaryButton';
import { SelectChip } from '../components/common/SelectChip';
import { FormInput } from '../components/auth/FormInput';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { preferencesApi } from '../services/profile.service';

const ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'ML Engineer',
  'DevOps Engineer',
  'Product Manager',
  'UI/UX Designer',
];
const INDUSTRIES = [
  'FinTech',
  'EdTech',
  'HealthTech',
  'SaaS',
  'E-Commerce',
  'Gaming',
  'AI/ML',
  'Consulting',
];
const LOCATIONS = [
  'Bengaluru',
  'Mumbai',
  'Delhi NCR',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Remote',
  'Anywhere in India',
];
const DURATIONS = ['1 month', '2 months', '3 months', '4-6 months', '6+ months'];
const WORK_MODES = [
  { value: 'REMOTE' as const, label: '🏠 Remote' },
  { value: 'HYBRID' as const, label: '🏢 Hybrid' },
  { value: 'ONSITE' as const, label: '🏙 On-site' },
];

export default function ManagePreferencesScreen(): React.ReactElement {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Career
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedWorkModes, setSelectedWorkModes] = useState<('REMOTE' | 'HYBRID' | 'ONSITE')[]>(
    [],
  );
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [stipend, setStipend] = useState('');

  // Notifications
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const { career, notifications } = await preferencesApi.getAll();
        if (career) {
          setSelectedRoles(career.preferredRoles);
          setSelectedLocations(career.preferredLocations);
          setSelectedIndustries(career.preferredIndustries);
          setSelectedWorkModes(career.preferredWorkMode);
          setSelectedDuration(career.internshipDuration ?? '');
          setStipend(career.minimumStipend?.toString() ?? '');
        }
        if (notifications) {
          setEmailEnabled(notifications.emailEnabled);
          setPushEnabled(notifications.pushEnabled);
          setDailyDigest(notifications.dailyDigest);
          setWeeklyDigest(notifications.weeklyDigest);
          setQuietStart(notifications.quietHoursStart ?? '22:00');
          setQuietEnd(notifications.quietHoursEnd ?? '08:00');
        }
      } catch (err) {
        Alert.alert('Error', 'Could not load preferences');
      } finally {
        setLoading(false);
      }
    };
    void fetchPrefs();
  }, []);

  const toggle = <T extends string>(
    setList: React.Dispatch<React.SetStateAction<T[]>>,
    item: T,
  ): void => {
    setList((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  };

  const onSubmit = async (): Promise<void> => {
    setSaving(true);
    try {
      await Promise.all([
        preferencesApi.updateCareer({
          preferredRoles: selectedRoles,
          preferredLocations: selectedLocations,
          preferredIndustries: selectedIndustries,
          preferredWorkMode: selectedWorkModes,
          internshipDuration: selectedDuration || undefined,
          minimumStipend: stipend ? parseInt(stipend, 10) : undefined,
        }),
        preferencesApi.updateNotifications({
          emailEnabled,
          pushEnabled,
          dailyDigest,
          weeklyDigest,
          quietHoursStart: quietStart,
          quietHoursEnd: quietEnd,
        }),
      ]);
      queryClient.invalidateQueries({ queryKey: ['career-center'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      Alert.alert('Success', 'Preferences saved successfully');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const ToggleRow = ({
    emoji,
    title,
    subtitle,
    value,
    onChange,
  }: {
    emoji: string;
    title: string;
    subtitle: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.brand.purple} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Career Preferences */}
        <Text style={styles.header}>Career</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferred Roles</Text>
          <View style={styles.chips}>
            {ROLES.map((role) => (
              <SelectChip
                key={role}
                label={role}
                selected={selectedRoles.includes(role)}
                onPress={() => toggle(setSelectedRoles, role)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferred Industries</Text>
          <View style={styles.chips}>
            {INDUSTRIES.map((ind) => (
              <SelectChip
                key={ind}
                label={ind}
                selected={selectedIndustries.includes(ind)}
                onPress={() => toggle(setSelectedIndustries, ind)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Work Mode</Text>
          <View style={styles.chips}>
            {WORK_MODES.map(({ value, label }) => (
              <SelectChip
                key={value}
                label={label}
                selected={selectedWorkModes.includes(value)}
                onPress={() => toggle(setSelectedWorkModes, value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferred Locations</Text>
          <View style={styles.chips}>
            {LOCATIONS.map((loc) => (
              <SelectChip
                key={loc}
                label={loc}
                selected={selectedLocations.includes(loc)}
                onPress={() => toggle(setSelectedLocations, loc)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <SelectChip
                key={d}
                label={d}
                selected={selectedDuration === d}
                onPress={() => setSelectedDuration(selectedDuration === d ? '' : d)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <FormInput
            label="Minimum Stipend (₹/month)"
            placeholder="e.g. 15000"
            value={stipend}
            onChangeText={setStipend}
            keyboardType="number-pad"
          />
        </View>

        {/* Notifications */}
        <Text style={styles.header}>Notifications</Text>

        <View style={styles.section}>
          <View style={styles.card}>
            <ToggleRow
              emoji="📧"
              title="Email"
              subtitle="Important updates"
              value={emailEnabled}
              onChange={setEmailEnabled}
            />
            <View style={styles.divider} />
            <ToggleRow
              emoji="📱"
              title="Push"
              subtitle="Real-time alerts"
              value={pushEnabled}
              onChange={setPushEnabled}
            />
            <View style={styles.divider} />
            <ToggleRow
              emoji="📰"
              title="Daily Digest"
              subtitle="Summary at 9 AM"
              value={dailyDigest}
              onChange={setDailyDigest}
            />
            <View style={styles.divider} />
            <ToggleRow
              emoji="📅"
              title="Weekly Digest"
              subtitle="Monday morning"
              value={weeklyDigest}
              onChange={setWeeklyDigest}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🌙 Quiet Hours</Text>
          <View style={styles.card}>
            <View style={styles.quietRow}>
              <View style={styles.quietItem}>
                <Text style={styles.quietLabel}>From</Text>
                {['20:00', '21:00', '22:00', '23:00'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, quietStart === t && styles.timeChipSelected]}
                    onPress={() => setQuietStart(t)}
                  >
                    <Text
                      style={[styles.timeChipText, quietStart === t && styles.timeChipTextSelected]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.quietItem}>
                <Text style={styles.quietLabel}>To</Text>
                {['06:00', '07:00', '08:00', '09:00'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, quietEnd === t && styles.timeChipSelected]}
                    onPress={() => setQuietEnd(t)}
                  >
                    <Text
                      style={[styles.timeChipText, quietEnd === t && styles.timeChipTextSelected]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          title="Save Preferences"
          onPress={() => {
            void onSubmit();
          }}
          loading={saving}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  scroll: { padding: Spacing.xl },
  header: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    overflow: 'hidden',
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  toggleEmoji: { fontSize: 20, marginRight: Spacing.md, width: 28 },
  toggleInfo: { flex: 1 },
  toggleTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  toggleSubtitle: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border.subtle, marginHorizontal: Spacing.md },
  quietRow: { flexDirection: 'row', padding: Spacing.md },
  quietItem: { flex: 1 },
  quietLabel: {
    color: Colors.text.muted,
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.sm,
  },
  timeChip: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom: 6,
  },
  timeChipSelected: { backgroundColor: 'rgba(124,58,237,0.15)', borderColor: Colors.brand.purple },
  timeChipText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm },
  timeChipTextSelected: {
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.semibold,
  },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    backgroundColor: Colors.background.primary,
  },
});
