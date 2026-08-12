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
import { useAuthContext } from '../../context/AuthContext';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props): React.ReactElement {
  const { login } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    try {
      setIsLoading(true);
      setApiError(null);
      await login(data.email, data.password);
      // Navigation happens automatically via AppNavigator when isAuthenticated changes
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Please try again.';
      setApiError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsLoading(false);
    }
  };

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
          title="Welcome Back"
          subtitle="Sign in to your InternTracker account"
        />

        <View style={styles.form}>
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
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
          />

          {apiError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {apiError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotLink}
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>

          <PrimaryButton
            title="Sign In"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background.primary },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
    paddingTop: Spacing['3xl'],
  },
  form: { marginBottom: Spacing.xl },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: { color: Colors.error, fontSize: Typography.fontSize.sm },
  forgotLink: { alignSelf: 'flex-end', marginBottom: Spacing.lg },
  linkText: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: Colors.text.secondary, fontSize: Typography.fontSize.sm },
  footerLink: {
    color: Colors.brand.purpleLight,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});
