import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AuthHeader } from '../../components/auth/AuthHeader';
import { FormInput } from '../../components/auth/FormInput';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { authService } from '../../services/auth.service';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const schema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});
type FormData = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ navigation, route }: Props): React.ReactElement {
  const { token } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '' },
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      setIsLoading(true);
      setApiError(null);
      await authService.resetPassword({ token, newPassword: data.newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Reset failed.';
      setApiError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.emoji}>✅</Text>
        <Text style={styles.successTitle}>Password Reset!</Text>
        <Text style={styles.successBody}>Your password has been updated. Please sign in with your new password.</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AuthHeader emoji="🔑" title="New Password" subtitle="Choose a strong password for your account" />

        <FormInput name="newPassword" control={control} label="New Password" placeholder="Min. 8 characters" secureTextEntry autoComplete="new-password" />

        {apiError ? (
          <View style={styles.errorBanner}><Text style={styles.errorText}>⚠️ {apiError}</Text></View>
        ) : null}

        <PrimaryButton title="Reset Password" onPress={handleSubmit(onSubmit)} isLoading={isLoading} style={styles.button} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background.primary },
  container: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  button: { marginTop: Spacing.sm },
  errorBanner: { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: Colors.error, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  errorText: { color: Colors.error, fontSize: Typography.fontSize.sm },
  successContainer: { flex: 1, backgroundColor: Colors.background.primary, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emoji: { fontSize: 64, marginBottom: Spacing.lg },
  successTitle: { color: Colors.text.primary, fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.md },
  successBody: { color: Colors.text.secondary, fontSize: Typography.fontSize.base, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl },
  link: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
});
