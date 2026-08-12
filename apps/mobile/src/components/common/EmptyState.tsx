import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  emoji = '📭',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emoji: { fontSize: 64, marginBottom: Spacing.lg },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  button: {
    backgroundColor: Colors.brand.purple,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
  },
  buttonText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
});
