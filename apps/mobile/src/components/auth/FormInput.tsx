import React from 'react';
import {
  TextInput,
  Text,
  View,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

interface FormInputProps<T extends FieldValues> extends TextInputProps {
  name?: FieldPath<T>;
  control?: Control<T>;
  label: string;
  error?: string;
}

export function FormInput<T extends FieldValues>({
  name,
  control,
  label,
  error: manualError,
  ...textInputProps
}: FormInputProps<T>): React.ReactElement {
  let rhfProps = {};
  let fieldError = manualError;

  if (name && control) {
    const { field, fieldState } = useController({ name, control });
    rhfProps = {
      value: field.value as string,
      onChangeText: field.onChange,
      onBlur: field.onBlur,
    };
    fieldError = fieldState.error?.message ?? manualError;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, fieldError ? styles.inputError : null, textInputProps.style]}
        placeholderTextColor={Colors.text.muted}
        selectionColor={Colors.brand.purple}
        {...rhfProps}
        {...textInputProps}
      />
      {fieldError ? <Text style={styles.errorText}>{fieldError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  inputError: { borderColor: Colors.error },
  errorText: {
    color: Colors.error,
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.xs - 2,
  },
});
