import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Colors, Typography, Spacing } from '../../theme';

interface AuthHeaderProps {
  emoji?: string;
  title: string;
  subtitle?: string;
}

export function AuthHeader({
  emoji = '🎯',
  title,
  subtitle,
}: AuthHeaderProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: Spacing.xl },
  emoji: { fontSize: 48, marginBottom: Spacing.sm },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.extrabold,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    lineHeight: Typography.fontSize.base * 1.5,
  },
});
