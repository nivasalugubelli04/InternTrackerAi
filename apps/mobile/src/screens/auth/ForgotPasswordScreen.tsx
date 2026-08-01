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

const schema = z.object({ email: z.string().email('Please enter a valid email') });
type FormData = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      setIsLoading(true);
      setApiError(null);
      await authService.forgotPassword(data.email);
      setSent(true);
    } catch {
      setApiError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.emoji}>📬</Text>
        <Text style={styles.successTitle}>Email Sent!</Text>
        <Text style={styles.successBody}>
          If that email address is registered, you'll receive a password reset link shortly.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AuthHeader emoji="🔐" title="Forgot Password" subtitle="Enter your email to receive a reset link" />

        <FormInput name="email" control={control} label="Email Address" placeholder="john@example.com" keyboardType="email-address" autoComplete="email" />

        {apiError ? (
          <View style={styles.errorBanner}><Text style={styles.errorText}>⚠️ {apiError}</Text></View>
        ) : null}

        <PrimaryButton title="Send Reset Link" onPress={handleSubmit(onSubmit)} isLoading={isLoading} style={styles.button} />

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.link}>← Back to Sign In</Text>
        </TouchableOpacity>
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
  backLink: { alignItems: 'center', marginTop: Spacing.xl },
  link: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  successContainer: { flex: 1, backgroundColor: Colors.background.primary, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emoji: { fontSize: 64, marginBottom: Spacing.lg },
  successTitle: { color: Colors.text.primary, fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.md },
  successBody: { color: Colors.text.secondary, fontSize: Typography.fontSize.base, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl },
});
