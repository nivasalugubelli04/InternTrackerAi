import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import type { DeadlineUrgency } from '../../services/opportunities.service';

interface Props {
  deadline: string | null;
  urgency: DeadlineUrgency;
}

const URGENCY_CONFIG: Record<DeadlineUrgency, { color: string; bg: string; label: string }> = {
  URGENT: { color: Colors.error, bg: 'rgba(239,68,68,0.15)', label: '🔥 Closing Soon' },
  SOON: { color: Colors.warning, bg: 'rgba(245,158,11,0.15)', label: '⏰ Closes Soon' },
  NORMAL: { color: Colors.text.muted, bg: Colors.background.tertiary, label: '' },
  UNKNOWN: { color: Colors.text.muted, bg: Colors.background.tertiary, label: '' },
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export function DeadlineBadge({ deadline, urgency }: Props): React.ReactElement {
  const config = URGENCY_CONFIG[urgency];
  const showBadge = urgency === 'URGENT' || urgency === 'SOON';

  return (
    <View style={styles.row}>
      <Text style={styles.label}>Deadline:</Text>
      {deadline ? (
        <View style={styles.valueRow}>
          {showBadge && (
            <View style={[styles.badge, { backgroundColor: config.bg }]}>
              <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
            </View>
          )}
          <Text style={[styles.dateText, { color: config.color }]}>
            {daysUntil(deadline)} days left
          </Text>
        </View>
      ) : (
        <Text style={styles.unknown}>Deadline not specified</Text>
      )}
    </View>
  );
}

export function DeadlinePill({ deadline, urgency }: Props): React.ReactElement | null {
  if (!deadline || urgency === 'NORMAL' || urgency === 'UNKNOWN') return null;
  const config = URGENCY_CONFIG[urgency];
  const days = daysUntil(deadline);
  return (
    <View style={[styles.pill, { backgroundColor: config.bg, borderColor: config.color }]}>
      <Text style={[styles.pillText, { color: config.color }]}>
        {days <= 0 ? 'Closing today' : `${days}d left`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  label: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, minWidth: 70 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
  dateText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  unknown: { fontSize: Typography.fontSize.sm, color: Colors.text.muted },
  pill: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  pillText: { fontSize: 10, fontWeight: Typography.fontWeight.bold },
});
