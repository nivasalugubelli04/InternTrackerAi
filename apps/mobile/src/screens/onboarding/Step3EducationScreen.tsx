import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
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
import { Colors, Spacing, Typography } from '../../theme';
import { profileApi } from '../../services/profile.service';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Step3Education'>;

const schema = z.object({
  college: z.string().max(200).optional().or(z.literal('')),
  university: z.string().max(200).optional().or(z.literal('')),
  degree: z.string().max(100).optional().or(z.literal('')),
  branch: z.string().max(100).optional().or(z.literal('')),
  yearOfStudy: z.coerce.number().min(1).max(6).optional().or(z.literal('')),
  cgpa: z.coerce.number().min(0).max(10).optional().or(z.literal('')),
  graduationYear: z.coerce.number().min(2020).max(2040).optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function Step3EducationScreen({ navigation }: Props): React.ReactElement {
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      college: '', university: '', degree: '', branch: '',
      yearOfStudy: '', cgpa: '', graduationYear: '',
      linkedinUrl: '', githubUrl: '', portfolioUrl: '',
    },
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      if (data.college) payload.college = data.college;
      if (data.university) payload.university = data.university;
      if (data.degree) payload.degree = data.degree;
      if (data.branch) payload.branch = data.branch;
      if (data.yearOfStudy) payload.yearOfStudy = Number(data.yearOfStudy);
      if (data.cgpa) payload.cgpa = Number(data.cgpa);
      if (data.graduationYear) payload.graduationYear = Number(data.graduationYear);
      if (data.linkedinUrl) payload.linkedinUrl = data.linkedinUrl;
      if (data.githubUrl) payload.githubUrl = data.githubUrl;
      if (data.portfolioUrl) payload.portfolioUrl = data.portfolioUrl;

      if (Object.keys(payload).length > 0) {
        await profileApi.update(payload as Parameters<typeof profileApi.update>[0]);
      }
      navigation.navigate('Step4Skills');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StepProgressBar currentStep={3} totalSteps={8} stepLabel="Education" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <StepHeader emoji="🎓" title="Education" subtitle="Tell us about your academic background." />

          <View style={styles.form}>
            <Controller control={control} name="college" render={({ field: { onChange, value } }) => (
              <FormInput label="College / Institution" placeholder="IIT Bombay" value={String(value)} onChangeText={onChange} error={errors.college?.message} />
            )} />
            <Controller control={control} name="university" render={({ field: { onChange, value } }) => (
              <FormInput label="University / Board" placeholder="Mumbai University" value={String(value)} onChangeText={onChange} error={errors.university?.message} />
            )} />
            <Controller control={control} name="degree" render={({ field: { onChange, value } }) => (
              <FormInput label="Degree" placeholder="B.Tech / B.E. / M.Tech" value={String(value)} onChangeText={onChange} error={errors.degree?.message} />
            )} />
            <Controller control={control} name="branch" render={({ field: { onChange, value } }) => (
              <FormInput label="Branch / Major" placeholder="Computer Science & Engineering" value={String(value)} onChangeText={onChange} error={errors.branch?.message} />
            )} />

            <View style={styles.row}>
              <Controller control={control} name="yearOfStudy" render={({ field: { onChange, value } }) => (
                <FormInput label="Year of Study" placeholder="3" value={String(value)} onChangeText={onChange} keyboardType="number-pad" style={{ flex: 1 }} error={errors.yearOfStudy?.message} />
              )} />
              <View style={{ width: Spacing.md }} />
              <Controller control={control} name="cgpa" render={({ field: { onChange, value } }) => (
                <FormInput label="CGPA" placeholder="8.5" value={String(value)} onChangeText={onChange} keyboardType="decimal-pad" style={{ flex: 1 }} error={errors.cgpa?.message} />
              )} />
            </View>

            <Controller control={control} name="graduationYear" render={({ field: { onChange, value } }) => (
              <FormInput label="Graduation Year" placeholder="2026" value={String(value)} onChangeText={onChange} keyboardType="number-pad" error={errors.graduationYear?.message} />
            )} />

            <Text style={styles.sectionLabel}>🔗 Social Links</Text>

            <Controller control={control} name="linkedinUrl" render={({ field: { onChange, value } }) => (
              <FormInput label="LinkedIn" placeholder="https://linkedin.com/in/username" value={String(value)} onChangeText={onChange} autoCapitalize="none" error={errors.linkedinUrl?.message} />
            )} />
            <Controller control={control} name="githubUrl" render={({ field: { onChange, value } }) => (
              <FormInput label="GitHub" placeholder="https://github.com/username" value={String(value)} onChangeText={onChange} autoCapitalize="none" error={errors.githubUrl?.message} />
            )} />
            <Controller control={control} name="portfolioUrl" render={({ field: { onChange, value } }) => (
              <FormInput label="Portfolio" placeholder="https://yoursite.dev" value={String(value)} onChangeText={onChange} autoCapitalize="none" error={errors.portfolioUrl?.message} />
            )} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate('Step4Skills')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <PrimaryButton title="Continue →" onPress={handleSubmit(onSubmit)} loading={loading} style={{ flex: 1, marginLeft: Spacing.md }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  scroll: { paddingBottom: Spacing.xl },
  form: { paddingHorizontal: Spacing.xl },
  row: { flexDirection: 'row' },
  sectionLabel: { color: Colors.text.primary, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.md, marginBottom: Spacing.xs },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  skipBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  skipText: { color: Colors.text.muted, fontSize: Typography.fontSize.sm },
});
