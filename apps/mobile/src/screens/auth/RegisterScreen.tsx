import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
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

const registerSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

type RegisterFormData = z.infer<typeof registerSchema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { control, handleSubmit } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    try {
      setIsLoading(true);
      setApiError(null);
      await authService.register(data);
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Registration failed. Please try again.';
      setApiError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>📧</Text>
        <Text style={styles.successTitle}>Check Your Email</Text>
        <Text style={styles.successBody}>
          We sent a verification link to your email address. Please verify your account before logging in.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.footerLink}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          emoji="✨"
          title="Create Account"
          subtitle="Join InternTracker AI today"
        />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormInput
              name="firstName"
              control={control}
              label="First Name"
              placeholder="John"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.halfField}>
            <FormInput
              name="lastName"
              control={control}
              label="Last Name"
              placeholder="Doe"
              autoCapitalize="words"
            />
          </View>
        </View>

        <FormInput
          name="email"
          control={control}
          label="Email Address"
          placeholder="john@example.com"
          keyboardType="email-address"
          autoComplete="email"
        />
        <FormInput
          name="password"
          control={control}
          label="Password"
          placeholder="Min. 8 characters"
          secureTextEntry
          autoComplete="new-password"
        />

        {apiError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {apiError}</Text>
          </View>
        ) : null}

        <PrimaryButton
          title="Create Account"
          onPress={handleSubmit(onSubmit)}
          isLoading={isLoading}
          style={styles.button}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background.primary },
  container: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl, paddingTop: Spacing['2xl'] },
  row: { flexDirection: 'row', gap: Spacing.sm },
  halfField: { flex: 1 },
  button: { marginTop: Spacing.sm },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: { color: Colors.error, fontSize: Typography.fontSize.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm },
  footerLink: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  successContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  successEmoji: { fontSize: 64, marginBottom: Spacing.lg },
  successTitle: { color: Colors.text.primary, fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.md },
  successBody: { color: Colors.text.secondary, fontSize: Typography.fontSize.base, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl },
});
