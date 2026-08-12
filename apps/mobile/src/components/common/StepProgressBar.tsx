import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

interface StepProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
}

export function StepProgressBar({
  currentStep,
  totalSteps,
  stepLabel,
}: StepProgressBarProps): React.ReactElement {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const progress = currentStep / totalSteps;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedWidth]);

  const width = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepText}>
          Step {currentStep} of {totalSteps}
        </Text>
        {stepLabel ? <Text style={styles.label}>{stepLabel}</Text> : null}
        <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  stepText: { color: Colors.text.muted, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium },
  label: { color: Colors.text.secondary, fontSize: Typography.fontSize.xs, flex: 1, textAlign: 'center' },
  percent: { color: Colors.brand.purpleLight, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  track: { height: 4, backgroundColor: Colors.background.tertiary, borderRadius: BorderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.brand.purple, borderRadius: BorderRadius.full },
});
