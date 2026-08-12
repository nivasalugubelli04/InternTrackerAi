import React from 'react';
import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

interface SelectChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function SelectChip({ label, selected, onPress, style }: SelectChipProps): React.ReactElement {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    backgroundColor: Colors.background.secondary,
    margin: 4,
  },
  chipSelected: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderColor: Colors.brand.purple,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  labelSelected: {
    color: Colors.brand.purpleLight,
    fontWeight: Typography.fontWeight.semibold,
  },
});
