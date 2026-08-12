import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import type { MatchScore } from '../../services/opportunities.service';

interface Props {
  matchScore: MatchScore | null;
  size?: 'sm' | 'lg';
}

function getScoreColor(score: number): string {
  if (score >= 90) return Colors.success;
  if (score >= 75) return Colors.brand.cyan;
  if (score >= 60) return Colors.warning;
  return Colors.text.muted;
}

export function MatchScoreBadge({ matchScore, size = 'sm' }: Props): React.ReactElement | null {
  if (!matchScore) return null;
  const score = Math.round(matchScore.overallScore);
  const color = getScoreColor(score);

  if (size === 'lg') {
    return (
      <View style={[styles.lgContainer, { borderColor: color }]}>
        <Text style={[styles.lgScore, { color }]}>{score}%</Text>
        <Text style={styles.lgLabel}>Match</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
      <Text style={[styles.badgeText, { color }]}>{score}% Match</Text>
    </View>
  );
}

export function MatchScoreBreakdown({ matchScore }: { matchScore: MatchScore }): React.ReactElement {
  const rows = [
    { label: 'Skills', value: matchScore.skillScore },
    { label: 'Location', value: matchScore.locationScore },
    { label: 'Role', value: matchScore.educationScore },
    { label: 'CGPA', value: matchScore.cgpaScore },
    { label: 'Company Preference', value: matchScore.companyPreferenceScore },
    { label: 'Stipend', value: matchScore.stipendScore },
    { label: 'Experience', value: matchScore.experienceScore },
  ];

  return (
    <View style={styles.breakdownContainer}>
      {rows.map(({ label, value }) => (
        <View key={label} style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{label}</Text>
          <View style={styles.breakdownBarTrack}>
            <View
              style={[
                styles.breakdownBarFill,
                { width: `${Math.min(100, value)}%`, backgroundColor: getScoreColor(value) },
              ]}
            />
          </View>
          <Text style={[styles.breakdownValue, { color: getScoreColor(value) }]}>
            {Math.round(value)}%
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  lgContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
  },
  lgScore: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.extrabold,
  },
  lgLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.muted,
    fontWeight: Typography.fontWeight.medium,
  },
  breakdownContainer: { gap: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  breakdownLabel: {
    width: 120,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  breakdownBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  breakdownBarFill: { height: '100%', borderRadius: BorderRadius.full },
  breakdownValue: {
    width: 36,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'right',
  },
});
