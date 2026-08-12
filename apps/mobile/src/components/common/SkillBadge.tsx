import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

type Proficiency = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

const PROFICIENCY_COLORS: Record<Proficiency, string> = {
  BEGINNER: '#64748b',
  INTERMEDIATE: '#0ea5e9',
  ADVANCED: '#a855f7',
  EXPERT: '#f59e0b',
};

const PROFICIENCY_LABELS: Record<Proficiency, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
};

interface SkillBadgeProps {
  name: string;
  proficiency: Proficiency;
  category?: string;
}

export function SkillBadge({ name, proficiency, category }: SkillBadgeProps): React.ReactElement {
  const color = PROFICIENCY_COLORS[proficiency];

  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {category ? <Text style={styles.category}>{category.replace('_', ' ')}</Text> : null}
      </View>
      <View style={[styles.proficiencyBadge, { borderColor: color }]}>
        <Text style={[styles.proficiencyText, { color }]}>{PROFICIENCY_LABELS[proficiency]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.sm },
  info: { flex: 1 },
  name: { color: Colors.text.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  category: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  proficiencyBadge: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm - 2, paddingVertical: 2 },
  proficiencyText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium },
});
