import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';

import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  isLoading?: boolean;
  loading?: boolean;
}

export function PrimaryButton({
  title,
  isLoading,
  loading,
  style,
  disabled,
  ...props
}: PrimaryButtonProps): React.ReactElement {
  const isButtonLoading = isLoading || loading;
  return (
    <TouchableOpacity
      style={[styles.button, (disabled || isButtonLoading) && styles.buttonDisabled, style]}
      disabled={disabled || isButtonLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isButtonLoading ? (
        <ActivityIndicator color={Colors.white} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.brand.purple,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: { opacity: 0.6 },
  text: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.3,
  },
});
