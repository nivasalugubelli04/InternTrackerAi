import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

interface ProfileCompletionCardProps {
  total: number;
  sections: {
    personal: number;
    education: number;
    skills: number;
    resume: number;
    careerPreferences: number;
  };
}

const SECTION_META = [
  { key: 'personal', label: 'Personal Info', emoji: '👤' },
  { key: 'education', label: 'Education', emoji: '🎓' },
  { key: 'skills', label: 'Skills', emoji: '⚡' },
  { key: 'resume', label: 'Resume', emoji: '📄' },
  { key: 'careerPreferences', label: 'Career Prefs', emoji: '🎯' },
] as const;

export function ProfileCompletionCard({
  total,
  sections,
}: ProfileCompletionCardProps): React.ReactElement {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: total / 100,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [total, animatedWidth]);

  const barWidth = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Profile Completion</Text>
          <Text style={styles.subtitle}>Complete your profile to get better matches</Text>
        </View>
        <View style={styles.percentCircle}>
          <Text style={styles.percentText}>{total}%</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { width: barWidth },
            total === 100 && styles.fillComplete,
          ]}
        />
      </View>

      {/* Section breakdown */}
      <View style={styles.sections}>
        {SECTION_META.map(({ key, label, emoji }) => {
          const val = sections[key];
          const done = val > 0;
          return (
            <View key={key} style={styles.sectionRow}>
              <Text style={styles.sectionEmoji}>{emoji}</Text>
              <Text style={[styles.sectionLabel, done && styles.sectionDone]}>{label}</Text>
              <Text style={[styles.sectionStatus, done && styles.sectionStatusDone]}>
                {done ? '✓' : `${val}/20`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  title: { color: Colors.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold },
  subtitle: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  percentCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 2,
    borderColor: Colors.brand.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  track: { height: 6, backgroundColor: Colors.background.tertiary, borderRadius: BorderRadius.full, overflow: 'hidden', marginBottom: Spacing.md },
  fill: { height: '100%', backgroundColor: Colors.brand.purple, borderRadius: BorderRadius.full },
  fillComplete: { backgroundColor: Colors.success },
  sections: {},
  sectionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs - 1 },
  sectionEmoji: { fontSize: 14, marginRight: Spacing.sm },
  sectionLabel: { flex: 1, color: Colors.text.muted, fontSize: Typography.fontSize.sm },
  sectionDone: { color: Colors.text.secondary },
  sectionStatus: { color: Colors.text.muted, fontSize: Typography.fontSize.xs },
  sectionStatusDone: { color: Colors.success, fontWeight: Typography.fontWeight.semibold },
});
