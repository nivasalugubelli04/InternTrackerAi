import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { StepProgressBar } from '../../components/common/StepProgressBar';
import { StepHeader } from '../../components/common/StepHeader';
import { SelectChip } from '../../components/common/SelectChip';
import { FormInput } from '../../components/auth/FormInput';
import { Colors, Spacing, Typography } from '../../theme';
import { preferencesApi } from '../../services/profile.service';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Step5Career'>;

const ROLES = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist', 'ML Engineer', 'DevOps Engineer', 'Product Manager', 'UI/UX Designer', 'Android Developer', 'iOS Developer', 'Cloud Engineer'];
const INDUSTRIES = ['FinTech', 'EdTech', 'HealthTech', 'SaaS', 'E-Commerce', 'Gaming', 'AI/ML', 'Cybersecurity', 'Social Media', 'Consulting'];
const LOCATIONS = ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Chennai', 'Remote', 'Anywhere in India'];
const DURATIONS = ['1 month', '2 months', '3 months', '4-6 months', '6+ months'];
const WORK_MODES = [
  { value: 'REMOTE' as const, label: '🏠 Remote' },
  { value: 'HYBRID' as const, label: '🏢 Hybrid' },
  { value: 'ONSITE' as const, label: '🏙 On-site' },
];

export default function Step5CareerScreen({ navigation }: Props): React.ReactElement {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedWorkModes, setSelectedWorkModes] = useState<('REMOTE' | 'HYBRID' | 'ONSITE')[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [stipend, setStipend] = useState('');
  const [loading, setLoading] = useState(false);

  const toggle = <T extends string>(setList: React.Dispatch<React.SetStateAction<T[]>>, item: T): void => {
    setList((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]);
  };

  const onSubmit = async (): Promise<void> => {
    setLoading(true);
    try {
      await preferencesApi.updateCareer({
        preferredRoles: selectedRoles,
        preferredLocations: selectedLocations,
        preferredIndustries: selectedIndustries,
        preferredWorkMode: selectedWorkModes,
        internshipDuration: selectedDuration || undefined,
        minimumStipend: stipend ? parseInt(stipend, 10) : undefined,
      });
      navigation.navigate('Step6Resume');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StepProgressBar currentStep={5} totalSteps={8} stepLabel="Career Preferences" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <StepHeader emoji="🎯" title="Career Preferences" subtitle="Help us match you with the right internships." />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferred Roles</Text>
          <View style={styles.chips}>
            {ROLES.map((role) => (
              <SelectChip key={role} label={role} selected={selectedRoles.includes(role)} onPress={() => toggle(setSelectedRoles, role)} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Work Mode</Text>
          <View style={styles.chips}>
            {WORK_MODES.map(({ value, label }) => (
              <SelectChip key={value} label={label} selected={selectedWorkModes.includes(value)} onPress={() => toggle(setSelectedWorkModes, value)} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferred Locations</Text>
          <View style={styles.chips}>
            {LOCATIONS.map((loc) => (
              <SelectChip key={loc} label={loc} selected={selectedLocations.includes(loc)} onPress={() => toggle(setSelectedLocations, loc)} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Industries</Text>
          <View style={styles.chips}>
            {INDUSTRIES.map((ind) => (
              <SelectChip key={ind} label={ind} selected={selectedIndustries.includes(ind)} onPress={() => toggle(setSelectedIndustries, ind)} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <SelectChip key={d} label={d} selected={selectedDuration === d} onPress={() => setSelectedDuration(selectedDuration === d ? '' : d)} />
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
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate('Step6Resume')} style={styles.skipBtn}>
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
  sectionLabel: { color: Colors.text.primary, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  skipBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  skipText: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
});
