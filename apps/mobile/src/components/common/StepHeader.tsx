import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme';

interface StepHeaderProps {
  emoji?: string;
  title: string;
  subtitle?: string;
}

export function StepHeader({ emoji, title, subtitle }: StepHeaderProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  emoji: { fontSize: 36, marginBottom: Spacing.sm },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.extrabold,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * 1.5,
  },
});
