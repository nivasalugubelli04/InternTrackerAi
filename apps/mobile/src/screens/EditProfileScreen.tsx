import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ProfileStackParamList } from '../navigation/ProfileNavigator';
import { FormInput } from '../components/auth/FormInput';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { profileApi } from '../services/profile.service';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>;

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
] as const;

const schema = z.object({
  headline: z.string().max(150).optional().or(z.literal('')),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Use international format, e.g. +919876543210').optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  college: z.string().max(200).optional().or(z.literal('')),
  university: z.string().max(200).optional().or(z.literal('')),
  degree: z.string().max(100).optional().or(z.literal('')),
  branch: z.string().max(100).optional().or(z.literal('')),
  yearOfStudy: z.string().optional().or(z.literal('')),
  cgpa: z.string().optional().or(z.literal('')),
  graduationYear: z.string().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function EditProfileScreen({ navigation }: Props): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedGender, setSelectedGender] = useState<string | undefined>();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await profileApi.get();
        setSelectedGender(profile.gender || undefined);
        reset({
          headline: profile.headline || '',
          phone: profile.phone || '',
          bio: profile.bio || '',
          city: profile.city || '',
          state: profile.state || '',
          country: profile.country || '',
          college: profile.college || '',
          university: profile.university || '',
          degree: profile.degree || '',
          branch: profile.branch || '',
          yearOfStudy: profile.yearOfStudy?.toString() || '',
          cgpa: profile.cgpa?.toString() || '',
          graduationYear: profile.graduationYear?.toString() || '',
          linkedinUrl: profile.linkedinUrl || '',
          githubUrl: profile.githubUrl || '',
          portfolioUrl: profile.portfolioUrl || '',
        });
      } catch (err) {
        Alert.alert('Error', 'Could not load profile');
      } finally {
        setLoading(false);
      }
    };
    void fetchProfile();
  }, [reset]);

  const onSubmit = async (data: FormData): Promise<void> => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (selectedGender) payload.gender = selectedGender;
      
      // Convert numbers
      if (data.yearOfStudy) payload.yearOfStudy = Number(data.yearOfStudy);
      if (data.cgpa) payload.cgpa = Number(data.cgpa);
      if (data.graduationYear) payload.graduationYear = Number(data.graduationYear);

      await profileApi.update(payload as Parameters<typeof profileApi.update>[0]);
      Alert.alert('Success', 'Profile updated successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.brand.purple} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <Controller control={control} name="headline" render={({ field: { onChange, value } }) => (
            <FormInput label="Headline" placeholder="E.g. Full Stack Developer" value={String(value)} onChangeText={onChange} error={errors.headline?.message} />
          )} />
          <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
            <FormInput label="Phone" placeholder="+919876543210" value={String(value)} onChangeText={onChange} keyboardType="phone-pad" error={errors.phone?.message} />
          )} />
          
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDERS.map(({ value, label }) => (
              <TouchableOpacity key={value} style={[styles.genderChip, selectedGender === value && styles.genderChipSelected]} onPress={() => setSelectedGender(selectedGender === value ? undefined : value)}>
                <Text style={[styles.genderText, selectedGender === value && styles.genderTextSelected]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Controller control={control} name="bio" render={({ field: { onChange, value } }) => (
            <FormInput label="Bio" placeholder="Short bio..." value={String(value)} onChangeText={onChange} multiline numberOfLines={3} error={errors.bio?.message} />
          )} />

          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.row}>
            <Controller control={control} name="city" render={({ field: { onChange, value } }) => (
              <FormInput label="City" value={String(value)} onChangeText={onChange} style={{ flex: 1 }} error={errors.city?.message} />
            )} />
            <View style={{ width: Spacing.md }} />
            <Controller control={control} name="country" render={({ field: { onChange, value } }) => (
              <FormInput label="Country" value={String(value)} onChangeText={onChange} style={{ flex: 1 }} error={errors.country?.message} />
            )} />
          </View>

          <Text style={styles.sectionTitle}>Education</Text>
          <Controller control={control} name="college" render={({ field: { onChange, value } }) => (
            <FormInput label="College" value={String(value)} onChangeText={onChange} error={errors.college?.message} />
          )} />
          <Controller control={control} name="degree" render={({ field: { onChange, value } }) => (
            <FormInput label="Degree" value={String(value)} onChangeText={onChange} error={errors.degree?.message} />
          )} />
          <Controller control={control} name="branch" render={({ field: { onChange, value } }) => (
            <FormInput label="Branch" value={String(value)} onChangeText={onChange} error={errors.branch?.message} />
          )} />
          
          <View style={styles.row}>
            <Controller control={control} name="cgpa" render={({ field: { onChange, value } }) => (
              <FormInput label="CGPA" value={String(value)} onChangeText={onChange} keyboardType="decimal-pad" style={{ flex: 1 }} error={errors.cgpa?.message} />
            )} />
            <View style={{ width: Spacing.md }} />
            <Controller control={control} name="graduationYear" render={({ field: { onChange, value } }) => (
              <FormInput label="Grad. Year" value={String(value)} onChangeText={onChange} keyboardType="number-pad" style={{ flex: 1 }} error={errors.graduationYear?.message} />
            )} />
          </View>

          <Text style={styles.sectionTitle}>Links</Text>
          <Controller control={control} name="linkedinUrl" render={({ field: { onChange, value } }) => (
            <FormInput label="LinkedIn" value={String(value)} onChangeText={onChange} autoCapitalize="none" error={errors.linkedinUrl?.message} />
          )} />
          <Controller control={control} name="githubUrl" render={({ field: { onChange, value } }) => (
            <FormInput label="GitHub" value={String(value)} onChangeText={onChange} autoCapitalize="none" error={errors.githubUrl?.message} />
          )} />
          <Controller control={control} name="portfolioUrl" render={({ field: { onChange, value } }) => (
            <FormInput label="Portfolio" value={String(value)} onChangeText={onChange} autoCapitalize="none" error={errors.portfolioUrl?.message} />
          )} />
          
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <PrimaryButton title="Save Changes" onPress={handleSubmit(onSubmit)} loading={saving} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  scroll: { padding: Spacing.xl },
  sectionTitle: { color: Colors.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.md, marginBottom: Spacing.sm },
  row: { flexDirection: 'row' },
  fieldLabel: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, marginBottom: Spacing.xs },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.md, gap: 8 },
  genderChip: { borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  genderChipSelected: { backgroundColor: 'rgba(124,58,237,0.15)', borderColor: Colors.brand.purple },
  genderText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm },
  genderTextSelected: { color: Colors.brand.purpleLight, fontWeight: Typography.fontWeight.semibold },
  footer: { padding: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.border.subtle, backgroundColor: Colors.background.primary },
});
