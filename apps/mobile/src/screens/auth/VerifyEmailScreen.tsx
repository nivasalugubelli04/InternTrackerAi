import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { authService } from '../../services/auth.service';
import { Colors, Spacing, Typography } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

export default function VerifyEmailScreen({ navigation, route }: Props): React.ReactElement {
  const { token } = route.params;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async (): Promise<void> => {
      try {
        const result = await authService.verifyEmail(token);
        setMessage(result.message);
        setStatus('success');
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Verification failed.';
        setMessage(Array.isArray(msg) ? msg[0] : msg);
        setStatus('error');
      }
    };
    void verify();
  }, [token]);

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color={Colors.brand.purple} />
          <Text style={styles.loadingText}>Verifying your email…</Text>
        </>
      )}

      {status === 'success' && (
        <>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.body}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </>
      )}

      {status === 'error' && (
        <>
          <Text style={styles.emoji}>❌</Text>
          <Text style={styles.title}>Verification Failed</Text>
          <Text style={styles.body}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emoji: { fontSize: 72, marginBottom: Spacing.lg },
  title: { color: Colors.text.primary, fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.md },
  body: { color: Colors.text.secondary, fontSize: Typography.fontSize.base, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl },
  loadingText: { color: Colors.text.secondary, marginTop: Spacing.md, fontSize: Typography.fontSize.base },
  button: { backgroundColor: Colors.brand.purple, paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.xl, borderRadius: 12 },
  buttonText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
});
