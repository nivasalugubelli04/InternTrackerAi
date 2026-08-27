import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DailyFocusCardData } from '../../services/engagement.service';

const THEME = {
  primary: '#246BFE',
  deep: '#1456D9',
  sky: '#EAF3FF',
  soft: '#F3F7FF',
  white: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  border: '#E7EAF0',
  green: '#10B981',
  softGreen: '#E9FBEA',
  badgeBg: '#FFF4D8',
  badgeText: '#B45309',
};

interface Props {
  data: DailyFocusCardData;
  onActionPress: () => void;
  onCompletePress: () => void;
}

export const DailyFocusCard: React.FC<Props> = ({ data, onActionPress, onCompletePress }) => {
  return (
    <View style={styles.cardContainer}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🎯 TODAY'S TOP PRIORITY</Text>
        </View>
        {data.matchScore ? (
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>{data.matchScore}% Match</Text>
          </View>
        ) : null}
      </View>

      {/* Main title & reason */}
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.reason}>{data.reason}</Text>

      {/* Action Footer */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryActionBtn, data.isCompleted && styles.completedBtn]}
          onPress={onActionPress}
          disabled={data.isCompleted}
          accessibilityRole="button"
          accessibilityLabel={data.actionLabel}
        >
          <Text style={styles.primaryActionText}>
            {data.isCompleted ? '✓ Completed' : `${data.actionLabel} →`}
          </Text>
        </TouchableOpacity>

        {!data.isCompleted && (
          <TouchableOpacity
            style={styles.checkDoneBtn}
            onPress={onCompletePress}
            accessibilityRole="button"
            accessibilityLabel="Mark focus done"
          >
            <Text style={styles.checkDoneText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    backgroundColor: THEME.sky,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.deep,
    letterSpacing: 0.5,
  },
  matchBadge: {
    backgroundColor: THEME.softGreen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.green,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  reason: {
    fontSize: 13,
    color: THEME.secondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  completedBtn: {
    backgroundColor: THEME.softGreen,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.white,
  },
  checkDoneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: THEME.soft,
    borderWidth: 1,
    borderColor: THEME.border,
    minHeight: 42,
    justifyContent: 'center',
  },
  checkDoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.secondary,
  },
});
