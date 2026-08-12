import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { FormInput } from '../../components/auth/FormInput';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { StepProgressBar } from '../../components/common/StepProgressBar';
import { StepHeader } from '../../components/common/StepHeader';
import { Colors, Spacing, BorderRadius, Typography } from '../../theme';
import { profileApi } from '../../services/profile.service';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Step2Personal'>;

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
] as const;

const schema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, 'Use international format, e.g. +919876543210')
    .optional()
    .or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']).optional(),
  bio: z.string().max(500).optional().or(z.literal('')),
  headline: z.string().max(150).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function Step2PersonalScreen({ navigation }: Props): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [selectedGender, setSelectedGender] = useState<string | undefined>();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', bio: '', headline: '', city: '', state: '', country: '' },
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    setLoading(true);
    try {
      // Create or update profile with personal info
      const payload = {
        ...(data.phone ? { phone: data.phone } : {}),
        ...(selectedGender ? { gender: selectedGender as FormData['gender'] } : {}),
        ...(data.bio ? { bio: data.bio } : {}),
        ...(data.headline ? { headline: data.headline } : {}),
        ...(data.city ? { city: data.city } : {}),
        ...(data.state ? { state: data.state } : {}),
        ...(data.country ? { country: data.country } : {}),
      };

      try {
        await profileApi.create(payload);
      } catch {
        // Profile exists — update instead
        await profileApi.update(payload);
      }
      navigation.navigate('Step3Education');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StepProgressBar currentStep={2} totalSteps={8} stepLabel="Personal Info" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <StepHeader emoji="👤" title="About You" subtitle="Tell us a bit about yourself. All fields are optional." />

          <View style={styles.form}>
            <Controller
              control={control}
              name="headline"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Professional Headline"
                  placeholder="e.g. Full Stack Developer | Open to Internships"
                  value={value}
                  onChangeText={onChange}
                  error={errors.headline?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Phone Number"
                  placeholder="+919876543210"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="phone-pad"
                  error={errors.phone?.message}
                />
              )}
            />

            {/* Gender selector */}
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.genderChip, selectedGender === value && styles.genderChipSelected]}
                  onPress={() => setSelectedGender(selectedGender === value ? undefined : value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.genderText, selectedGender === value && styles.genderTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Controller
              control={control}
              name="bio"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Bio"
                  placeholder="Write a short bio about your interests and goals..."
                  value={value}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={3}
                  error={errors.bio?.message}
                />
              )}
            />

            <Text style={styles.sectionLabel}>Location</Text>

            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <FormInput label="City" placeholder="Bengaluru" value={value} onChangeText={onChange} error={errors.city?.message} />
              )}
            />
            <Controller
              control={control}
              name="state"
              render={({ field: { onChange, value } }) => (
                <FormInput label="State" placeholder="Karnataka" value={value} onChangeText={onChange} error={errors.state?.message} />
              )}
            />
            <Controller
              control={control}
              name="country"
              render={({ field: { onChange, value } }) => (
                <FormInput label="Country" placeholder="India" value={value} onChangeText={onChange} error={errors.country?.message} />
              )}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate('Step3Education')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
        <PrimaryButton
          title="Continue →"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={{ flex: 1, marginLeft: Spacing.md }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  scroll: { paddingBottom: Spacing.xl },
  form: { paddingHorizontal: Spacing.xl },
  fieldLabel: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, marginBottom: Spacing.xs },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.md, gap: 8 },
  genderChip: { borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  genderChipSelected: { backgroundColor: 'rgba(124,58,237,0.15)', borderColor: Colors.brand.purple },
  genderText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm },
  genderTextSelected: { color: Colors.brand.purpleLight, fontWeight: Typography.fontWeight.semibold },
  sectionLabel: { color: Colors.text.primary, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  skipBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  skipText: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
});
