import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivationProgressData } from '../../services/engagement.service';

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
};

interface Props {
  data: ActivationProgressData;
  onNextStepPress: () => void;
}

export const ActivationProgressBar: React.FC<Props> = ({ data, onNextStepPress }) => {
  if (data.isActivated) return null;

  const percentage = Math.round(data.activationScore * 100);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Career Readiness Activation</Text>
        <Text style={styles.percentText}>{percentage}%</Text>
      </View>

      {/* Progress Track */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percentage}%` }]} />
      </View>

      {/* Next Best Step recommendation */}
      {data.nextBestStep && (
        <TouchableOpacity
          style={styles.nextStepBanner}
          onPress={onNextStepPress}
          accessibilityRole="button"
          accessibilityLabel={data.nextBestStep.title}
        >
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>💡</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.stepTitle}>Next: {data.nextBestStep.title}</Text>
            <Text style={styles.stepDesc}>{data.nextBestStep.impactExplanation}</Text>
          </View>
          <Text style={styles.arrowText}>→</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.soft,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.primary,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  fill: {
    height: '100%',
    backgroundColor: THEME.primary,
    borderRadius: 3,
  },
  nextStepBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.sky,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconText: {
    fontSize: 14,
  },
  textContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.text,
  },
  stepDesc: {
    fontSize: 11,
    color: THEME.secondary,
    marginTop: 1,
  },
  arrowText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primary,
    marginLeft: 6,
  },
});
